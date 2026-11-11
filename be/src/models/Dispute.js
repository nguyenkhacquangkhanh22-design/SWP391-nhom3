const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    dispute_code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    rentalOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      index: true,
    },
    rental_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      index: true,
    },
    contract_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalContract",
      required: false,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    renter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    damageLevel: {
      type: String,
      enum: ["MINOR", "SEVERE", "TOTAL_LOSS"],
      default: "MINOR",
    },
    damage_level: {
      type: String,
      enum: ["MINOR", "SEVERE", "TOTAL_LOSS"],
      default: "MINOR",
    },
    title: {
      type: String,
      default: "Khiếu nại hư hỏng thiết bị",
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    evidenceImages: {
      type: [String],
      default: [],
    },
    evidence_urls: {
      type: [String],
      default: [],
    },
    claimedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    claimed_compensation: {
      type: Number,
      default: 0,
      min: 0,
    },
    compensation_approved: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "PENDING_ADMIN_REVIEW",
        "pending_review",
        "investigating",
        "RESOLVED_REFUND_OWNER",
        "resolved",
        "REJECTED",
        "dismissed",
      ],
      default: "PENDING_ADMIN_REVIEW",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
    },
    resolution_note: {
      type: String,
      default: "",
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Đồng bộ giữa các trường camelCase và snake_case
disputeSchema.pre("save", function (next) {
  if (this.rentalOrderId && !this.rental_id) this.rental_id = this.rentalOrderId;
  if (this.rental_id && !this.rentalOrderId) this.rentalOrderId = this.rental_id;

  if (this.ownerId && !this.owner_id) this.owner_id = this.ownerId;
  if (this.owner_id && !this.ownerId) this.ownerId = this.owner_id;

  if (this.renterId && !this.renter_id) this.renter_id = this.renterId;
  if (this.renter_id && !this.renterId) this.renterId = this.renter_id;

  if (this.damageLevel && !this.damage_level) this.damage_level = this.damageLevel;
  if (this.damage_level && !this.damageLevel) this.damageLevel = this.damage_level;

  if (this.evidenceImages && this.evidenceImages.length > 0 && (!this.evidence_urls || this.evidence_urls.length === 0)) {
    this.evidence_urls = this.evidenceImages;
  } else if (this.evidence_urls && this.evidence_urls.length > 0 && (!this.evidenceImages || this.evidenceImages.length === 0)) {
    this.evidenceImages = this.evidence_urls;
  }

  if (this.claimedAmount !== undefined && this.claimed_compensation === 0) {
    this.claimed_compensation = this.claimedAmount;
  } else if (this.claimed_compensation !== undefined && this.claimedAmount === 0) {
    this.claimedAmount = this.claimed_compensation;
  }

  if (this.adminNote && !this.resolution_note) this.resolution_note = this.adminNote;
  if (this.resolution_note && !this.adminNote) this.adminNote = this.resolution_note;

  next();
});

module.exports = mongoose.model("Dispute", disputeSchema);
