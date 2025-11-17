import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: ''
  },
  nin: {
    type: String,
    required: [true, 'NIN is required'],
    unique: true,
    trim: true
  },
  idType: {
    type: String,
    enum: ['passport', 'national_id', 'drivers_license', 'other'],
    default: 'national_id'
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  postalCode: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  
  // Company/Professional Info
  company: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: ''
  },
  
  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    relationship: {
      type: String,
      default: ''
    }
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
  tags: {
    type: [String],
    default: []
  },
  notes: {
    type: String,
    default: ''
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Agent is required']
  },
  
  // Contact Persons
  contacts: {
    type: [{
      name: String,
      position: {
        type: String,
        default: ''
      },
      email: {
        type: String,
        default: ''
      },
      phone: {
        type: String,
        default: ''
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    default: []
  }
}, {
  timestamps: true
});

export default mongoose.model('Client', clientSchema);