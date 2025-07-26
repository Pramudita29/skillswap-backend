const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  location: String,
  bio: String,
  avatar: String,
  skillsOffered: [String],
  skillsToLearn: [String],
  completedSwaps: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  firstTimeSetup: { type: Boolean, default: true },
  mfaCode: String,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);