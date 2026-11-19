const mongoose = require("mongoose");

const equipmentAddonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["lens", "battery", "storage", "stabilizer", "lighting", "audio", "tripod"],
      required: true,
    },
    compatibleMounts: [
      {
        type: String,
        trim: true,
      },
    ], // e.g. ["Sony E", "Canon RF", "L-mount", "Universal"]
    compatibleBrands: [
      {
        type: String,
        trim: true,
      },
    ], // e.g. ["Sony", "Canon", "Fujifilm", "Universal"]
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    bundleDiscountRate: {
      type: Number,
      default: 0.15, // 15% discount when rented as add-on
      min: 0,
      max: 0.5,
    },
    depositAmount: {
      type: Number,
      default: 0,
    },
    inStock: {
      type: Number,
      default: 5,
    },
    specification: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    recommendedReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EquipmentAddon", equipmentAddonSchema);
