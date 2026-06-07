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
    if (existingAdmin) {
      console.log('Super admin user already exists');
      process.exit(0);
    }

    const superAdminPassword = 'Admin@1234';
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
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin user:', error);
    process.exit(1);
  }
};

createAdmin();
