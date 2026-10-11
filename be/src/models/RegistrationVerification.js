const mongoose = require("mongoose");

const registrationVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    otp_hash: {
      type: String,
      select: false,
    },
    otp_expires_at: Date,
    attempts: {
      type: Number,
      default: 0,
    },
    last_sent_at: Date,
    verified_ticket_hash: {
      type: String,
      select: false,
    },
    ticket_expires_at: Date,
    expires_at: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { collection: "registration_verifications" },
);

module.exports = mongoose.model(
  "RegistrationVerification",
  registrationVerificationSchema,
);
