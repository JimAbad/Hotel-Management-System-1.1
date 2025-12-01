const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'password-reset'],
    default: 'signup',
    index: true,
  },
  verified: {
    type: Boolean,
    default: false,
    index: true,
  },
  used: {
    type: Boolean,
    default: false,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// TTL index: when expiresAt is reached, document is removed
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
