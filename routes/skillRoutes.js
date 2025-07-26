const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', skillController.getAll);
router.post('/', requireAuth, skillController.create);
router.delete('/:id', requireAuth, skillController.delete);
router.get('/my-skills', requireAuth, skillController.getUserSkills);

module.exports = router;