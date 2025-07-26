const User = require('../models/User');
const Skill = require('../models/Skill');
const Swap = require('../models/SwapRequest');

exports.getStats = async (req, res) => {
  try {
    const [users, skills, swaps] = await Promise.all([
      User.countDocuments(),
      Skill.countDocuments(),
      Swap.countDocuments()
    ]);

    res.json({
      totalUsers: users,
      totalSkills: skills,
      totalSwaps: swaps
    });
  } catch (err) {
    res.status(500).json({ message: 'Stats failed' });
  }
};
