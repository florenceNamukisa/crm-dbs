import mongoose from 'mongoose';
import User from './models/User.js';
import Stock from './models/Stock.js';
import dotenv from 'dotenv';

dotenv.config();

const createDefaultData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default admin
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = await User.create({
        name: 'System Administrator',
        email: 'admin@crm.com',
        password: 'admin123',
        role: 'admin',
        isFirstLogin: false
      });
      console.log('Default admin created: admin@crm.com / admin123');
    }

    // Create sample stock items
    const sampleStockItems = [
      {
        itemName: 'Laptop Computer',
        description: 'High-performance laptop for business use',
        category: 'Electronics',
        unitPrice: 1200.00,
        currentStock: 15,
        minimumStock: 5,
        supplier: 'TechCorp Inc.'
      },
      {
        itemName: 'Office Chair',
        description: 'Ergonomic office chair with lumbar support',
        category: 'Furniture',
        unitPrice: 350.00,
        currentStock: 25,
        minimumStock: 8,
        supplier: 'OfficeFurnish Ltd.'
      },
      {
        itemName: 'Wireless Mouse',
        description: 'Bluetooth wireless mouse with USB receiver',
        category: 'Electronics',
        unitPrice: 25.00,
        currentStock: 50,
        minimumStock: 10,
        supplier: 'TechCorp Inc.'
      },
      {
        itemName: 'Printer Paper (500 sheets)',
        description: 'A4 size printer paper, 80gsm',
        category: 'Office Supplies',
        unitPrice: 8.50,
        currentStock: 100,
        minimumStock: 20,
        supplier: 'PaperWorks Co.'
      },
      {
        itemName: 'Coffee Machine',
        description: 'Automatic coffee maker for office use',
        category: 'Appliances',
        unitPrice: 180.00,
        currentStock: 8,
        minimumStock: 3,
        supplier: 'HomeBrew Ltd.'
      },
      {
        itemName: 'Projector Screen',
        description: '120-inch projection screen with stand',
        category: 'Electronics',
        unitPrice: 450.00,
        currentStock: 6,
        minimumStock: 2,
        supplier: 'AV Solutions Inc.'
      },
      {
        itemName: 'Whiteboard Markers (Pack of 4)',
        description: 'Dry-erase markers in assorted colors',
        category: 'Office Supplies',
        unitPrice: 12.00,
        currentStock: 30,
        minimumStock: 10,
        supplier: 'OfficeMart'
      },
      {
        itemName: 'External Hard Drive 1TB',
        description: 'USB 3.0 external hard drive for data backup',
        category: 'Electronics',
        unitPrice: 85.00,
        currentStock: 20,
        minimumStock: 5,
        supplier: 'TechCorp Inc.'
      }
    ];

    for (const item of sampleStockItems) {
      const existingItem = await Stock.findOne({ itemName: item.itemName });
      if (!existingItem) {
        await Stock.create(item);
        console.log(`Created stock item: ${item.itemName}`);
      }
    }

    console.log('Setup completed successfully!');
    console.log('Sample stock items created for testing sales functionality.');

  } catch (error) {
    console.error('Error setting up data:', error);
  } finally {
    await mongoose.connection.close();
  }
};

createDefaultData();