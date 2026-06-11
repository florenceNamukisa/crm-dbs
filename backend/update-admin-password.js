import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const updateAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const superAdminEmail = 'florencenamukisa08@gmail.com';
    const existingAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingAdmin) {
      console.log('Super admin not found. Creating a new one...');
      const hashedPassword = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'Pretty08@', 12);
      const admin = new User({
        name: 'Super Admin',
        email: superAdminEmail,
        password: hashedPassword,
        role: 'superadmin',
        isActive: true,
        isFirstLogin: false,
        tenant: null,
      });
      await admin.save();
      console.log('Super admin created successfully with the new password');
    } else {
      const hashedPassword = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'Pretty08@', 12);
      await User.findOneAndUpdate(
        { email: superAdminEmail },
        { 
          password: hashedPassword,
          role: 'superadmin',
          isActive: true,
          isFirstLogin: false,
          otp: null,
          otpExpires: null,
          tenant: null,
        }
      );
      console.log('Super admin password updated successfully');
      console.log('isFirstLogin set to false — no set-password form will appear');
    }

    const removed = await User.deleteMany({
      role: 'superadmin',
      email: { $ne: superAdminEmail },
    });
    console.log(`Removed ${removed.deletedCount} extra super admin user(s)`);

    const verify = await User.findOne({ email: superAdminEmail }).select('+password');
    console.log('Verification — Email:', verify.email);
    console.log('Verification — Password is hashed:', Boolean(verify.password && verify.password.startsWith('$2a$')));
    console.log('Verification — Role:', verify.role);
    console.log('Verification — isFirstLogin:', verify.isFirstLogin);

    process.exit(0);
  } catch (error) {
    console.error('Error updating super admin:', error);
    process.exit(1);
  }
};

updateAdminPassword();