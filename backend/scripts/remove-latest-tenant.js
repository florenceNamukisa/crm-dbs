import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const Tenant = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Tenant.js')).href)).default;

  const latest = await Tenant.findOne().sort({ createdAt: -1 }).lean();
  if (!latest) {
    console.log('No tenants found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found latest tenant: ${latest.name} (${latest._id}) — status: ${latest.status}`);
  console.log('Deleting this tenant and all associated data...');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const User = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'User.js')).href)).default;
    const Client = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Client.js')).href)).default;
    const Deal = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Deal.js')).href)).default;
    const Sale = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Sale.js')).href)).default;
    const Meeting = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Meeting.js')).href)).default;
    const Schedule = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Schedule.js')).href)).default;
    const AuditLog = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'AuditLog.js')).href)).default;
    const Notification = (await import(pathToFileURL(path.join(__dirname, '..', 'models', 'Notification.js')).href)).default;

    await Notification.deleteMany({ tenant: latest._id }, { session });
    await Meeting.deleteMany({ tenant: latest._id }, { session });
    await Schedule.deleteMany({ tenant: latest._id }, { session });
    await Deal.deleteMany({ tenant: latest._id }, { session });
    await Sale.deleteMany({ tenant: latest._id }, { session });
    await Client.deleteMany({ tenant: latest._id }, { session });
    await User.deleteMany({ tenant: latest._id }, { session });
    await Tenant.findByIdAndDelete(latest._id, { session });

    await session.commitTransaction();
    console.log('✅ Latest tenant and all associated data deleted successfully.');
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error deleting tenant:', error);
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  void mongoose.disconnect().catch(() => {});
  process.exit(1);
});