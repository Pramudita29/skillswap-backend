const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String,
  skill: String,
  partner: String,
  partnerSkill: String,
  date: Date,
  duration: String,
  userRating: { type: Number, min: 1, max: 5 }, // Rating given by userId (User 1) to partnerId (User 2)
  partnerRating: { type: Number, min: 1, max: 5 }, // Rating given by partnerId (User 2) to userId (User 1)
  progress: Number,
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);