const jwt = require('jsonwebtoken');
const Log = require('../models/Log'); // Adjust path as needed

exports.requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    await Log.create({ action: 'Authentication Failed', details: 'Missing token', timestamp: new Date() });
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Log successful authentication
    await Log.create({
      userId: req.userId,
      action: 'Authentication Successful',
      details: `Accessed ${req.originalUrl}`,
      timestamp: new Date()
    });

    next();
  } catch (error) {
    await Log.create({ action: 'Authentication Failed', details: `Invalid token: ${error.message}`, timestamp: new Date() });
    res.status(401).json({ message: 'Invalid token' });
  }
};