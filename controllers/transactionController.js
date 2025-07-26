const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');

// Fetch transactions by user
exports.getByUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    const transactions = await Transaction.find({ $or: [{ userId: req.userId }, { partnerId: req.userId }] })
      .populate('partnerId', 'username')
      .populate('userId', 'username')
      .sort({ date: -1 });

    // Log transactions with missing partnerId
    const invalidTransactions = transactions.filter(t => !t.partnerId || !t.partnerId._id);
    if (invalidTransactions.length > 0) {
      console.warn("Found transactions with invalid partnerId:", invalidTransactions.map(t => ({
        transactionId: t._id,
        userId: t.userId?._id,
        partnerId: t.partnerId?._id,
      })));
    }

    // Optionally filter out invalid transactions or handle them
    const validTransactions = transactions.filter(t => t.userId?._id && t.partnerId?._id);
    res.json(validTransactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Error fetching transactions', error: err.message });
  }
};

// Create new transaction
exports.create = async (req, res) => {
  console.log("Creating transaction with data:", req.body);
  const data = req.body;
  if (!data.userId || !mongoose.Types.ObjectId.isValid(data.userId)) {
    return res.status(400).json({ message: 'Invalid or missing userId' });
  }
  if (!data.partnerId || !mongoose.Types.ObjectId.isValid(data.partnerId)) {
    return res.status(400).json({ message: 'Invalid or missing partnerId' });
  }
  try {
    const user = await User.findById(data.userId);
    const partner = await User.findById(data.partnerId);
    if (!user || !partner) {
      return res.status(404).json({ message: 'User or partner not found' });
    }
    const transaction = await Transaction.create({
      ...data,
      partner: partner.username || 'Unknown',
      userId: data.userId,
      partnerId: data.partnerId,
    });
    console.log("Created transaction:", transaction);
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ message: 'Error creating transaction', error: err.message });
  }
};

// Update progress of a transaction
exports.updateProgress = async (req, res) => {
  const { transactionId, progress } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ message: 'Invalid transactionId' });
    }
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transaction.progress = Math.min(100, Math.max(0, progress));
    transaction.type = transaction.progress >= 100 ? 'completed' : transaction.progress > 0 ? 'active' : 'pending';

    await transaction.save();
    res.status(200).json(transaction);
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ message: 'Error updating progress', error: err.message });
  }
};

// Update rating of a transaction and user's avgRating
exports.updateRating = async (req, res) => {
  const { userId, transactionId, rating } = req.body;

  try {
    console.log('updateRating called with:', { userId, transactionId, rating });

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ message: 'Invalid transactionId' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Fetch transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('userId', 'username')
      .populate('partnerId', 'username');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!transaction.userId?._id || !transaction.partnerId?._id) {
      console.error('Invalid transaction data:', {
        transactionId: transaction._id,
        userId: transaction.userId?._id,
        partnerId: transaction.partnerId?._id,
      });
      return res.status(400).json({ message: 'Invalid transaction data: missing userId or partnerId' });
    }
    if (transaction.type !== 'completed') {
      return res.status(400).json({ message: 'Transaction must be completed to rate' });
    }

    let updateField, ratedUserId;
    if (userId === transaction.userId._id.toString()) {
      // User 1 rating User 2
      if (transaction.userRating) {
        return res.status(400).json({ message: 'You have already rated this transaction' });
      }
      updateField = { userRating: Math.min(5, Math.max(1, rating)) };
      ratedUserId = transaction.partnerId._id;
    } else if (userId === transaction.partnerId._id.toString()) {
      // User 2 rating User 1
      if (transaction.partnerRating) {
        return res.status(400).json({ message: 'You have already rated this transaction' });
      }
      updateField = { partnerRating: Math.min(5, Math.max(1, rating)) };
      ratedUserId = transaction.userId._id;
    } else {
      return res.status(403).json({ message: 'You are not authorized to rate this transaction' });
    }

    // Update transaction with the appropriate rating
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      updateField,
      { new: true, runValidators: true }
    ).populate('userId', 'username').populate('partnerId', 'username');

    // Update avgRating for the rated user
    const userTransactions = await Transaction.find({
      $or: [{ userId: ratedUserId }, { partnerId: ratedUserId }],
      type: 'completed',
    });
    const ratings = userTransactions
      .map(t => (t.userId.toString() === ratedUserId.toString() ? t.partnerRating : t.userRating))
      .filter(rating => rating != null);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : rating;

    await User.findByIdAndUpdate(ratedUserId, { avgRating }, { new: true });

    res.status(200).json({ transaction: updatedTransaction, avgRating });
  } catch (err) {
    console.error('Error in updateRating:', err);
    res.status(500).json({ message: 'Error updating rating', error: err.message });
  }
};