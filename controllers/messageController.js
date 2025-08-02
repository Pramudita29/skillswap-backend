// controllers/messageController.js
const Message = require('../models/Message');
const mongoose = require('mongoose');
const User = require('../models/User');


// POST /api/messages/send
exports.sendMessage = async (req, res) => {
    try {
        const { from, to, text } = req.body;

        // Validate ObjectIDs
        if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(to)) {
            return res.status(400).json({ message: 'Invalid sender or receiver ID' });
        }

        // Validate & sanitize text
        if (typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ message: 'Text must be a non-empty string' });
        }

        // Optional: basic sanitization to avoid NoSQL ops
        if (text.includes('$') || text.includes('{') || text.includes('}')) {
            return res.status(400).json({ message: 'Text contains potentially unsafe characters' });
        }

        const message = new Message({ from, to, text });
        await message.save();

        res.status(201).json({
            message: 'Message sent successfully',
            data: message,
        });
    } catch (err) {
        console.error('Message send error:', err);
        res.status(500).json({ message: 'Failed to send message' });
    }
};


// DELETE /api/messages/:messageId
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        const deletedMessage = await Message.findByIdAndDelete(messageId);

        if (!deletedMessage) {
            return res.status(404).json({ message: 'Message not found' });
        }

        res.json({ message: 'Message deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete message' });
    }
};

// GET /api/messages/active
// Controller to get all registered users
// controllers/messageController.js
exports.getActiveUsers = async (req, res) => {
    try {
        const currentUserId = req.userId;  // Assuming this is coming from a middleware or `req.userId`

        // Fetch all users except the current user
        const users = await User.find({ _id: { $ne: currentUserId } }); // $ne means "not equal"

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No active users found' });
        }

        res.json(users);
    } catch (err) {
        console.error('Error fetching active users:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


// Get messages between user and partner with names populated
exports.getMessages = async (req, res) => {
    try {
        const { userId, partnerId } = req.params;

        if (!userId || !partnerId) {
            return res.status(400).json({ message: 'User ID and Partner ID are required' });
        }

        // Fetch messages between user and partner
        const messages = await Message.find({
            $or: [
                { from: userId, to: partnerId },
                { from: partnerId, to: userId },
            ],
        })
            .sort({ createdAt: 1 })  // Sort by creation time (oldest first)
            .populate('from', 'name avatar')  // Populate sender user details with name and avatar
            .populate('to', 'name avatar');   // Populate receiver user details with name and avatar

        if (!messages || messages.length === 0) {
            return res.status(404).json({ message: 'No messages found' });
        }

        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
