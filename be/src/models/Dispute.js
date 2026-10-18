const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    dispute_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalContract",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    renter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence_urls: {
      type: [String],
      default: [],
    },
    claimed_compensation: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending_review", "investigating", "resolved", "dismissed"],
      default: "pending_review",
      index: true,
    },
    resolution_note: {
      type: String,
      default: "",
    },
    resolved_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "disputes",
  }
);

module.exports = mongoose.model("Dispute", disputeSchema);
