import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  nin: {
    type: String,
    required: true,
    unique: true
  },
  idType: {
    type: String,
    enum: ['passport', 'national_id', 'drivers_license', 'other'],
    required: true
  },
  idDocument: String, // File path or URL
  
  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  address: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  
  // Company/Professional Info
  company: String,
  position: String,
  industry: String,
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // CRM-Specific Fields
  status: {
    type: String,
    enum: ['prospect', 'active', 'vip', 'inactive'],
    default: 'prospect'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: [String],
  notes: String,
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Contact Persons
  contacts: [{
    name: String,
    position: String,
    email: String,
    phone: String,
    isPrimary: Boolean
  }],
  
  // Interaction Tracking
  lastContact: {
    date: Date,
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'other']
    },
    summary: String
  },
  
  // Documents
  documents: [{
    name: String,
    filePath: String,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    type: String
  }],
  
  // System Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

clientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Client', clientSchema);