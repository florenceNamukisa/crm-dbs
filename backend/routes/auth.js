import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { generateOTP } from '../services/emailService.js';

const router = express.Router();

// @route   POST /api/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If the email exists, a reset OTP has been sent' });
    }

    // Generate OTP and set expiration (15 minutes)
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Use findOneAndUpdate to avoid full document validation
    await User.findOneAndUpdate(
      { email: user.email },
      { otp, otpExpires }
    );

    // Send password reset email
    await sendEmail(
      user.email,
      'passwordReset',
      { name: user.name, otp }
    );

    res.json({ message: 'If the email exists, a reset OTP has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP expired
    if (user.otpExpires && new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update password and clear OTP using findOneAndUpdate to avoid validation issues
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate(
      { email: user.email },
      { password: hashedPassword, otp: null, otpExpires: null }
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId || decoded.id).select('-password').populate('tenant', '_id name settings');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    res.json({ user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: user.tenant ? { id: user.tenant._id, name: user.tenant.name, logo: user.tenantLogo || user.tenant.settings?.logo || null } : null
    }});
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('tenant', '_id name settings');
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: user.tenant ? { id: user.tenant._id, name: user.tenant.name, logo: user.tenantLogo || user.tenant.settings?.logo || null } : null,
      isFirstLogin: Boolean(user.isFirstLogin),
      otp: user.isFirstLogin ? user.otp : undefined,
    };

    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set password using OTP (used on first login or after a reset)
router.post('/set-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid email or OTP' });

    if (!user.otp || user.otp !== String(otp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (user.otpExpires && new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(String(newPassword), 12);
    await User.findOneAndUpdate(
      { email: user.email },
      { password: hashed, otp: null, otpExpires: null, isFirstLogin: false }
    );

    res.json({ message: 'Password set successfully. You can now sign in.' });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password (authenticated user) — requires current password
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.header('Authorization')?.replace('Bearer ', '');
    if (!authHeader) return res.status(401).json({ message: 'Not authenticated' });
    let decoded;
    try { decoded = jwt.verify(authHeader, process.env.JWT_SECRET || 'fallback_secret'); }
    catch { return res.status(401).json({ message: 'Invalid or expired session' }); }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(decoded.userId || decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(String(currentPassword), user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(String(newPassword), 12);
    await User.findByIdAndUpdate(user._id, {
      password: hashed, otp: null, otpExpires: null, isFirstLogin: false,
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router as authRoutes };
