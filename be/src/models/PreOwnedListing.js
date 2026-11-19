const mongoose = require("mongoose");

/**
 * PreOwnedListing Schema
 * Quản lý danh sách thiết bị máy ảnh/ống kính cũ thanh lý đã qua kiểm định (Certified Pre-Owned)
 */
const preOwnedListingSchema = new mongoose.Schema(
  {
    seller_id: {
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
    category: {
      type: String,
      enum: ["Camera", "Lens", "Lighting", "Audio", "Gimbal", "Accessory"],
      default: "Camera",
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    serial_number: {
      type: String,
      default: "",
    },
    condition_grade: {
      type: String,
      enum: ["like_new_99", "excellent_95", "good_90", "fair_85", "cosmetic_wear_80"],
      default: "excellent_95",
      index: true,
    },
    shutter_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    max_rated_shutter: {
      type: Number,
      default: 200000,
    },
    sensor_condition: {
      type: String,
      enum: ["flawless_clean", "minor_dust", "cleaned_certified", "micro_scratches"],
      default: "flawless_clean",
    },
    lens_optics_condition: {
      type: String,
      enum: ["pristine_no_dust", "minor_internal_dust", "slight_coating_mark", "not_applicable"],
      default: "pristine_no_dust",
    },
    original_price: {
      type: Number,
      default: 0,
    },
    listing_price: {
      type: Number,
      required: true,
      min: 100000,
    },
    smart_equip_warranty_months: {
      type: Number,
      default: 6, // Bảo hành 6 tháng từ SmartEquip
    },
    accessories_included: [
      {
        type: String,
      },
    ],
    inspection_notes: {
      type: String,
      default: "Máy đã qua kiểm định 28 bước tại SmartEquip Lab, hoạt động hoàn hảo 100%.",
    },
    images: [
      {
        type: String,
      },
    ],
    is_certified: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "reserved", "sold", "delisted"],
      default: "available",
      index: true,
    },
    views_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

preOwnedListingSchema.index({ category: 1, condition_grade: 1, listing_price: 1 });

module.exports = mongoose.model("PreOwnedListing", preOwnedListingSchema);
