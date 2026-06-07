import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const superAdminUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  role: {
    type: String,
    enum: ['superadmin', 'platform_admin', 'support_admin'],
    default: 'superadmin'
  },
  permissions: [{
    type: String,
    enum: ['tenants_manage', 'users_manage', 'billing_manage', 'security_view', 'audit_view', 'system_config']
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastLoginIp: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdminUser',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

superAdminUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

superAdminUserSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

superAdminUserSchema.index({ email: 1 }, { unique: true });
superAdminUserSchema.index({ role: 1 });

export default mongoose.model('SuperAdminUser', superAdminUserSchema);