const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  location: String,
  bio: String,
  avatar: String,
  skillsOffered: [String],
  skillsToLearn: [String],
  completedSwaps: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  firstTimeSetup: { type: Boolean, default: true },

  // MFA login
  mfaCode: String,
  mfaCodeExpires: Date,

  // Password reset
  passwordResetOtp: String,
  passwordResetOtpExpiry: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
