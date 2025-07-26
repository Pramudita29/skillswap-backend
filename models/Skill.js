const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  avatar: String,         // Pulled from User profile
  name: String,          // Pulled from User profile
  rating: Number,         // Pulled from User profile
  location: String,       // Pulled from User profile
  category: {
    type: [String],
    default: [],
  },
  wantsSkill: {
    type: [String],
    default: [],
  },
  offeredSkill: {
    type: [String],
    default: [],
  },
  description: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);
