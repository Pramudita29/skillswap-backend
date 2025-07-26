const e = require('express').Router();
const c = require('../controllers/transactionController');
const { requireAuth } = require('../middleware/authMiddleware');

// Get transactions by user
e.get('/', requireAuth, c.getByUser);

// Create a new transaction
e.post('/', requireAuth, c.create);

// Update progress of a transaction
e.put('/update-progress', requireAuth, c.updateProgress);

// Update rating of a transaction
e.put('/update-rating', requireAuth, c.updateRating);

module.exports = e;