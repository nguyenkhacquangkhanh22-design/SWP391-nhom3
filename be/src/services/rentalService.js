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
      status: {
        $in: [
          "PENDING",
          "CONTRACT_SIGNED",
          "PAID",
          "ACTIVE",
          "contract_pending",
          "payment_pending",
          "confirmed",
          "in_progress",
        ],
      },
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
   * Tự động tính số ngày thuê, giảm giá nếu thuê dài ngày (>= 7 ngày giảm 10%, >= 30 ngày giảm 20%)
   * Tạo đơn thuê mới với trạng thái 'PENDING'
   */
  async createRentalRequest(renterUser, rentalData) {
    const { equipmentId, startDate, endDate, deliveryAddress, renterNote, notes } = rentalData;

    if (!equipmentId) {
      throw new AppError(400, "Equipment ID is required");
    }

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new AppError(404, "Equipment not found");
    }

    const validStatuses = ["AVAILABLE", "APPROVED", "available", "approved"];
    if (!validStatuses.includes(equipment.status)) {
      throw new AppError(400, `Thiết bị hiện không khả dụng để thuê (${equipment.status})`);
    }

    if (equipment.owner && equipment.owner.toString() === renterUser._id.toString()) {
      throw new AppError(400, "Bạn không thể thuê thiết bị của chính mình");
    }

    // Kiểm tra lịch khả dụng (Availability)
    const availability = await this.checkAvailability(equipmentId, startDate, endDate);
    if (!availability.available) {
      throw new AppError(
        409,
        `Thiết bị đã có người đặt thuê trong khoảng thời gian này (Mã đơn trùng: ${availability.conflictRental})`,
      );
    }

    const start = availability.startDate;
    const end = availability.endDate;
    const diffTime = Math.abs(end - start);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Áp dụng giảm giá thuê dài ngày
    let discountRate = 0;
    if (totalDays >= 30) {
      discountRate = 0.20; // Giảm 20% nếu >= 30 ngày
    } else if (totalDays >= 7) {
      discountRate = 0.10; // Giảm 10% nếu >= 7 ngày
    }

    const dailyRate = equipment.dailyRate || (equipment.pricing ? equipment.pricing.price_per_day : 0) || 0;
    const depositAmount = equipment.depositAmount || (equipment.pricing ? equipment.pricing.deposit_amount : 0) || 0;
    const subtotalRentalFee = dailyRate * totalDays;
    const discountAmount = Math.round(subtotalRentalFee * discountRate);
    const rentalFee = subtotalRentalFee - discountAmount;
    const totalAmount = rentalFee + depositAmount;

    const rentalCode = `REQ-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const contractNumber = `HD-${Date.now().toString().slice(-6)}`;
    const standardContractTerms = `Hợp đồng thuê thiết bị công nghệ SmartEquip số ${contractNumber}. Người thuê cam kết sử dụng đúng quy chuẩn kỹ thuật, bảo quản nguyên vẹn linh kiện và hoàn trả đúng hẹn. Tiền đặt cọc ${depositAmount.toLocaleString("vi-VN")} đ sẽ được hoàn trả đầy đủ sau khi kiểm tra thiết bị nguyên vẹn.`;

    const rental = new Rental({
      rentalCode,
      renter: renterUser._id,
      equipment: equipment._id,
      owner: equipment.owner || equipment.owner_id,
      startDate: start,
      endDate: end,
      totalDays,
      dailyRate,
      rentalFee,
      depositAmount,
      discountAmount,
      totalAmount,
      status: "PENDING",
      deliveryAddress: deliveryAddress || renterUser.address || "",
      renterNote: renterNote || notes || "",
      notes: notes || renterNote || "",
      contract: {
        contractNumber,
        contractTerms: standardContractTerms,
        termsAccepted: false,
      },
      payment: {
        isPaid: false,
        paymentStatus: "unpaid",
      },
    });

    await rental.save();

    // Đồng bộ tạo bản ghi RentalRequest cho Cổng Người Cho Thuê (Owner Portal)
    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.create({
        request_code: rentalCode,
        equipment_id: equipment._id,
        owner_id: equipment.owner || equipment.owner_id,
        renter_id: renterUser._id,
        renter_name: renterUser.name || "Khách thuê",
        renter_phone: renterUser.phone || "",
        renter_email: renterUser.email || "",
        rental_type: "daily",
        start_date: start,
        end_date: end,
        duration_days: totalDays,
        duration_hours: totalDays * 24,
        rental_fee: rentalFee,
        deposit_amount: depositAmount,
        total_estimated_amount: totalAmount,
        renter_note: renterNote || notes || "",
        status: "pending",
      });
    } catch (rrErr) {
      console.warn("Lưu RentalRequest đồng bộ:", rrErr.message);
    }

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category brand modelNumber")
      .populate("owner", "name email phone trust_score")
      .populate("renter", "name email phone");
  }

  /**
   * UC_R08: Confirm E-Contract
   * Renter xác nhận chữ ký điện tử vào hợp đồng, chuyển status sang 'CONTRACT_SIGNED'
   */
  async confirmContract(rentalId, renterUser, contractData) {
    const { digitalSignature, renterSignature, termsAccepted } = contractData;
    const signature = (renterSignature || digitalSignature || "").trim();

    if (!termsAccepted) {
      throw new AppError(400, "Bạn cần đọc và chấp nhận các điều khoản trong hợp đồng thuê");
    }

    if (!signature) {
      throw new AppError(400, "Vui lòng nhập chữ ký điện tử / Họ tên để ký hợp đồng");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền ký hợp đồng này");
    }

    const signableStatuses = ["APPROVED", "approved", "CONTRACT_PENDING", "contract_pending"];
    if (!signableStatuses.includes(rental.status)) {
      if (rental.status === "PENDING" || rental.status === "pending") {
        throw new AppError(400, "Yêu cầu thuê cần được Chủ thiết bị (Owner) phê duyệt trước khi ký hợp đồng");
      }
      throw new AppError(400, `Hợp đồng không thể ký ở trạng thái hiện tại: ${rental.status}`);
    }

    rental.contract.termsAccepted = true;
    rental.contract.renterSignature = signature;
    rental.contract.digitalSignature = signature;
    rental.contract.signedAt = new Date();
    rental.status = "CONTRACT_SIGNED";

    await rental.save();

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score")
      .populate("renter", "name email phone");
  }

  /**
   * UC_R09: Pay Rental & Deposit
   * Mô phỏng thanh toán tiền cọc + phí thuê, chuyển status sang 'PAID'
   */
  async payRental(rentalId, renterUser, paymentData = {}) {
    const { paymentMethod = "vnpay" } = paymentData;

    const validMethods = ["vnpay", "momo", "bank_transfer", "wallet"];
    if (!validMethods.includes(paymentMethod)) {
      throw new AppError(400, `Phương thức thanh toán không hợp lệ. Hỗ trợ: ${validMethods.join(", ")}`);
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền thanh toán cho đơn thuê này");
    }

    const payableStatuses = ["CONTRACT_SIGNED", "payment_pending"];
    if (!payableStatuses.includes(rental.status)) {
      if (rental.status === "PENDING" || rental.status === "pending") {
        throw new AppError(400, "Đơn thuê đang chờ Chủ thiết bị (Owner) phê duyệt, chưa thể thanh toán");
      }
      if (rental.status === "APPROVED" || rental.status === "approved" || rental.status === "CONTRACT_PENDING" || rental.status === "contract_pending") {
        throw new AppError(400, "Bạn cần ký hợp đồng điện tử trước khi thanh toán tiền cọc và tiền thuê");
      }
      throw new AppError(
        400,
        `Không thể thanh toán đơn thuê ở trạng thái: ${rental.status}`
      );
    }

    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    rental.payment = {
      isPaid: true,
      paymentStatus: "paid",
      paymentMethod,
      transactionId,
      paidAt: new Date(),
      amountPaid: rental.totalAmount,
    };
    rental.status = "PAID";

    await rental.save();

    return {
      message: "Thanh toán tiền thuê và tiền cọc thành công.",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount category")
        .populate("owner", "name email phone"),
    };
  }

  /**
   * UC_R10: Return Equipment
   * Renter gửi yêu cầu hoàn trả thiết bị, hẹn giờ và địa điểm trả, chuyển status sang 'RETURNED'
   */
  async requestReturn(rentalId, renterUser, returnData = {}) {
    const {
      returnCondition,
      returnNote,
      returnTime,
      returnLocation,
      returnNotes,
      deviceConditionNote,
      returnImages = [],
    } = returnData;

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền gửi yêu cầu trả cho đơn thuê này");
    }

    const returnableStatuses = ["PAID", "ACTIVE", "confirmed", "in_progress"];
    if (!returnableStatuses.includes(rental.status)) {
      throw new AppError(
        400,
        `Không thể gửi yêu cầu hoàn trả ở trạng thái '${rental.status}'. Chỉ các đơn đã thanh toán hoặc đang thuê mới được trả thiết bị.`,
      );
    }

    rental.status = "RETURNED";
    rental.returnInfo = {
      requestedAt: new Date(),
      returnCondition: returnCondition || deviceConditionNote || "Thiết bị nguyên vẹn, hoạt động bình thường.",
      returnNote: returnNote || returnNotes || "",
      returnTime: returnTime ? new Date(returnTime) : new Date(),
      returnLocation: returnLocation || rental.deliveryAddress || "Địa chỉ mặc định theo hợp đồng",
    };
    rental.returnRequest = {
      requestedAt: new Date(),
      returnNotes: returnNote || returnNotes || "",
      deviceConditionNote: returnCondition || deviceConditionNote || "Thiết bị nguyên vẹn.",
      returnImages: Array.isArray(returnImages) ? returnImages : [],
    };

    await rental.save();

    return {
      message: "Yêu cầu hoàn trả thiết bị đã được gửi thành công. Chủ thiết bị sẽ tiến hành nghiệm thu.",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount category")
        .populate("owner", "name email phone"),
    };
  }

  /**
   * UC_R11: Review Equipment & Owner
   * Gửi đánh giá sao (1-5) và bình luận sau khi hoàn thành đơn
   */
  async reviewRental(rentalId, renterUser, reviewData) {
    const { rating, comment } = reviewData;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      throw new AppError(400, "Điểm đánh giá phải từ 1 đến 5 sao");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền đánh giá đơn thuê này");
    }

    const reviewableStatuses = ["RETURNED", "COMPLETED", "return_requested", "completed"];
    if (!reviewableStatuses.includes(rental.status)) {
      throw new AppError(
        400,
        "Bạn chỉ có thể đánh giá sau khi đã gửi yêu cầu trả hoặc đơn thuê đã hoàn thành.",
      );
    }

    const now = new Date();
    rental.review = {
      rating: Number(rating),
      comment: comment || "",
      createdAt: now,
      reviewedAt: now,
    };

    await rental.save();

    // Cập nhật rating và review_count trung bình cho Equipment
    try {
      const allReviews = await Rental.find({
        equipment: rental.equipment,
        "review.rating": { $exists: true, $ne: null },
      }).select("review.rating");

      if (allReviews.length > 0) {
        const totalScore = allReviews.reduce((sum, r) => sum + (r.review?.rating || 5), 0);
        const avg = Math.round((totalScore / allReviews.length) * 10) / 10;
        await Equipment.findByIdAndUpdate(rental.equipment, {
          rating: avg,
          review_count: allReviews.length,
        });
      }
    } catch (e) {
      console.warn("Không thể cập nhật rating tổng:", e.message);
    }

    return {
      message: "Đánh giá thiết bị và chủ sở hữu thành công.",
      rental,
    };
  }

  /**
   * UC_R12: View Rental History
   * Lấy danh sách đơn thuê của chính Renter đó, hỗ trợ filter theo trạng thái
   */
  async getRentalHistory(renterId, query = {}) {
    const { status, page = 1, limit = 10 } = query;
    const filter = { renter: renterId };

    if (status && typeof status === "string" && status.trim() && status !== "all") {
      const s = status.trim().toUpperCase();
      const statusMap = {
        PENDING: ["PENDING", "pending", "contract_pending"],
        CONTRACT_SIGNED: ["CONTRACT_SIGNED", "payment_pending"],
        PAID: ["PAID", "confirmed"],
        ACTIVE: ["ACTIVE", "in_progress"],
        RETURNED: ["RETURNED", "return_requested"],
        COMPLETED: ["COMPLETED", "completed"],
        CANCELLED: ["CANCELLED", "cancelled"],
        DISPUTED: ["DISPUTED", "disputed"],
      };

      if (statusMap[s]) {
        filter.status = { $in: statusMap[s] };
      } else {
        filter.status = { $regex: new RegExp(`^${status.trim()}$`, "i") };
      }
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

  /**
   * Owner duyệt yêu cầu thuê
   */
  async approveRental(rentalId, ownerUser) {
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }
    if (rental.owner.toString() !== ownerUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền duyệt đơn thuê này");
    }
    if (rental.status !== "PENDING" && rental.status !== "pending") {
      throw new AppError(400, `Đơn thuê đã ở trạng thái: ${rental.status}`);
    }
    rental.status = "APPROVED";
    await rental.save();

    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.updateMany(
        {
          $or: [
            { request_code: rental.rentalCode },
            { renter_id: rental.renter, equipment_id: rental.equipment, status: "pending" },
          ],
        },
        { status: "approved", responded_at: new Date() }
      );
    } catch (err) {}

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score")
      .populate("renter", "name email phone");
  }

  /**
   * Owner từ chối yêu cầu thuê
   */
  async rejectRental(rentalId, ownerUser, reason = "") {
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }
    if (rental.owner.toString() !== ownerUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền từ chối đơn thuê này");
    }
    rental.status = "CANCELLED";
    rental.cancelReason = reason;
    await rental.save();

    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.updateMany(
        {
          $or: [
            { request_code: rental.rentalCode },
            { renter_id: rental.renter, equipment_id: rental.equipment, status: "pending" },
          ],
        },
        { status: "rejected", rejection_reason: reason, responded_at: new Date() }
      );
    } catch (err) {}

    return rental;
  }

}

module.exports = new RentalService();
