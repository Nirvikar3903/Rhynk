import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  }, // Unique key, e.g., 'otp_verification'
  name: { 
    type: String, 
    required: true 
  }, // Human readable name, e.g., 'OTP Verification Email'
  subject: { 
    type: String, 
    required: true 
  }, // e.g., 'Verify your Rhynk account • OTP inside 🔐'
  htmlContent: { 
    type: String, 
    required: true 
  }, // HTML markup with placeholders like {{username}}, {{otp}}, {{expiry}}
  textContent: { 
    type: String, 
    required: true 
  }, // Text markup fallback
  isActive: { 
    type: Boolean, 
    default: true 
  }, // Enable/disable templates dynamically
  version: { 
    type: Number, 
    default: 1 
  }, // Keep track of template revisions
  description: { 
    type: String 
  } // Metadata describing the template
}, { timestamps: true });

export const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
