const express = require('express');
const router = express.Router();
const { getUser, updateProfile, deleteAccount } = require('../controllers/userController');
const { updatePassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/:userId', requireAuth, getUser);
router.put('/:userId/profile', requireAuth, updateProfile);
router.delete('/:userId', requireAuth, deleteAccount);
router.post('/update-password', requireAuth, updatePassword);

module.exports = router;