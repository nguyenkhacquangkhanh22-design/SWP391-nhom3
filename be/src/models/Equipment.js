const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
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
    model_name: {
      type: String,
      default: "",
      trim: true,
    },
    modelNumber: {
      type: String,
      default: "",
      trim: true,
    },
    serial_number: {
      type: String,
      default: "",
      trim: true,
    },
    dailyRate: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricing: {
      price_per_hour: {
        type: Number,
        default: 0,
        min: 0,
      },
      price_per_day: {
        type: Number,
        default: 0,
        min: 0,
      },
      deposit_amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      weekend_rate: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    status: {
      type: String,
      default: "available",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["published", "hidden", "draft"],
      default: "published",
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    accessories: {
      type: [String],
      default: [],
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    condition: {
      type: String,
      default: "good",
    },
    location: {
      address: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "TP. Hồ Chí Minh" },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rental_terms: {
      type: String,
      default: "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn.",
    },
    cancellation_policy: {
      type: String,
      default: "Miễn phí hủy đơn trước 24 giờ. Hủy sau thời gian này phí phạt 20% giá trị hợp đồng.",
    },
    approval_status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejection_reason: {
      type: String,
      default: "",
    },
    moderated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderated_at: {
      type: Date,
    },
    hidden_reason: {
      type: String,
      default: "",
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

equipmentSchema.pre("save", function (next) {
  if (this.owner && !this.owner_id) {
    this.owner_id = this.owner;
  } else if (this.owner_id && !this.owner) {
    this.owner = this.owner_id;
  }

  if (this.dailyRate && (!this.pricing || !this.pricing.price_per_day)) {
    if (!this.pricing) this.pricing = {};
    this.pricing.price_per_day = this.dailyRate;
  } else if (this.pricing?.price_per_day && !this.dailyRate) {
    this.dailyRate = this.pricing.price_per_day;
  }

  if (this.depositAmount && (!this.pricing || !this.pricing.deposit_amount)) {
    if (!this.pricing) this.pricing = {};
    this.pricing.deposit_amount = this.depositAmount;
  } else if (this.pricing?.deposit_amount && !this.depositAmount) {
    this.depositAmount = this.pricing.deposit_amount;
  }

  if (this.modelNumber && !this.model_name) {
    this.model_name = this.modelNumber;
  } else if (this.model_name && !this.modelNumber) {
    this.modelNumber = this.model_name;
  }

  next();
});

equipmentSchema.index({ title: "text", description: "text", brand: "text" });

module.exports = mongoose.model("Equipment", equipmentSchema);
