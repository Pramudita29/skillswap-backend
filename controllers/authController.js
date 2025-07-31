const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/email');

// Generate 6-digit code
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again later.' });
  }
};

// Login Step 1: Validate password, send OTP
exports.loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email not registered' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Incorrect password' });

    const mfaCode = generateOtp();
    user.mfaCode = mfaCode;
    user.mfaCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // <-- Fix here: save as Date object
    await user.save();

    await sendOtpEmail(email, mfaCode);
    console.log(`📩 Sent login OTP to ${email}: ${mfaCode}`);

    res.json({ message: 'OTP sent to your email.', userId: user._id });
  } catch (err) {
    console.error('Login step one error:', err);
    res.status(500).json({ message: 'Login failed. Please try again later.' });
  }
};

// Login Step 2: Verify OTP and issue token
exports.loginStepTwo = async (req, res) => {
  try {
    const { userId, mfaCode } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: 'User not found. Please login again.' });

    if (!user.mfaCode || !user.mfaCodeExpires) {
      return res.status(400).json({ message: 'No OTP code found. Please request a new login.' });
    }

    if (Date.now() > new Date(user.mfaCodeExpires).getTime()) {
      return res.status(400).json({ message: 'OTP expired. Please login again.' });
    }

    if (user.mfaCode.trim() !== mfaCode.trim()) {
      return res.status(400).json({ message: 'Incorrect OTP code.' });
    }

    // Clear OTP fields
    user.mfaCode = null;
    user.mfaCodeExpires = null;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Login step two error:', err);
    res.status(500).json({ message: 'OTP verification failed. Please try again.' });
  }
};

// Update Password (authenticated)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ message: 'Password update failed. Please try again later.' });
  }
};

// Forgot Password (send OTP)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Email not registered' });

    const otp = generateOtp();
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // save as Date object
    await user.save();

    await sendOtpEmail(email, otp);
    console.log(`📩 Sent reset OTP to ${email}: ${otp}`);

    res.json({ message: 'Reset OTP sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Try again later.' });
  }
};

// Reset Password with OTP
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if OTP matches and is not expired
    if (
      user.passwordResetOtp !== otp ||
      !user.passwordResetOtpExpiry ||
      new Date(user.passwordResetOtpExpiry).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear OTP fields after use
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpiry = undefined;

    await user.save();

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
