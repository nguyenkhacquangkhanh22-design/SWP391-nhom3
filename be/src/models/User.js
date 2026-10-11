const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    User_Id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      default: undefined,
      select: false,
    },
    role: {
      type: String,
      required: true,
      default: "user",
    },
    status: {
      type: String,
      required: true,
      default: "active",
    },
    trust_score: {
      type: Number,
      default: 0,
    },
    google_id: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    token_version: {
      type: Number,
      default: 0,
      select: false,
    },
    password_reset_token_hash: {
      type: String,
      select: false,
    },
    password_reset_expires_at: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
  },
);

module.exports = mongoose.model("User", userSchema);
