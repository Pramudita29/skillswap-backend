const User = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/users/:userId
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized: Can only access your own profile' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const transactions = await Transaction.find({
      partner: userId,
      rating: { $ne: null },
    });
    const avgRating =
      transactions.length > 0
        ? (
          transactions.reduce((sum, t) => sum + t.rating, 0) /
          transactions.length
        ).toFixed(1)
        : null;
    const completedSwaps = await Transaction.countDocuments({
      partner: userId,
    });
    const isProfileComplete =
      user.name &&
      user.bio &&
      user.location &&
      user.skillsOffered?.length &&
      user.skillsToLearn?.length;
    const userProfile = {
      name: user.name || '',
      email: user.email,
      avatar: user.avatar || '',
      location: user.location || '',
      bio: user.bio || '',
      skillsOffered: user.skillsOffered || [],
      skillsToLearn: user.skillsToLearn || [],
      completedSwaps,
      avgRating: avgRating ? parseFloat(avgRating) : null,
      isProfileComplete,
    };
    res.json(userProfile);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// PUT /api/users/:userId/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized: Can only update your own profile' });
    }
    const allowedUpdates = [
      'name',
      'location',
      'bio',
      'avatar',
      'skillsOffered',
      'skillsToLearn',
    ];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      message: 'Profile updated successfully',
      updatedUser: {
        name: updated.name,
        location: updated.location,
        bio: updated.bio,
        avatar: updated.avatar,
        skillsOffered: updated.skillsOffered,
        skillsToLearn: updated.skillsToLearn,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// DELETE /api/users/:userId
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized: Can only delete your own account' });
    }
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};