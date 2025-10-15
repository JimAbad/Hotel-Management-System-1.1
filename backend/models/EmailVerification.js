const mongoose = require('mongoose');

const EmailVerificationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    purpose: { type: String, default: 'register' },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailVerification', EmailVerificationSchema);