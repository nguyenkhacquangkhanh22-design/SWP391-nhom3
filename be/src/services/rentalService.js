const crypto = require("crypto");
const Rental = require("../models/Rental");
const Equipment = require("../models/Equipment");
const SupportTicket = require("../models/SupportTicket");
const AppError = require("../utils/AppError");

class RentalService {
  /**
   * Kiểm tra lịch khả dụng của thiết bị (Check Availability)
   */
  async checkAvailability(equipmentId, startDate, endDate, excludeRentalId = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError(400, "Invalid start date or end date format");
    }

    if (start >= end) {
      throw new AppError(400, "End date must be after start date");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      throw new AppError(400, "Start date cannot be in the past");
    }

    const conflictQuery = {
      equipment: equipmentId,
      status: { $in: ["contract_pending", "payment_pending", "confirmed", "in_progress", "return_requested"] },
      $or: [
        { startDate: { $lte: start }, endDate: { $gt: start } },
        { startDate: { $lt: end }, endDate: { $gte: end } },
        { startDate: { $gte: start }, endDate: { $lte: end } },
      ],
    };

    if (excludeRentalId) {
      conflictQuery._id = { $ne: excludeRentalId };
    }

    const conflict = await Rental.findOne(conflictQuery);
    return {
      available: !conflict,
      conflictRental: conflict ? conflict.rentalCode : null,
      startDate: start,
      endDate: end,
    };
  }

  /**
   * UC_R07: Submit Rental Request
   */
  async createRentalRequest(renterUser, rentalData) {
    const { equipmentId, startDate, endDate, deliveryAddress, notes } = rentalData;

    if (!equipmentId) {
      throw new AppError(400, "Equipment ID is required");
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new AppError(404, "Equipment not found");
    }

    if (!["APPROVED", "AVAILABLE"].includes(equipment.status)) {
      throw new AppError(400, `Equipment is currently not available for rent (${equipment.status})`);
    }

    if (equipment.owner.toString() === renterUser._id.toString()) {
      throw new AppError(400, "You cannot rent your own equipment");
    }

    // Kiểm tra lịch khả dụng
    const availability = await this.checkAvailability(equipmentId, startDate, endDate);
    if (!availability.available) {
      throw new AppError(
        409,
        `Equipment is already booked for the selected date range. Conflicts with: ${availability.conflictRental}`,
      );
    }

    const start = availability.startDate;
    const end = availability.endDate;
    const diffTime = Math.abs(end - start);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const dailyRate = equipment.dailyRate;
    const depositAmount = equipment.depositAmount;
    const rentalFee = dailyRate * totalDays;
    const totalAmount = rentalFee + depositAmount;

    const rentalCode = `REQ-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const contractNumber = `HD-${Date.now().toString().slice(-6)}`;

    const rental = new Rental({
      rentalCode,
      renter: renterUser._id,
      equipment: equipment._id,
      owner: equipment.owner,
      startDate: start,
      endDate: end,
      totalDays,
      dailyRate,
      rentalFee,
      depositAmount,
      totalAmount,
      status: "contract_pending",
      deliveryAddress: deliveryAddress || renterUser.address || "",
      notes: notes || "",
      contract: {
        contractNumber,
        termsAccepted: false,
      },
      payment: {
        paymentStatus: "unpaid",
      },
    });

    await rental.save();

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score")
      .populate("renter", "name email phone");
  }

  /**
   * UC_R08: Confirm E-Contract
   */
  async confirmContract(rentalId, renterUser, contractData) {
    const { digitalSignature, termsAccepted } = contractData;

    if (!termsAccepted) {
      throw new AppError(400, "You must accept the terms and conditions of the rental contract");
    }

    if (!digitalSignature || typeof digitalSignature !== "string" || !digitalSignature.trim()) {
      throw new AppError(400, "Digital signature / Full name signature is required");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to sign this rental contract");
    }

    if (rental.status !== "contract_pending") {
      throw new AppError(400, `Contract cannot be signed in current status: ${rental.status}`);
    }

    rental.contract.termsAccepted = true;
    rental.contract.digitalSignature = digitalSignature.trim();
    rental.contract.signedAt = new Date();
    rental.status = "payment_pending";

    await rental.save();

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount")
      .populate("owner", "name email phone");
  }

  /**
   * UC_R09: Pay Rental & Deposit
   */
  async payRental(rentalId, renterUser, paymentData) {
    const { paymentMethod = "vnpay" } = paymentData;

    const validMethods = ["vnpay", "momo", "bank_transfer", "wallet"];
    if (!validMethods.includes(paymentMethod)) {
      throw new AppError(400, `Invalid payment method. Supported: ${validMethods.join(", ")}`);
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to pay for this rental request");
    }

    if (rental.status !== "payment_pending") {
      throw new AppError(
        400,
        `Payment cannot be processed. Current status: ${rental.status}`,
      );
    }

    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    rental.payment = {
      paymentStatus: "paid",
      paymentMethod,
      transactionId,
      paidAt: new Date(),
      amountPaid: rental.totalAmount,
    };
    rental.status = "confirmed";

    await rental.save();

    return {
      message: "Payment processed successfully. Rental is now confirmed.",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount")
        .populate("owner", "name email phone"),
    };
  }

  /**
   * UC_R10: Return Equipment
   */
  async requestReturn(rentalId, renterUser, returnData) {
    const { returnNotes, deviceConditionNote, returnImages = [] } = returnData;

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to return this rental");
    }

    if (!["confirmed", "in_progress"].includes(rental.status)) {
      throw new AppError(
        400,
        `Cannot request return in status '${rental.status}'. Only confirmed or in-progress rentals can be returned.`,
      );
    }

    rental.status = "return_requested";
    rental.returnRequest = {
      requestedAt: new Date(),
      returnNotes: returnNotes || "",
      deviceConditionNote: deviceConditionNote || "Thiết bị hoạt động bình thường, đầy đủ phụ kiện.",
      returnImages: Array.isArray(returnImages) ? returnImages : [],
    };

    await rental.save();

    return {
      message: "Yêu cầu trả thiết bị đã được gửi thành công, chờ chủ thiết bị xác nhận kiểm tra.",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate")
        .populate("owner", "name email phone"),
    };
  }

  /**
   * UC_R11: Review Equipment & Owner
   */
  async reviewRental(rentalId, renterUser, reviewData) {
    const { rating, comment } = reviewData;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      throw new AppError(400, "Rating must be an integer between 1 and 5");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to review this rental");
    }

    if (rental.status !== "completed" && rental.status !== "return_requested") {
      throw new AppError(
        400,
        "You can only review after rental is completed or returned.",
      );
    }

    rental.review = {
      rating: Number(rating),
      comment: comment || "",
      reviewedAt: new Date(),
    };

    await rental.save();

    return {
      message: "Đánh giá thiết bị và chủ sở hữu thành công.",
      rental,
    };
  }

  /**
   * UC_R12: View Rental History
   */
  async getRentalHistory(renterId, query = {}) {
    const { status, page = 1, limit = 10 } = query;
    const filter = { renter: renterId };

    if (status && typeof status === "string" && status.trim() && status !== "all") {
      filter.status = status.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [rentals, total] = await Promise.all([
      Rental.find(filter)
        .populate("equipment", "title category images dailyRate depositAmount")
        .populate("owner", "name email phone avatarUrl trust_score")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Rental.countDocuments(filter),
    ]);

    return {
      rentals,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * UC_R13: Cancel Rental Request
   */
  async cancelRental(rentalId, renterUser, cancelData) {
    const { reason } = cancelData;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new AppError(400, "Cancellation reason is required");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to cancel this rental");
    }

    const cancellableStatuses = ["pending", "contract_pending", "payment_pending", "confirmed"];
    if (!cancellableStatuses.includes(rental.status)) {
      throw new AppError(
        400,
        `Cannot cancel rental in status '${rental.status}'. Only pending or confirmed rentals can be cancelled.`,
      );
    }

    rental.status = "cancelled";
    rental.cancellation = {
      cancelledBy: renterUser._id,
      reason: reason.trim(),
      cancelledAt: new Date(),
    };

    if (rental.payment.paymentStatus === "paid") {
      rental.payment.paymentStatus = "refunded";
    }

    await rental.save();

    return {
      message: "Rental request cancelled successfully",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate")
        .populate("owner", "name email"),
    };
  }

  /**
   * UC_R14: Submit Rental Dispute
   */
  async submitDispute(rentalId, renterUser, disputeData) {
    const { reason, evidenceImages = [] } = disputeData;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      throw new AppError(400, "Dispute reason is required");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental not found");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "You are not authorized to dispute this rental");
    }

    rental.status = "disputed";
    rental.dispute = {
      reason: reason.trim(),
      evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
      disputedAt: new Date(),
      status: "open",
    };

    await rental.save();

    return {
      message: "Khiếu nại đơn thuê đã được gửi tới đội ngũ hỗ trợ SmartEquip.",
      rental,
    };
  }

  /**
   * UC_R15: Submit Support Ticket
   */
  async createSupportTicket(user, ticketData) {
    const { subject, category = "general", message, rentalId } = ticketData;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      throw new AppError(400, "Subject is required");
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      throw new AppError(400, "Message is required");
    }

    const ticketCode = `TCK-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    const ticket = new SupportTicket({
      ticketCode,
      user: user._id,
      rental: rentalId || undefined,
      subject: subject.trim(),
      category,
      message: message.trim(),
      status: "open",
    });

    await ticket.save();

    return {
      message: "Yêu cầu hỗ trợ đã được tạo thành công.",
      ticket,
    };
  }
}

module.exports = new RentalService();
