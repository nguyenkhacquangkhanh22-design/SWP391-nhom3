const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: "",
    },
    modelNumber: {
      type: String,
      trim: true,
      default: "",
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "APPROVED", "RENTED", "MAINTENANCE", "UNAVAILABLE"],
      default: "APPROVED",
      index: true,
    },
    images: [
      {
        type: String,
      },
    ],
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    location: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "TP. Hồ Chí Minh" },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    condition: {
      type: String,
      enum: ["like-new", "good", "fair"],
      default: "good",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "equipments",
  },
);

equipmentSchema.index({ title: "text", description: "text", brand: "text" });

module.exports = mongoose.model("Equipment", equipmentSchema);
