import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@crm.com',
      password: 'admin123',
      role: 'Admin',
      isFirstLogin: false
    });

    console.log('Default admin created:');
    console.log('Email: admin@crm.com');
    console.log('Password: admin123');
    console.log('Please change this password after first login!');

  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await mongoose.connection.close();
  }
};

createDefaultAdmin();