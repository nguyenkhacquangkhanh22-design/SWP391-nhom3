const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    request_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
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
    renter_name: {
      type: String,
      required: true,
    },
    renter_phone: {
      type: String,
      default: "",
    },
    renter_email: {
      type: String,
      default: "",
    },
    rental_type: {
      type: String,
      enum: ["daily", "hourly"],
      default: "daily",
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    duration_days: {
      type: Number,
      default: 1,
    },
    duration_hours: {
      type: Number,
      default: 0,
    },
    rental_fee: {
      type: Number,
      required: true,
      min: 0,
    },
    deposit_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    total_estimated_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    renter_note: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "contract_created",
        "active",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    rejection_reason: {
      type: String,
      default: "",
    },
    responded_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "rental_requests",
  }
);

module.exports = mongoose.model("RentalRequest", rentalRequestSchema);
