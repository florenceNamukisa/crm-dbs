import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function migrateAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-dbs');
    console.log('Connected to MongoDB');

    // Delete old admin with admin@crm.com email
    const oldAdmin = await User.findOneAndDelete({ email: 'admin@crm.com' });
    if (oldAdmin) {
      console.log('✅ Deleted old admin:', oldAdmin.email);
    } else {
      console.log('ℹ️  No old admin found with admin@crm.com');
    }

    // Delete any admin with xtreative@crm.com if it exists
    const existingNewAdmin = await User.findOneAndDelete({ email: 'xtreative@crm.com' });
    if (existingNewAdmin) {
      console.log('✅ Deleted existing xtreative@crm.com admin');
    }

    // Create new admin with xtreative@crm.com
    const newAdmin = await User.create({
      name: 'System Administrator',
      email: 'xtreative@crm.com',
      password: 'admin123',
      role: 'admin',
      isFirstLogin: false
    });
    console.log('✅ Created new admin:', newAdmin.email);
    console.log('   Name:', newAdmin.name);
    console.log('   Role:', newAdmin.role);

    console.log('\n✨ Migration completed successfully!');
    console.log('You can now login with:');
    console.log('   Email: xtreative@crm.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

migrateAdmin();
