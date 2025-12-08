// routes/otp.js
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Middleware to get current user
const getCurrentUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

// Generate and send OTP
router.post('/send', getCurrentUser, async (req, res) => {
  try {
    const { email, purpose = 'settings_change' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store OTP
    const key = `${req.user.userId}_${purpose}`;
    otpStore.set(key, {
      otp,
      email,
      expiresAt,
      attempts: 0
    });

    // Send email
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'CRM System - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff8c00;">CRM System Verification</h2>
          <p>You requested to make changes to company settings. Here is your verification code:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #ff8c00; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This code will expire in 10 minutes</li>
            <li>Do not share this code with anyone</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>
          <p>Best regards,<br>CRM System Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    // Clean up expired OTPs
    cleanupExpiredOTPs();

    res.json({
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Verify OTP
router.post('/verify', getCurrentUser, async (req, res) => {
  try {
    const { otp, purpose = 'settings_change' } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const key = `${req.user.userId}_${purpose}`;
    const storedOTP = otpStore.get(key);

    if (!storedOTP) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (storedOTP.attempts >= 3) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (storedOTP.otp !== otp) {
      storedOTP.attempts++;
      otpStore.set(key, storedOTP);
      return res.status(400).json({
        message: 'Invalid OTP',
        attemptsLeft: 3 - storedOTP.attempts
      });
    }

    // OTP is valid
    otpStore.delete(key);

    res.json({
      message: 'OTP verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
});

// Clean up expired OTPs
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
};

// Clean up expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

export { router as otpRoutes };


