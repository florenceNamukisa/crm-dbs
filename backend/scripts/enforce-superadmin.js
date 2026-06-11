import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import SuperAdminUser from '../models/SuperAdminUser.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const SUPER_ADMIN_EMAIL = 'florencenamukisa08@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Pretty08@';
const SUPER_ADMIN_PERMISSIONS = ['tenants_manage', 'users_manage', 'billing_manage', 'security_view', 'audit_view', 'system_config'];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ email: SUPER_ADMIN_EMAIL });
  if (!user) {
    await User.create({
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'superadmin',
      isActive: true,
      isFirstLogin: false,
      tenant: null,
    });
    console.log(`Created super admin user: ${SUPER_ADMIN_EMAIL}`);
  } else {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          name: user.name || 'Super Admin',
          role: 'superadmin',
          isActive: true,
          isFirstLogin: false,
          otp: null,
          otpExpires: null,
          tenant: null,
        },
      }
    );
    console.log(`Enforced super admin user: ${SUPER_ADMIN_EMAIL}`);
  }

  const removedUsers = await User.deleteMany({
    role: 'superadmin',
    email: { $ne: SUPER_ADMIN_EMAIL },
  });

  let platformAdmin = await SuperAdminUser.findOne({ email: SUPER_ADMIN_EMAIL });
  if (!platformAdmin) {
    await SuperAdminUser.create({
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      passwordHash: SUPER_ADMIN_PASSWORD,
      role: 'superadmin',
      status: 'active',
      permissions: SUPER_ADMIN_PERMISSIONS,
    });
    console.log(`Created platform super admin: ${SUPER_ADMIN_EMAIL}`);
  } else {
    await SuperAdminUser.updateOne(
      { _id: platformAdmin._id },
      {
        $set: {
          name: platformAdmin.name || 'Super Admin',
          role: 'superadmin',
          status: 'active',
          permissions: SUPER_ADMIN_PERMISSIONS,
        },
      }
    );
    console.log(`Enforced platform super admin: ${SUPER_ADMIN_EMAIL}`);
  }

  const removedPlatformAdmins = await SuperAdminUser.deleteMany({
    email: { $ne: SUPER_ADMIN_EMAIL },
  });

  console.log(`Removed extra User super admins: ${removedUsers.deletedCount}`);
  console.log(`Removed extra SuperAdminUser super admins: ${removedPlatformAdmins.deletedCount}`);
  console.log(`Only super admin retained: ${SUPER_ADMIN_EMAIL}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Super admin enforcement failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
