import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from './models/User.js';

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const superAdminEmail = 'florencenamukisa08@gmail.com';
    const existingAdmin = await User.findOne({ email: superAdminEmail });
    if (!existingAdmin) {
      const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'Pretty08@';
      const admin = new User({
        name: 'Super Admin',
        email: superAdminEmail,
        password: superAdminPassword,
        role: 'superadmin',
        isActive: true,
        isFirstLogin: false,
        tenant: null,
      });

      await admin.save();
      console.log('Super admin user created successfully');
    } else {
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            role: 'superadmin',
            isActive: true,
            isFirstLogin: false,
            otp: null,
            otpExpires: null,
            tenant: null,
          },
        }
      );
      console.log('Super admin user already exists and was enforced');
    }

    const removed = await User.deleteMany({
      role: 'superadmin',
      email: { $ne: superAdminEmail },
    });
    console.log(`Removed ${removed.deletedCount} extra super admin user(s)`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin user:', error);
    process.exit(1);
  }
};

createAdmin();
