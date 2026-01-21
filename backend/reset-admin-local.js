import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'xtreative@crm.com';
        const password = 'admin123';

        let admin = await User.findOne({ email });

        if (!admin) {
            console.log('Admin not found, creating one...');
            admin = new User({
                name: 'Super Admin',
                email: email,
                role: 'admin',
                isActive: true,
                status: 'offline'
            });
        }

        // Force reset
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        admin.password = hashedPassword;
        admin.isActive = true;
        admin.isFirstLogin = false; // Bypass OTP check
        admin.otp = null;
        admin.otpExpires = null;

        await admin.save();

        console.log('-----------------------------------');
        console.log('✅ Admin Password Reset Successfully');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('-----------------------------------');
        console.log('Try logging in on localhost now.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetAdmin();
