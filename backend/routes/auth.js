import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail, generateOTP } from '../services/emailService.js';
import { forgotPasswordLimiter, authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Login with OTP support
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Prevent deactivated users from logging in
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact your administrator.' });
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

    // Mark user as online
    try {
      user.status = 'online';
      await user.save();
    } catch (err) {
      // Silent fail - status update is not critical
    }

    // Return user data without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      nin: user.nin || null,
      isFirstLogin: user.isFirstLogin,
      isActive: user.isActive,
      status: user.status,
      profileImage: user.profileImage || null,
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const passwordComplexity = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!passwordComplexity.test(newPassword)) {
      return res.status(400).json({ message: 'Password must include uppercase, lowercase, number, and special character' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;

    // Prefer authenticated user when token is present.
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        user = await User.findById(decoded.userId);
      } catch (tokenError) {
        // Fall back to email lookup for backward compatibility.
      }
    }

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (normalizedEmail && user.email !== normalizedEmail) {
      return res.status(403).json({ message: 'You can only change your own password' });
    }

    const wasFirstLogin = user.isFirstLogin;

    // For first login, verify the OTP
    if (wasFirstLogin) {
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
      message: wasFirstLogin ? 'Password set successfully' : 'Password changed successfully',
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

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout: mark user offline (optional)
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(200).json({ message: 'Logged out' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.userId);
    if (user) {
      user.status = 'offline';
      await user.save();
    }

    res.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(200).json({ message: 'Logged out' });
  }
});

// Forgot Password - Initiate reset process
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Find user - SILENT FAILURE if not found to prevent enumeration
    const user = await User.findOne({ email });
    if (!user) {
      // Fake delay to thwart timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    // Generate and save OTP
    const otp = generateOTP();
    user.otp = otp; // Will be hashed implies we should hash it? 
    // Wait, the User model stores otp as String. 
    // Ideally we should hash it, but the existing code "user.otp = null" suggests basic storage.
    // For now, let's store it as is since email is the transport. 
    // NOTE: Production best practice is to hash OTPs in DB. 
    // Given the prompt "secure ... production-ready", I should PROBABLY hash it.
    // But the `User` model shows `otp` field usage in `change-password` (step 190 line 94) uses `bcrypt.compare(currentPassword, user.password)`.
    // Wait, line 94 `bcrypt.compare` is verifying `currentPassword` against `user.password` for first login.
    // Line 31 checks `user.otpExpires`.
    // The current `User.js` schema does NOT hash `otp` automatically. 
    // Let's stick to storing it, but for "production-ready" I'll hash it if I can easily verify it.
    // Actually, `User` model defines `otp` as String.
    // Let's store plain OTP for simplicity consistent with `User` model for now, or hash it manually.
    // If I hash it, I need `bcrypt.hash`.

    // DECISION: Store hashed OTP for security.
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.otp = hashedOtp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Send email with PLAIN OTP
    await sendEmail(email, 'passwordReset', {
      name: user.name,
      otp: otp
    });

    res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP - Step 1 of Reset Password
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Check expiry
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    res.json({ message: 'Code verified successfully' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password - Verify OTP and set new password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Check expiry
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    // Set new password (will be hashed by User model pre-save hook)
    user.password = newPassword;

    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;

    // Mark as not first login
    user.isFirstLogin = false;

    await user.save();

    // Optional: Revoke tokens? JWTs are stateless, can't revoke without blacklist. 
    // We can increment a `tokenVersion` on user if we had one.
    // For now, logging them out by state (optional).

    res.json({ message: 'Password reset successfully. You can now login.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DEBUG: Reset admin password (Development only - remove in production)
router.post('/reset-admin', async (req, res) => {
  try {
    // Find admin user
    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      // Create admin if doesn't exist
      const newAdmin = new User({
        name: 'System Administrator',
        email: 'xtreative@crm.com',
        password: 'admin123',
        role: 'admin',
        isFirstLogin: false,
        isActive: true
      });
      await newAdmin.save();
      return res.json({
        message: 'Admin created successfully',
        email: 'xtreative@crm.com',
        password: 'admin123'
      });
    }

    // Reset admin password to 'admin123'
    admin.password = 'admin123';
    admin.isFirstLogin = false;
    admin.isActive = true;
    admin.otp = null;
    admin.otpExpires = null;
    await admin.save();

    res.json({
      message: 'Admin password reset successfully',
      email: admin.email,
      password: 'admin123',
      note: 'Please change this password after login'
    });
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as authRoutes };
