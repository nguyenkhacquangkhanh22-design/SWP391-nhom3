const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    rentalCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rentalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "CONTRACT_PENDING",
        "CONTRACT_SIGNED",
        "PAYMENT_PENDING",
        "PAYMENT_VERIFYING",
        "PAYMENT_REJECTED",
        "PAID",
        "CONFIRMED",
        "ACTIVE",
        "IN_PROGRESS",
        "RETURN_REQUESTED",
        "RETURN_PENDING",
        "RETURNED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
        "PENDING_MODERATOR",
        "MODERATOR_REJECTED",
        "MODERATOR_APPROVED",
        // Hỗ trợ thêm cho tương thích ngược chữ thường
        "pending",
        "approved",
        "contract_pending",
        "contract_signed",
        "payment_pending",
        "payment_verifying",
        "payment_rejected",
        "paid",
        "confirmed",
        "active",
        "in_progress",
        "return_requested",
        "return_pending",
        "returned",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "PENDING",
      index: true,
    },
        deliveryAddress: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryTime: {
      type: String,
      default: "09:00",
    },
    returnTime: {
      type: String,
      default: "17:00",
    },
    deliveryMethod: {
      type: String,
      default: "motorcycle",
    },
    returnMethod: {
      type: String,
      default: "motorcycle",
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    hasInsurance: {
      type: Boolean,
      default: false,
    },
    insuranceFee: {
      type: Number,
      default: 0,
    },
    renterNote: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    contract: {
      contractNumber: { type: String, trim: true },
      termsAccepted: { type: Boolean, default: false },
      contractTerms: { type: String, trim: true },
      signedAt: { type: Date },
      renterSignature: { type: String, trim: true },
      digitalSignature: { type: String, trim: true },
      contractUrl: { type: String, trim: true },
      agreedToSign: { type: Boolean, default: false },
      agreedAt: { type: Date },
      moderatorApproved: { type: Boolean, default: false },
      moderatorStatus: {
        type: String,
        enum: [
          "none",
          "draft",
          "pending_renter_signature",
          "approved",
          "confirmed",
          "sent_to_renter",
          "renter_rejected",
          "pending_approval",
          "moderator_rejected",
          "moderator_approved",
          "signed",
        ],
        default: "none",
      },
      ownerSigned: { type: Boolean, default: false },
      ownerSignature: { type: String, trim: true },
      ownerSignerName: { type: String, trim: true },
      ownerSignedAt: { type: Date },
      ownerCertificateCode: { type: String, trim: true },
    },
    payment: {
      isPaid: { type: Boolean, default: false },
      submittedAt: { type: Date },
      paidAt: { type: Date },
      paymentMethod: { type: String, trim: true },
      transactionId: { type: String, trim: true },
      transferNote: { type: String, trim: true, default: "" },
      senderName: { type: String, trim: true, default: "" },
      proofImage: { type: String, default: "" },
      amountPaid: { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "pending_confirmation", "verifying", "paid", "rejected", "refunded", "refund_pending"],
        default: "unpaid",
      },
      orderCode: { type: Number },
      paymentLinkId: { type: String, trim: true },
      checkoutUrl: { type: String, trim: true },
      transferNotifiedAt: { type: Date },
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String, default: "" },
      receiptImage: { type: String, default: "" },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
      moderatorNote: { type: String, trim: true, default: "" },
    },
    returnInfo: {
      requestedAt: { type: Date },
      returnCondition: { type: String, trim: true },
      returnNote: { type: String, trim: true },
      returnTime: { type: Date },
      returnLocation: { type: String, trim: true },
    },
    returnRequest: {
      requestedAt: { type: Date },
      returnNotes: { type: String, trim: true },
      deviceConditionNote: { type: String, trim: true },
      returnImages: [{ type: String }],
    },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      reviewImages: [{ type: String }],
      createdAt: { type: Date },
      reviewedAt: { type: Date },
    },
    ownerReview: {
      rating: { type: Number, min: 1, max: 5 },
      trustScoreDelta: { type: Number, default: 0 },
      equipmentPreservation: { type: String, enum: ["excellent", "good", "fair", "poor"], default: "good" },
      onTimeReturn: { type: Boolean, default: true },
      comment: { type: String, trim: true, default: "" },
      reviewedAt: { type: Date },
    },
    handoverCheckin: {
      receivedAt: { type: Date },
      images: [{ type: String }],
      note: { type: String, trim: true },
      confirmedByRenter: { type: Boolean, default: false },
    },
    cancellation: {
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: { type: String, trim: true },
      cancelledAt: { type: Date },
      refundAmount: { type: Number, default: 0 },
      refundStatus: { type: String, default: "completed" },
      isOwnerCancelled: { type: Boolean, default: false },
      refundInfo: {
        bankName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        accountName: { type: String, trim: true },
        refundAmount: { type: Number, default: 0 },
        status: { type: String, enum: ["pending", "processed", "rejected"], default: "pending" },
        processedAt: { type: Date },
        note: { type: String, trim: true },
      },
    },
    extensions: [
      {
        extendedAt: { type: Date, default: Date.now },
        extraDays: { type: Number, required: true },
        extraFee: { type: Number, required: true },
        previousEndDate: { type: Date, required: true },
        newEndDate: { type: Date, required: true },
        note: { type: String, trim: true },
      },
    ],
    extensionRequest: {
      status: {
        type: String,
        enum: ["NONE", "PENDING_OWNER", "APPROVED", "REJECTED", "PAID"],
        default: "NONE",
      },
      extraDays: { type: Number, default: 0 },
      extraFee: { type: Number, default: 0 },
      currentEndDate: { type: Date },
      newEndDate: { type: Date },
      note: { type: String, trim: true },
      requestedAt: { type: Date },
      approvedAt: { type: Date },
      rejectedAt: { type: Date },
      rejectionReason: { type: String, trim: true },
      payosOrderCode: { type: Number },
      paidAt: { type: Date },
    },
    dispute: {
      reason: { type: String, trim: true },
      description: { type: String, trim: true },
      damageLevel: { type: String, enum: ["MINOR", "SEVERE", "TOTAL_LOSS"], default: "MINOR" },
      evidenceImages: [{ type: String }],
      claimedAmount: { type: Number, default: 0 },
      compensationApproved: { type: Number, default: 0 },
      disputedAt: { type: Date },
      status: { type: String, default: "open" },
      adminNote: { type: String, default: "" },
      disputeId: { type: mongoose.Schema.Types.ObjectId, ref: "Dispute" },
      isLocked: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: "rentals",
  },
);

rentalSchema.pre("save", function (next) {
  // Đồng bộ notes & renterNote
  if (this.renterNote && !this.notes) {
    this.notes = this.renterNote;
  } else if (this.notes && !this.renterNote) {
    this.renterNote = this.notes;
  }

  // Đồng bộ chữ ký (Không ghi đè ảnh base64 vào tên người ký)
  if (this.contract) {
    if (this.contract.renterSignature && !this.contract.digitalSignature) {
      this.contract.digitalSignature = this.contract.renterSignature;
    } else if (this.contract.digitalSignature && !this.contract.renterSignature) {
      if (!this.contract.digitalSignature.startsWith("data:image")) {
        this.contract.renterSignature = this.contract.digitalSignature;
      }
    }
  }

  // Đồng bộ thanh toán
  if (this.payment) {
    if (this.payment.isPaid && this.payment.paymentStatus === "unpaid") {
      this.payment.paymentStatus = "paid";
    } else if (this.payment.paymentStatus === "paid" && !this.payment.isPaid) {
      this.payment.isPaid = true;
    } else if (this.payment.paymentStatus === "verifying" || this.payment.paymentStatus === "rejected") {
      this.payment.isPaid = false;
    }
  }

  // Đồng bộ returnInfo và returnRequest
  if (this.returnInfo && this.returnInfo.requestedAt) {
    if (!this.returnRequest) this.returnRequest = {};
    this.returnRequest.requestedAt = this.returnInfo.requestedAt;
    this.returnRequest.returnNotes = this.returnInfo.returnNote || "";
    this.returnRequest.deviceConditionNote = this.returnInfo.returnCondition || "";
  } else if (this.returnRequest && this.returnRequest.requestedAt) {
    if (!this.returnInfo) this.returnInfo = {};
    this.returnInfo.requestedAt = this.returnRequest.requestedAt;
    this.returnInfo.returnNote = this.returnRequest.returnNotes || "";
    this.returnInfo.returnCondition = this.returnRequest.deviceConditionNote || "";
  }

  // Đồng bộ review createdAt / reviewedAt
  if (this.review) {
    if (this.review.createdAt && !this.review.reviewedAt) {
      this.review.reviewedAt = this.review.createdAt;
    } else if (this.review.reviewedAt && !this.review.createdAt) {
      this.review.createdAt = this.review.reviewedAt;
    }
  }

  next();
});

module.exports = mongoose.model("Rental", rentalSchema);
