// controllers/swapRequestController.js
const SwapRequest = require("../models/SwapRequest");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.getByUser = async (req, res) => {
  try {
    // Validate req.userId
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const swaps = await SwapRequest.find({
      $or: [{ fromUserId: req.userId }, { toUserId: req.userId }],
    })
      .populate({
        path: "fromUserId",
        select: "name email",
        match: { _id: { $exists: true } }, // Ensure populated user exists
      })
      .sort({ date: -1 });

    // Filter out swaps with invalid fromUserId
    const validSwaps = swaps.filter((swap) => swap.fromUserId !== null);
    res.json(validSwaps);
  } catch (err) {
    console.error("Error in getByUser:", err);
    res.status(500).json({ error: "Failed to fetch swap requests." });
  }
};

exports.create = async (req, res) => {
  try {
    const { toUserId, skillOffered, skillRequested } = req.body;

    // Validate required fields
    if (!toUserId || !skillOffered || !skillRequested) {
      return res.status(400).json({
        error: "toUserId, skillOffered, and skillRequested are required.",
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ error: "Invalid toUserId format." });
    }
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({ error: "Invalid fromUserId format." });
    }

    // Check if toUserId exists
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ error: "toUserId does not exist." });
    }

    // Check if fromUserId exists (req.userId should come from auth middleware)
    const fromUser = await User.findById(req.userId);
    if (!fromUser) {
      return res.status(404).json({ error: "fromUserId does not exist." });
    }

    const data = {
      fromUserId: req.userId,
      toUserId,
      skillOffered,
      skillRequested,
      date: new Date(),
    };

    const swap = await SwapRequest.create(data);
    res.status(201).json(swap);
  } catch (err) {
    console.error("Error in create:", err);
    res.status(500).json({ error: "Failed to create swap request." });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status value. Use 'pending', 'accepted', or 'rejected'.",
      });
    }

    // Validate swap request ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid swap request ID." });
    }

    const swap = await SwapRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!swap) {
      return res.status(404).json({ error: "Swap request not found." });
    }

    res.json(swap);
  } catch (err) {
    console.error("Error in updateStatus:", err);
    res.status(500).json({ error: "Failed to update swap request." });
  }
};