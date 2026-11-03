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
          "APPROVED",
          "CONTRACT_SIGNED",
          "PAYMENT_VERIFYING",
          "PAYMENT_REJECTED",
          "PAID",
          "ACTIVE",
          "approved",
          "contract_pending",
          "payment_pending",
          "payment_verifying",
          "payment_rejected",
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
    const depositAmount = 0;
    const subtotalRentalFee = dailyRate * totalDays;
    const discountAmount = Math.round(subtotalRentalFee * discountRate);
    const rentalFee = subtotalRentalFee - discountAmount;
    const totalAmount = rentalFee;

    const rentalCode = `REQ-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const contractNumber = `HD-${Date.now().toString().slice(-6)}`;
    const standardContractTerms = `Hợp đồng thuê thiết bị công nghệ SmartEquip số ${contractNumber} (Không yêu cầu tiền cọc). Người thuê cam kết sử dụng đúng quy chuẩn kỹ thuật, bảo quản nguyên vẹn linh kiện và hoàn trả đúng hẹn. Trường hợp hư hỏng hoặc mất mát linh kiện do lỗi chủ quan, người thuê chịu trách nhiệm bồi thường chi phí khắc phục thực tế.`;

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

    if (rental.status === "CONTRACT_SIGNED") {
      return await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount category")
        .populate("owner", "name email phone trust_score")
        .populate("renter", "name email phone");
    }

    const signableStatuses = ["APPROVED", "approved", "CONTRACT_PENDING", "contract_pending"];
    if (!signableStatuses.includes(rental.status)) {
      if (rental.status === "PENDING" || rental.status === "pending") {
        throw new AppError(400, "Yêu cầu thuê cần được Chủ thiết bị (Owner) phê duyệt trước khi ký hợp đồng");
      }
      throw new AppError(400, `Hợp đồng không thể ký ở trạng thái hiện tại: ${rental.status}`);
    }

    // Bắt buộc hợp đồng phải được Quản lý web (Moderator) kiểm tra và phê duyệt trước khi gửi về cho Người thuê ký!
    const RentalContract = require("../models/RentalContract");
    const RentalRequest = require("../models/RentalRequest");
    const matchingReq = await RentalRequest.findOne({
      $or: [
        { request_code: rental.rentalCode },
        { renter_id: rental.renter, equipment_id: rental.equipment },
      ],
    }).sort({ createdAt: -1 });

    const contractQuery = matchingReq
      ? { $or: [{ request_id: matchingReq._id }, { contract_code: rental.contract?.contractNumber }] }
      : { contract_code: rental.contract?.contractNumber };

    const matchingContract = await RentalContract.findOne(contractQuery).sort({ createdAt: -1 });
    if (matchingContract) {
      if (matchingContract.status === "draft" || matchingContract.status === "pending_approval") {
        throw new AppError(
          400,
          "Hợp đồng thuê đang được Quản lý web (Moderator) kiểm tra. Vui lòng chờ Quản lý web phê duyệt hợp đồng trước khi ký tên."
        );
      }
      if (matchingContract.status === "moderator_rejected") {
        throw new AppError(
          400,
          "Hợp đồng đang được Chủ máy (Owner) điều chỉnh theo yêu cầu của Quản lý web. Vui lòng chờ cập nhật trước khi ký tên."
        );
      }
      if (matchingContract.status !== "moderator_approved" && matchingContract.status !== "signed") {
        throw new AppError(
          400,
          "Hợp đồng này chưa được Quản lý web (Moderator) phê duyệt để chuyển cho bạn ký tên."
        );
      }
    } else if (!rental.contract?.moderatorApproved) {
      throw new AppError(
        400,
        "Hợp đồng thuê cần được Chủ thiết bị lập và Quản lý web (Moderator) kiểm tra phê duyệt trước khi bạn có thể ký tên."
      );
    }

    if (!rental.contract) {
      rental.contract = {};
    }
    rental.contract.termsAccepted = true;
    rental.contract.renterSignature = signature;
    rental.contract.digitalSignature = signature;
    rental.contract.signedAt = new Date();
    rental.status = "CONTRACT_SIGNED";

    await rental.save();

    // Đồng bộ chữ ký sang RentalContract & RentalRequest nếu có
    try {
      const RentalRequest = require("../models/RentalRequest");
      const RentalContract = require("../models/RentalContract");
      const matchingReq = await RentalRequest.findOne({
        $or: [
          { request_code: rental.rentalCode },
          { renter_id: rental.renter, equipment_id: rental.equipment, status: { $in: ["approved", "contract_created"] } },
        ],
      });
      if (matchingReq) {
        await RentalContract.updateMany(
          { request_id: matchingReq._id },
          {
            $set: {
              status: "signed",
              renter_signature: {
                signed: true,
                signed_at: new Date(),
                signature_data: `${signature} (RENTER_SIG_${renterUser._id}_${Date.now()})`,
                signer_name: signature,
              },
            },
          }
        );
      }
    } catch (syncErr) {
      console.warn("Đồng bộ chữ ký sang RentalContract:", syncErr.message);
    }

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score")
      .populate("renter", "name email phone");
  }

  /**
   * UC_R09: Pay Rental & Deposit via QR -> Chờ Rental Moderator xác nhận
   */
  async payRental(rentalId, renterUser, paymentData = {}) {
    const {
      paymentMethod = "qr_transfer",
      transactionId: inputTxnId = "",
      transferNote = "",
      senderName = "",
      proofImage = "",
    } = paymentData;

    const validMethods = ["qr_transfer", "bank_transfer", "vnpay", "momo", "wallet"];
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

    const payableStatuses = [
      "CONTRACT_SIGNED",
      "payment_pending",
      "PAYMENT_REJECTED",
      "payment_rejected",
    ];
    if (!payableStatuses.includes(rental.status)) {
      if (rental.status === "PENDING" || rental.status === "pending") {
        throw new AppError(400, "Đơn thuê đang chờ Chủ thiết bị (Owner) phê duyệt, chưa thể thanh toán");
      }
      if (
        rental.status === "APPROVED" ||
        rental.status === "approved" ||
        rental.status === "CONTRACT_PENDING" ||
        rental.status === "contract_pending"
      ) {
        throw new AppError(400, "Bạn cần ký hợp đồng điện tử trước khi thanh toán phí thuê thiết bị");
      }
      if (rental.status === "PAYMENT_VERIFYING" || rental.status === "payment_verifying") {
        throw new AppError(400, "Giao dịch thanh toán của bạn đang chờ Rental Moderator xác nhận");
      }
      throw new AppError(
        400,
        `Không thể thanh toán đơn thuê ở trạng thái: ${rental.status}`
      );
    }

    const generatedTxnId = `QR-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const finalTxnId = typeof inputTxnId === "string" && inputTxnId.trim() ? inputTxnId.trim() : generatedTxnId;

    rental.payment = {
      isPaid: false,
      paymentStatus: "verifying",
      paymentMethod,
      transactionId: finalTxnId,
      transferNote:
        typeof transferNote === "string" && transferNote.trim()
          ? transferNote.trim()
          : `${rental.rentalCode} THANH TOAN`,
      senderName:
        typeof senderName === "string" && senderName.trim()
          ? senderName.trim()
          : renterUser.name || "Người thuê",
      proofImage: typeof proofImage === "string" ? proofImage : "",
      submittedAt: new Date(),
      amountPaid: rental.totalAmount,
      moderatorNote: "",
    };
    rental.status = "PAYMENT_VERIFYING";

    await rental.save();

    // Thông báo cho tất cả Rental Moderator & System Admin để vào đối chiếu xác nhận QR
    try {
      const User = require("../models/User");
      const UserNotification = require("../models/UserNotification");
      const moderators = await User.find({
        role: { $in: ["rentalmoderator", "rental_moderator", "rental moderator", "systemadmin", "admin"] },
      })
        .select("_id")
        .lean();

      if (moderators.length > 0) {
        await UserNotification.insertMany(
          moderators.map((mod) => ({
            user_id: mod._id,
            title: `💳 Chờ xác nhận thanh toán QR #${rental.rentalCode}`,
            message: `Khách thuê ${renterUser.name || ""} vừa xác nhận đã chuyển khoản ${rental.totalAmount.toLocaleString("vi-VN")} đ cho đơn #${rental.rentalCode}. Vui lòng đối chiếu sao kê và xác nhận.`,
            related_record_id: rental._id,
          }))
        );
      }

      const { getIO } = require("../config/socket");
      getIO().emit("payment:submitted", {
        rentalId: rental._id.toString(),
        rentalCode: rental.rentalCode,
        amount: rental.totalAmount,
        renterName: renterUser.name,
      });
    } catch (notifyErr) {
      console.warn("Thông báo thanh toán tới Moderator:", notifyErr.message);
    }

    return {
      message:
        "Đã gửi xác nhận chuyển khoản QR thành công! Vui lòng chờ Rental Moderator kiểm tra và xác nhận thanh toán.",
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
    const { status, page = 1, limit = 50 } = query;
    const filter = { renter: renterId };

    if (status && typeof status === "string" && status.trim() && status !== "all") {
      const s = status.trim().toUpperCase();
      const statusMap = {
        PENDING: ["PENDING", "APPROVED", "pending", "approved", "contract_pending"],
        CONTRACT_SIGNED: ["CONTRACT_SIGNED", "PAYMENT_VERIFYING", "PAYMENT_REJECTED", "payment_pending", "payment_verifying", "payment_rejected"],
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
        .populate("renter", "name email phone")
        .populate("payment.verifiedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Rental.countDocuments(filter),
    ]);

    // Đồng bộ trạng thái kiểm duyệt của Moderator từ RentalContract vào từng Rental
    try {
      const RentalContract = require("../models/RentalContract");
      const RentalRequest = require("../models/RentalRequest");
      const codes = rentals.map((r) => r.rentalCode).filter(Boolean);
      const reqs = await RentalRequest.find({ request_code: { $in: codes } }).select("_id request_code").lean();
      const reqMap = new Map(reqs.map((rq) => [rq.request_code, rq._id]));
      const reqIds = reqs.map((rq) => rq._id);
      const contracts = await RentalContract.find({ request_id: { $in: reqIds } }).sort({ version: -1, createdAt: -1 }).lean();
      const contractMap = new Map();
      for (const c of contracts) {
        if (!contractMap.has(c.request_id.toString())) {
          contractMap.set(c.request_id.toString(), c);
        }
      }

      for (const r of rentals) {
        const rqId = reqMap.get(r.rentalCode);
        const contract = rqId ? contractMap.get(rqId.toString()) : null;
        if (contract) {
          if (!r.contract) r.contract = {};
          r.contract.contractNumber = contract.contract_code;
          r.contract.contractTerms = contract.terms_content;
          r.contract.moderatorStatus = contract.status;
          r.contract.moderatorApproved = contract.status === "moderator_approved" || contract.status === "signed";
          r.contract.ownerSigned = Boolean(contract.owner_signature?.signed);
        }
      }
    } catch (enrichErr) {
      console.error("Failed to enrich contracts in getRentalHistory:", enrichErr);
    }

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

    const cancellableStatuses = ["PENDING", "APPROVED", "CONTRACT_SIGNED", "PAYMENT_REJECTED", "pending", "approved", "contract_pending", "payment_pending", "payment_rejected", "confirmed"];
    if (!cancellableStatuses.includes(rental.status)) {
      throw new AppError(
        400,
        `Cannot cancel rental in status '${rental.status}'. Only pending or confirmed rentals can be cancelled.`,
      );
    }

    rental.status = "CANCELLED";
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
