// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, deleteMessage, getActiveUsers } = require('../controllers/messageController');

// Fetch messages between user and partner
router.get('/:userId/:partnerId', getMessages);

// Send a message
router.post('/send', sendMessage);

// Delete a message
router.delete('/:messageId', deleteMessage);

// Get list of active users
router.get('/active', getActiveUsers);  // <-- New Route

module.exports = router;
