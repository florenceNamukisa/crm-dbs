import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Login with OTP support
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password/OTP
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if OTP has expired (for first login)
    if (user.isFirstLogin && user.otpExpires && new Date() > user.otpExpires) {
      return res.status(400).json({ 
        message: 'OTP has expired. Please request a new one from your administrator.' 
      });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    // Return user data without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isFirstLogin: user.isFirstLogin,
      performanceScore: user.performanceScore,
      totalDeals: user.totalDeals,
      successfulDeals: user.successfulDeals,
      failedDeals: user.failedDeals,
      createdAt: user.createdAt
    };

    res.json({
      token,
      user: userResponse,
      requiresPasswordChange: user.isFirstLogin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password (for first login and regular password changes)
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // For first login, verify the OTP
    if (user.isFirstLogin) {
      const isOTPMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isOTPMatch) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      // Check if OTP expired
      if (user.otpExpires && new Date() > user.otpExpires) {
        return res.status(400).json({ 
          message: 'OTP has expired. Please request a new one from your administrator.' 
        });
      }
    } else {
      // For regular password change, verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // Update password and clear OTP fields
    user.password = newPassword;
    user.isFirstLogin = false;
    user.otp = null;
    user.otpExpires = null;
    
    await user.save();

    res.json({ 
      message: user.isFirstLogin ? 'Password set successfully' : 'Password changed successfully',
      requiresPasswordChange: false
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export { router as authRoutes };