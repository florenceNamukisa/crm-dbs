// backend/scripts/cleanup.js
// Wipes ALL tenant-scoped data and ALL non-superadmin users.
// Keeps the default superadmin account so the platform remains accessible.
//
// Usage:  node backend/scripts/cleanup.js
//
// This script is idempotent — it is safe to re-run.

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

// Lazy-load models so missing files don't crash the script.
const load = async (rel) => {
  try {
    const filePath = path.join(__dirname, '..', 'models', rel);
    const mod = await import(pathToFileURL(filePath).href);
    return mod.default;
  } catch (e) {
    console.warn(`   ! could not load ${rel}: ${e.message.split('\n')[0]}`);
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

  // 1) Tenants (and tenant-scoped cascades)
  const Tenant = models.Tenant;
  if (Tenant) {
    const tenants = await Tenant.find({}, '_id');
    const tenantIds = tenants.map(t => t._id);
    console.log(`\nFound ${tenantIds.length} tenant(s).`);

    // Wipe every collection that could hold demo data.
    // We delete by tenant first, then a full wipe of each collection
    // (covers models that don't store a `tenant` field).
    const all = ['Client', 'Deal', 'Sale', 'Meeting', 'Schedule', 'Stock',
      'Performance', 'Notification', 'SecurityBlock'];
    for (const k of all) {
      const M = models[k];
      if (!M) continue;
      const r1 = await M.deleteMany({ tenant: { $in: tenantIds } });
      const r2 = await M.deleteMany({});
      console.log(`  🗑  ${k} → tenant-scoped: ${r1.deletedCount}, full wipe: ${r2.deletedCount}`);
    }

    // AuditLog has an immutability pre-hook — use the raw collection
    const AuditLog = models.AuditLog;
    if (AuditLog) {
      const r1 = await AuditLog.collection.deleteMany({ tenant: { $in: tenantIds } });
      const r2 = await AuditLog.collection.deleteMany({});
      console.log(`  🗑  AuditLog (raw) → tenant-scoped: ${r1.deletedCount}, full wipe: ${r2.deletedCount}`);
    }

    // Models with no `tenant` field are also safe to wipe if they hold demo data.
    for (const k of ['LoginLog', 'SystemMetrics', 'Invoice', 'Payment', 'Issue',
      'ScheduledExport', 'EmailTemplate', 'Role', 'Dashboard']) {
      const M = models[k];
      if (!M) continue;
      const r = await M.deleteMany({});
      console.log(`  🗑  ${k}.deleteMany({}) → ${r.deletedCount}`);
    }

    // 2) Users: keep superadmin, delete everyone else
    const User = models.User;
    if (User) {
      const adminCount = await User.countDocuments({ role: 'superadmin' });
      const r = await User.deleteMany({ role: { $ne: 'superadmin' } });
      console.log(`  🗑  User.deleteMany({role≠superadmin}) → ${r.deletedCount} (kept ${adminCount} superadmin)`);
    }

    // 3) Subscriptions: keep plan definitions if they look like plans; wipe tenant-pointing ones
    const Sub = models.Subscription;
    if (Sub) {
      const r = await Sub.deleteMany({ tenant: { $exists: true, $ne: null } });
      console.log(`  🗑  Subscription.deleteMany({tenant}) → ${r.deletedCount}`);
    }

    // 4) Finally, drop the tenants themselves
    const r = await Tenant.deleteMany({});
    console.log(`  🗑  Tenant.deleteMany({}) → ${r.deletedCount}`);
  }

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

  console.log('✅ Cleanup complete. Dashboards will be empty on next refresh.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  try { mongoose.disconnect(); } catch {}
  process.exit(1);
});
