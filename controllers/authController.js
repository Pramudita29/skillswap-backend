const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/email');

const generateMfaCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ message: 'User registered', userId: user._id });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(400).json({ message: 'Registration failed', error: err.message });
  }
};

// Login Step One
exports.loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const mfaCode = generateMfaCode();
    user.mfaCode = mfaCode;
    user.mfaCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendOtpEmail(email, mfaCode);
    console.log(`📩 Sent test OTP to ${email}: ${mfaCode}`);
    res.json({
      message: 'Password correct. OTP sent to your test email.',
      userId: user._id,
    });
  } catch (err) {
    console.error('Login Step One error:', err.message);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// Login Step Two
exports.loginStepTwo = async (req, res) => {
  try {
    const { userId, mfaCode } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found with ID: ${userId}`);
      return res.status(400).json({ message: 'User not found' });
    }
    if (!user.mfaCode || user.mfaCode.trim() !== mfaCode.trim() || user.mfaCodeExpires < Date.now()) {
      console.log('MFA code invalid or expired');
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    user.mfaCode = null;
    user.mfaCodeExpires = null;
    await user.save();
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Login Step Two error:', err.message);
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    res.status(500).json({ message: 'Password update failed', error: err.message });
  }
};