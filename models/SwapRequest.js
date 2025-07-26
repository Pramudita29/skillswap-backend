const mongoose = require('mongoose');
const swapRequestSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  skillOffered: String,
  skillRequested: String,
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  date: Date
}, { timestamps: true });
module.exports = mongoose.model('SwapRequest', swapRequestSchema);
