const mongoose = require("mongoose");

const rentalChecklistItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    handover_checked: {
      type: Boolean,
      default: false,
    },
    return_checked: {
      type: Boolean,
      default: false,
    },
    condition_note: {
      type: String,
      default: "Bình thường",
    },
  },
  { _id: true }
);

const rentalChecklistSchema = new mongoose.Schema(
  {
    rental_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      index: true,
    },
    items: [rentalChecklistItemSchema],
    handover_confirmed_at: {
      type: Date,
    },
    return_confirmed_at: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

rentalChecklistSchema.index({ rental_id: 1, owner_id: 1 });

module.exports = mongoose.model("RentalChecklist", rentalChecklistSchema);
