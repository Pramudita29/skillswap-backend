const Skill = require('../models/Skill');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getAll = async (req, res) => {
  try {
    const skills = await Skill.find({}).sort({ createdAt: -1 });
    console.log('[getAll] Fetched skills:', skills.length, 'for userId:', req.userId || 'unauthenticated');
    res.json(skills);
  } catch (err) {
    console.error('[getAll] Error:', err.message);
    res.status(500).json({ error: 'Error fetching skills' });
  }
};

exports.create = async (req, res) => {
  const { title, category, description, wantsSkill, offeredSkill } = req.body;

  if (!title || !description || !offeredSkill || !Array.isArray(offeredSkill) || offeredSkill.length === 0) {
    console.log('[create] Validation failed:', { title, description, offeredSkill });
    return res.status(400).json({ error: 'Title, description, and offeredSkill are required' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      console.log('[create] User not found for userId:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate offeredSkill against User.skillsOffered
    const invalidSkills = offeredSkill.filter(skill => !user.skillsOffered.includes(skill));
    if (invalidSkills.length > 0) {
      console.log('[create] Invalid offered skills:', invalidSkills);
      return res.status(400).json({ error: `Offered skills not found in your profile: ${invalidSkills.join(', ')}` });
    }

    const skillData = {
      title,
      category: Array.isArray(category) ? category : [],
      offeredSkill: Array.isArray(offeredSkill) ? offeredSkill : [],
      wantsSkill: Array.isArray(wantsSkill) ? wantsSkill : [],
      description,
      avatar: user.avatar || '',
      rating: user.avgRating || 0,
      location: user.location || '',
      name: user.name || '',
      userId: user._id,
    };

    console.log('[create] Creating skill for userId:', req.userId, 'with data:', skillData);
    const skill = await Skill.create(skillData);
    res.status(201).json(skill);
  } catch (err) {
    console.error('[create] Error:', err.message);
    res.status(500).json({ error: 'Failed to create skill' });
  }
};

exports.delete = async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('[delete] Invalid skill ID:', req.params.id);
      return res.status(400).json({ error: 'Invalid skill ID' });
    }

    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      console.log('[delete] Skill not found for id:', req.params.id);
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (skill.userId.toString() !== req.userId) {
      console.log('[delete] Unauthorized attempt by userId:', req.userId, 'for skill userId:', skill.userId);
      return res.status(403).json({ error: 'Unauthorized to delete this skill' });
    }

    await Skill.findByIdAndDelete(req.params.id);
    console.log('[delete] Skill deleted:', req.params.id);
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    console.error('[delete] Error:', {
      message: err.message,
      stack: err.stack,
      id: req.params.id,
    });
    res.status(500).json({ error: `Failed to delete skill: ${err.message}` });
  }
};

exports.getUserSkills = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('skillsOffered');
    if (!user) {
      console.log('[getUserSkills] User not found for userId:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('[getUserSkills] Fetched skillsOffered:', user.skillsOffered, 'for userId:', req.userId);
    res.json(user.skillsOffered.map((title, index) => ({ id: `${req.userId}-${index}`, title })));
  } catch (err) {
    console.error('[getUserSkills] Error:', err.message);
    res.status(500).json({ error: 'Error fetching user skills' });
  }
};