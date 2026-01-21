import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const resetAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db');
        console.log('Connected to MongoDB');

        const email = 'xtreative@crm.com';
        const password = 'admin123';

        let user = await User.findOne({ email });

        if (!user) {
            console.log('Admin user not found. Creating new one...');
            user = new User({
                name: 'System Administrator',
                email,
                password,
                role: 'admin',
                isFirstLogin: false,
                isActive: true,
                status: 'offline'
            });
        } else {
            console.log('Admin user found. Updating password...');
            user.password = password;
            user.isActive = true;
            user.isFirstLogin = false;
            // Mark unmodified to trigger save if only password changed, 
            // but actually modifying password property marks it modified.
        }

        await user.save();
        console.log('------------------------------------------------');
        console.log(`SUCCESS! Admin user updated.`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('------------------------------------------------');

        // Verify hash matches immediately
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Self-Verification (Hash comparison):', isMatch ? 'PASSED' : 'FAILED');

    } catch (error) {
        console.error('Error during admin reset:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

resetAdmin();
