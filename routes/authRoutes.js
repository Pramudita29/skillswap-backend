const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginStepOne,
  loginStepTwo,
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginStepOne);
router.post('/mfa', loginStepTwo);

module.exports = router;