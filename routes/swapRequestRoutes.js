const e = require('express').Router();
const c = require('../controllers/swapRequestController');
const { requireAuth } = require('../middleware/authMiddleware');

// Get all swap requests involving the user
e.get('/', requireAuth, c.getByUser);

// Create a new swap request
e.post('/', requireAuth, c.create);

// Update the status of a swap request (e.g., accept/reject)
e.put('/:id', requireAuth, c.updateStatus);

module.exports = e;
