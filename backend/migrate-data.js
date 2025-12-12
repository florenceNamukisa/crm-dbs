import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Source: Local MongoDB
const SOURCE_URI = 'mongodb://localhost:27017/crm_db';

// Target: MongoDB Atlas - Use hardcoded value
const TARGET_URI = 'mongodb+srv://florence:Florah@cse-js-4-cluster.mdufr.mongodb.net/crm_db?retryWrites=true&w=majority';

console.log('📋 Using:');
console.log('Source:', SOURCE_URI);
console.log('Target:', TARGET_URI.replace(/\/\/.+:.*@/, '//***:***@'));

// Collections to migrate
const collections = [
  'users',
  'clients',
  'deals',
  'sales',
  'schedules',
  'performances',
  'stocks',
  'meetings',
  'notifications'
];

async function migrateData() {
  let sourceConnection;
  let targetConnection;

  try {
    console.log('\n🔄 Starting data migration...');

    // Connect to source database
    console.log('\n📡 Connecting to source (local MongoDB)...');
    sourceConnection = await mongoose.createConnection(SOURCE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to source database');

    // Connect to target database
    console.log('\n📡 Connecting to target (MongoDB Atlas)...');
    targetConnection = await mongoose.createConnection(TARGET_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to target database');

    // Migrate each collection
    console.log('\n📦 Starting collection migration...\n');
    
    for (const collectionName of collections) {
      try {
        // Get source db and collection
        const sourceDb = sourceConnection.getClient().db('crm_db');
        const sourceCollection = sourceDb.collection(collectionName);
        const sourceData = await sourceCollection.find({}).toArray();
        
        if (sourceData.length === 0) {
          console.log(`⏭️  ${collectionName}: No data to migrate`);
          continue;
        }

        // Get target db and collection
        const targetDb = targetConnection.getClient().db('crm_db');
        const targetCollection = targetDb.collection(collectionName);
        
        // Clear target collection first
        await targetCollection.deleteMany({});
        
        // Insert data to target
        const result = await targetCollection.insertMany(sourceData);
        console.log(`✅ ${collectionName}: Migrated ${result.insertedIds.length} records`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⏭️  ${collectionName}: Collection does not exist (skipped)`);
        } else {
          console.error(`❌ ${collectionName}: Error - ${error.message}`);
        }
      }
    }

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    if (sourceConnection) await sourceConnection.close();
    if (targetConnection) await targetConnection.close();
    process.exit(0);
  }
}

migrateData();
