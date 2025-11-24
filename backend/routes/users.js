import express from 'express';
import User from '../models/User.js';
import { sendEmail, generateOTP } from '../services/emailService.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password -otp');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new agent with OTP (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, role = 'agent', nin = null } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate OTP (6-digit code)
    const otp = generateOTP();
    console.log(`🔐 Creating user with OTP: ${otp}`);
    
    // Create user with OTP as temporary password
    const user = new User({
      name,
      email,
      phone,
      nin,
      password: otp, // OTP is the initial password
      role,
      isFirstLogin: true,
      otp: otp,
      otpExpires: new Date(Date.now() + 12 * 60 * 60 * 1000) // OTP expires in 12 hours
    });

    await user.save();
    console.log(`✅ User created: ${email}`);

    // Send welcome email with OTP
    console.log(`📧 Sending welcome email to: ${email}`);
    const emailResult = await sendEmail(
      email,
      'agentWelcome',
      { name, email, otp }
    );

    // Return user data without sensitive information
    const userResponse = await User.findById(user._id).select('-password -otp');

    if (emailResult.success) {
      console.log(`🎉 Email sent successfully to ${email}`);
      res.status(201).json({ 
        message: 'User created successfully and welcome email sent',
        user: userResponse,
        emailSent: true
      });
    } else {
      console.log(`⚠️ User created but email failed: ${emailResult.error}`);
      res.status(201).json({ 
        message: 'User created but failed to send welcome email',
        user: userResponse,
        emailSent: false,
        otp: otp, // Include OTP so admin can share manually
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('❌ Error creating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend OTP
router.post('/:id/resend-otp', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new OTP
    const newOTP = generateOTP();
    
    // Update user with new OTP
    user.password = newOTP;
    user.otp = newOTP;
    user.otpExpires = new Date(Date.now() + 12 * 60 * 60 * 1000);
    user.isFirstLogin = true;
    
    await user.save();

    // Send email with new OTP
    const emailResult = await sendEmail(
      user.email,
      'agentWelcome',
      { name: user.name, email: user.email, otp: newOTP }
    );

    res.json({ 
      message: 'OTP resent successfully',
      emailSent: emailResult.success,
      otp: newOTP // For admin reference
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, profileImage, nin, isActive, status } = req.body;

    const update = { name, phone, profileImage };
    if (typeof nin !== 'undefined') update.nin = nin;
    if (typeof isActive !== 'undefined') {
      update.isActive = isActive;
      // if admin deactivates the account, ensure status becomes offline immediately
      if (isActive === false) update.status = 'offline';
    }
    if (typeof status !== 'undefined') update.status = status;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password -otp');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as userRoutes };