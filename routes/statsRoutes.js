const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const statsController = require('../controllers/statsController');

router.get('/', requireAuth, statsController.getStats);

module.exports = router;
