// backend/scripts/cleanup-keep-users.js
// Removes all tenant-scoped data (clients, deals, sales, meetings, schedules, etc.)
// but preserves ALL user accounts.
//
// Usage:  node backend/scripts/cleanup-keep-users.js
// This script is idempotent — safe to re-run.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

const load = async (rel) => {
  try {
    const filePath = path.join(__dirname, '..', 'models', rel);
    const mod = await import(pathToFileURL(filePath).href);
    return mod.default;
  } catch (_e) {
    console.warn(`   ! could not load ${rel}: ${_e.message.split('\n')[0]}`);
    return null;
  }
};

const models = {};
const want = [
  'Tenant.js', 'User.js', 'Client.js', 'Deal.js', 'Sale.js',
  'Meeting.js', 'Schedule.js', 'Stock.js', 'Performance.js',
  'Notification.js', 'AuditLog.js', 'LoginLog.js', 'SecurityBlock.js',
  'Subscription.js', 'Invoice.js', 'Payment.js', 'Issue.js',
  'SystemMetrics.js', 'ScheduledExport.js', 'EmailTemplate.js',
  'Role.js', 'Dashboard.js'
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  for (const m of want) {
    models[m.replace('.js', '')] = await load(m);
  }

  const present = (k) => models[k] ? `✔ ${k}` : `· ${k} (skipped)`;
  console.log('\nModels available:');
  for (const m of want) console.log('  ' + present(m.replace('.js', '')));

  const tenants = await models.Tenant.find({}, '_id');
  const tenantIds = tenants.map(t => t._id);
  console.log(`\nFound ${tenantIds.length} tenant(s).`);

  // Delete data collections but preserve Users
  const dataCollections = ['Client', 'Deal', 'Sale', 'Meeting', 'Schedule', 'Stock',
    'Performance', 'Notification', 'SecurityBlock'];
  for (const k of dataCollections) {
    const M = models[k];
    if (!M) continue;
    const r1 = await M.deleteMany({ tenant: { $in: tenantIds } });
    const r2 = await M.deleteMany({});
    console.log(`  🗑  ${k} → tenant-scoped: ${r1.deletedCount}, full wipe: ${r2.deletedCount}`);
  }
  // Non-tenant data collections
  for (const k of ['LoginLog', 'SystemMetrics', 'Invoice', 'Payment', 'Issue',
    'ScheduledExport', 'EmailTemplate', 'Role', 'Dashboard']) {
    const M = models[k];
    if (!M) continue;
    const r = await M.deleteMany({});
    console.log(`  🗑  ${k}.deleteMany({}) → ${r.deletedCount}`);
  }

  // Preserve all Users — show count for verification
  const User = models.User;
  if (User) {
    const userCount = await User.countDocuments({});
    console.log(`  ✔  Users preserved: ${userCount}`);
  }

  const Sub = models.Subscription;
  if (Sub) {
    const r = await Sub.deleteMany({ tenant: { $exists: true, $ne: null } });
    console.log(`  🗑  Subscription.deleteMany({tenant}) → ${r.deletedCount}`);
  }

  // Optionally keep tenants (remove if truly empty)
  // const r = await models.Tenant.deleteMany({});
  // console.log(`  🗑  Tenant.deleteMany({}) → ${r.deletedCount}`);

  // Summary
  console.log('\n──────────────────────────────────────────');
  const counts = {};
  for (const m of want) {
    const k = m.replace('.js', '');
    const M = models[k];
    if (!M) continue;
    counts[k] = await M.countDocuments({});
  }
  console.log('Remaining document counts:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log('──────────────────────────────────────────\n');

  console.log('✅ Cleanup complete. All users preserved, data cleared.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.log('❌ Cleanup failed:', err);
  void mongoose.disconnect().catch(() => {});
  process.exit(1);
});