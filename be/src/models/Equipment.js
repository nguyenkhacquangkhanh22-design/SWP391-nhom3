const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    owner_id: {
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
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    model_name: {
      type: String,
      default: "",
      trim: true,
    },
    serial_number: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    images: {
      type: [String],
      default: [],
    },
    accessories: {
      type: [String],
      default: [],
    },
    condition: {
      type: String,
      default: "Tốt (95%)",
    },
    pricing: {
      price_per_hour: {
        type: Number,
        default: 0,
        min: 0,
      },
      price_per_day: {
        type: Number,
        required: true,
        min: 0,
      },
      deposit_amount: {
        type: Number,
        required: true,
        min: 0,
      },
      weekend_rate: {
        type: Number,
        default: 0,
      },
    },
    rental_terms: {
      type: String,
      default: "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn.",
    },
    cancellation_policy: {
      type: String,
      default: "Miễn phí hủy đơn trước 24 giờ. Hủy sau thời gian này phí phạt 20% giá trị hợp đồng.",
    },
    visibility: {
      type: String,
      enum: ["published", "hidden", "draft"],
      default: "published",
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance", "reserved", "damaged", "retired", "hidden"],
      default: "available",
      index: true,
    },
    availability_schedule: [
      {
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        status: {
          type: String,
          enum: ["available", "blocked", "booked"],
          default: "available",
        },
        note: { type: String, default: "" },
      },
    ],
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    review_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "equipments",
  }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
