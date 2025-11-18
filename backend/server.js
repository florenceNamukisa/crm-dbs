import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes imports
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { clientRoutes } from './routes/clients.js';
import { dealRoutes } from './routes/deals.js';
import { scheduleRoutes } from './routes/schedules.js';
import { performanceRoutes } from './routes/performance.js';
import { salesRoutes } from './routes/sales.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pug configuration
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/sales', salesRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Home route
app.get('/', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Create default admin on startup
const createDefaultAdmin = async () => {
  const User = await import('./models/User.js');
  try {
    const adminExists = await User.default.findOne({ role: 'admin' });
    
    if (!adminExists) {
      await User.default.create({
        name: 'System Administrator',
        email: 'admin@crm.com',
        password: 'admin123',
        role: 'admin',
        isFirstLogin: false
      });
      console.log('Default admin user created: admin@crm.com / admin123');
    }

    // Create demo agent if doesn't exist
    const agentExists = await User.default.findOne({ email: 'agent@crm.com' });
    if (!agentExists) {
      await User.default.create({
        name: 'Demo Agent',
        email: 'agent@crm.com',
        password: 'agent123',
        role: 'agent',
        isFirstLogin: false
      });
      console.log('Demo agent created: agent@crm.com / agent123');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Login URL: http://localhost:${PORT}`);
  await createDefaultAdmin();
});