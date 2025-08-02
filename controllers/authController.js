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

    // Password complexity regex:
    // Minimum 8 characters, at least one uppercase, one lowercase, one number, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character'
      });
    }

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


const LOCK_TIME = 10 * 60 * 1000; // 10 minutes
const MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_EXPIRY_DAYS = 90;

exports.loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'Email not registered' });

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const waitSeconds = Math.ceil((user.lockUntil - Date.now()) / 1000);
      return res.status(429).json({
        message: `Account locked due to multiple failed attempts. Try again in ${waitSeconds} seconds.`,
        lockTimeRemaining: waitSeconds,
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
      }
      await user.save();
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Password matched — check expiry
    const passwordAgeDays = Math.floor(
      (Date.now() - new Date(user.passwordChangedAt || user.createdAt)) / (1000 * 60 * 60 * 24)
    );

    if (passwordAgeDays >= PASSWORD_EXPIRY_DAYS) {
      return res.status(403).json({ message: 'Your password has expired. Please reset it.' });
    }

    //Login success, reset counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // Generate and store OTP for MFA
    const mfaCode = generateOtp();
    user.mfaCode = mfaCode;
    user.mfaCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(email, mfaCode);
    console.log(`Sent login OTP to ${email}: ${mfaCode}`);

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

    // Check for reuse
    const reused = await Promise.any(
      (user.passwordHistory || []).map(old => bcrypt.compare(newPassword, old))
    ).catch(() => false);

    if (reused) {
      return res.status(400).json({ message: 'New password must not match any previously used passwords.' });
    }

    // Update password history
    user.passwordHistory = (user.passwordHistory || []);
    user.passwordHistory.push(user.password); // Store current password

    // Keep last 5
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();

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
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (
      user.passwordResetOtp !== otp ||
      !user.passwordResetOtpExpiry ||
      new Date(user.passwordResetOtpExpiry).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Check for reuse
    const reused = await Promise.any(
      (user.passwordHistory || []).map(old => bcrypt.compare(newPassword, old))
    ).catch(() => false);

    if (reused) {
      return res.status(400).json({ message: 'New password must not match any previously used passwords.' });
    }

    // Update history
    user.passwordHistory = (user.passwordHistory || []);
    user.passwordHistory.push(user.password);
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();

    // Clear OTP fields
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpiry = undefined;

    await user.save();

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};