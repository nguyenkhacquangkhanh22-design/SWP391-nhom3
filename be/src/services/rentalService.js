const DELIVERY_FEE_MAP = {
  pickup: 0,
  walking: 15000,
  motorcycle: 30000,
  express: 60000,
  waterway: 100000,
  air: 150000,
};

const { buildContractHtmlServer } = require("../utils/contractHtmlBuilder");
const crypto = require("crypto");
const Rental = require("../models/Rental");
const Equipment = require("../models/Equipment");
const SupportTicket = require("../models/SupportTicket");
let UserNotification = null;
try { UserNotification = require("../models/UserNotification"); } catch (e) {}
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
    const {
      equipmentId,
      startDate,
      endDate,
      deliveryTime = "09:00",
      returnTime = "17:00",
      deliveryMethod = "motorcycle",
      returnMethod = "motorcycle",
      deliveryAddress,
      renterNote,
      notes,
    } = rentalData;

    if (!equipmentId) {
      throw new AppError(400, "Equipment ID is required");
    }

    // Policy: Bắt buộc tài khoản đã hoàn tất xác thực (KYC) mới được thuê
    if (renterUser.kycStatus !== "verified") {
      throw new AppError(
        403,
        "Tài khoản của bạn chưa được xác thực (KYC). Vui lòng hoàn tất xác thực danh tính để có thể thuê thiết bị trên SmartEquip."
      );
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
    const depositAmount = 0; // Chính sách SmartEquip: Miễn 100% tiền cọc
    const subtotalRentalFee = dailyRate * totalDays;
    const discountAmount = Math.round(subtotalRentalFee * discountRate);
    const rentalFee = subtotalRentalFee - discountAmount;

    // Tính phí vận chuyển theo từng phương thức nhận và trả
    const receiveFee = DELIVERY_FEE_MAP[deliveryMethod] ?? 30000;
    const returnFee = DELIVERY_FEE_MAP[returnMethod] ?? 30000;
    const shippingFee = receiveFee + returnFee;

    const totalAmount = rentalFee + shippingFee;

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
      deliveryTime: deliveryTime || "09:00",
      returnTime: returnTime || "17:00",
      deliveryMethod: deliveryMethod || "motorcycle",
      returnMethod: returnMethod || "motorcycle",
      shippingFee,
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

    // Tạo song song RentalRequest để Chủ máy nhận được trong Owner Portal theo đúng quy trình
    try {
      const RentalRequest = require("../models/RentalRequest");
      const User = require("../models/User");
      let effectiveOwnerId = equipment.owner || equipment.owner_id;
      if (!effectiveOwnerId) {
        const defaultOwner = await User.findOne({ role: "owner" }).select("_id").lean();
        effectiveOwnerId = defaultOwner?._id;
      }

      await RentalRequest.create({
        request_code: rentalCode,
        equipment_id: equipment._id,
        owner_id: effectiveOwnerId,
        renter_id: renterUser._id,
        renter_name: renterUser.name || "Khách thuê SmartEquip",
        renter_email: renterUser.email || "",
        renter_phone: renterUser.phone || "",
        delivery_address: deliveryAddress || renterUser.address || "",
        rental_type: "daily",
        start_date: start,
        end_date: end,
        duration_days: totalDays,
        rental_fee: rentalFee,
        deposit_amount: 0,
        total_estimated_amount: totalAmount,
        renter_note: renterNote || notes || "",
        status: "pending", // Hiển thị ngay trong tab "Yêu cầu thuê" của Owner
      });
    } catch (err) {
      console.error("Error creating linked RentalRequest:", err);
    }

    // Gửi thông báo cho Chủ máy (Owner)
    if (UserNotification && (equipment.owner || equipment.owner_id)) {
      try {
        await UserNotification.create({
          user_id: equipment.owner || equipment.owner_id,
          title: "📢 Có yêu cầu thuê thiết bị mới!",
          message: `Khách hàng ${renterUser.name} đã gửi yêu cầu thuê "${equipment.title}" (Mã: #${rentalCode}). Vui lòng vào trang Quản lý yêu cầu để duyệt và lập hợp đồng!`,
          related_record_id: rental._id,
        });
      } catch (err) {
        console.error("Error creating owner notification:", err);
      }
    }

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category brand modelNumber")
      .populate("owner", "name email phone trust_score bankInfo")
      .populate("renter", "name email phone");
  }

  /**
   * UC_R08: Confirm E-Contract
   * Renter xác nhận chữ ký điện tử vào hợp đồng, chuyển status sang 'CONTRACT_SIGNED'
   */
  async confirmContract(rentalId, renterUser, contractData) {
    const { digitalSignature, renterSignature, termsAccepted } = contractData;

    if (!termsAccepted) {
      throw new AppError(400, "Bạn cần đọc và chấp nhận các điều khoản trong hợp đồng thuê");
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const hasAnySignature = Boolean(
      (renterSignature && String(renterSignature).trim()) ||
      (digitalSignature && String(digitalSignature).trim()) ||
      rental.contract?.digitalSignature ||
      rental.contract?.renterSignature
    );

    if (!hasAnySignature) {
      throw new AppError(400, "Vui lòng vẽ chữ ký tay hoặc nhập họ tên để ký hợp đồng");
    }

    if (rental.renter.toString() !== renterUser._id.toString()) {
      throw new AppError(403, "Bạn không có quyền ký hợp đồng này");
    }

    const normStatus = String(rental.status).toUpperCase();
    if (normStatus === "PENDING") {
      throw new AppError(
        400,
        "Đơn thuê đang chờ Chủ máy và Quản lý phê duyệt. Sau khi đơn được duyệt, bạn mới có thể ký hợp đồng và thanh toán."
      );
    }

    const signableStatuses = [
      "APPROVED",
      "CONFIRMED",
      "CONTRACT_PENDING",
      "CONTRACT_SIGNED",
      "PAYMENT_PENDING",
      "PAID",
      "ACTIVE",
    ];
    if (!signableStatuses.includes(normStatus)) {
      throw new AppError(400, `Hợp đồng không thể ký ở trạng thái hiện tại: ${rental.status}`);
    }

    rental.contract.termsAccepted = true;

    // Lưu riêng họ tên người ký (renterSignature) và ảnh chữ ký tay base64 (digitalSignature)
    if (renterSignature && typeof renterSignature === "string" && renterSignature.trim()) {
      rental.contract.renterSignature = renterSignature.trim();
    }
    if (digitalSignature && typeof digitalSignature === "string" && digitalSignature.trim()) {
      rental.contract.digitalSignature = digitalSignature.trim();
    }
    if (!rental.contract.renterSignature) {
      rental.contract.renterSignature = renterUser.name || "Khách thuê SmartEquip";
    }
    if (!rental.contract.digitalSignature) {
      rental.contract.digitalSignature = rental.contract.renterSignature;
    }

    if (!rental.contract.signedAt) {
      rental.contract.signedAt = new Date();
    }
    if (rental.status !== "PAYMENT_PENDING" && rental.status !== "PAID") {
      rental.status = "CONTRACT_SIGNED";
    }

    await rental.save();

    // Đồng bộ sang RentalContract
    try {
      const RentalContract = require("../models/RentalContract");
      await RentalContract.findOneAndUpdate(
        {
          $or: [
            { contract_code: rental.contract?.contractNumber },
            { renter_id: rental.renter, equipment_id: rental.equipment },
          ],
        },
        {
          $set: {
            "renter_signature.signed": true,
            "renter_signature.signed_at": rental.contract.signedAt,
            "renter_signature.signature_data": rental.contract.digitalSignature,
            status: "pending_payment",
          },
        }
      );
    } catch (e) {}

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score bankInfo")
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

    const normStatus = String(rental.status).toUpperCase();
    const payableStatuses = [
      "APPROVED",
      "CONTRACT_SIGNED",
      "PAYMENT_PENDING",
      "PENDING",
      "CONTRACT_PENDING",
      "CONFIRMED",
    ];
    if (!payableStatuses.includes(normStatus)) {
      throw new AppError(
        400,
        `Không thể thanh toán đơn thuê ở trạng thái: ${rental.status}`,
      );
    }

    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    rental.payment = {
      isPaid: false, // Chờ Moderator kiểm tra và duyệt
      paymentStatus: "pending_confirmation",
      paymentMethod,
      transactionId: rental.payment?.transactionId || transactionId,
      receiptImage: paymentData.receiptImage || paymentData.proofImage || rental.payment?.receiptImage || "",
      transferNotifiedAt: new Date(),
      amountPaid: rental.totalAmount || rental.rentalFee,
    };
    rental.status = "PAYMENT_PENDING";

    // Cập nhật hoặc bảo tồn chữ ký tay điện tử nếu có gửi kèm trong payload thanh toán
    if (paymentData.digitalSignature || paymentData.handwrittenSignature) {
      const sig = (paymentData.digitalSignature || paymentData.handwrittenSignature).trim();
      if (sig) {
        rental.contract.digitalSignature = sig;
        rental.contract.termsAccepted = true;
        if (!rental.contract.signedAt) rental.contract.signedAt = new Date();
      }
    }
    if (paymentData.renterSignature || paymentData.signerName) {
      const name = (paymentData.renterSignature || paymentData.signerName).trim();
      if (name) rental.contract.renterSignature = name;
    }

    await rental.save();

    // Gửi thông báo cho Quản lý web (Moderator) và Chủ máy
    try {
      const User = require("../models/User");
      const managers = await User.find({
        role: { $regex: /^(rental[_ -]?moderator|systemadmin|admin)$/i },
      }).select("_id").lean();
      
      const notifyIds = managers.map(m => m._id);
      if (rental.owner) notifyIds.push(rental.owner);

      if (UserNotification && notifyIds.length > 0) {
        await UserNotification.insertMany(
          notifyIds.map(uid => ({
            user_id: uid,
            title: `💳 Khách thuê đã chuyển khoản đơn #${rental.rentalCode}`,
            message: `Khách thuê ${renterUser.name} đã gửi ảnh biên lai chuyển khoản ${(rental.totalAmount || rental.rentalFee).toLocaleString("vi-VN")} đ. Vui lòng kiểm tra và xác nhận thanh toán!`,
            related_record_id: rental._id,
          }))
        );
      }
    } catch (e) {
      console.error("Error notifying managers of payment:", e);
    }

    // Đồng bộ sang RentalContract và phát Socket.IO
    try {
      const RentalContract = require("../models/RentalContract");
      await RentalContract.findOneAndUpdate(
        {
          $or: [
            { contract_code: rental.contract?.contractNumber },
            { request_id: rental._id },
          ],
        },
        {
          $set: {
            payment_status: "pending_confirmation",
            receipt_image: rental.payment?.receiptImage || "",
          },
        }
      );
      const { getIO } = require("../config/socket");
      getIO().emit("payment:submitted", {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        amount: rental.payment?.amountPaid,
        receiptImage: rental.payment?.receiptImage,
      });
    } catch (e) {}

    return {
      message: "Đã gửi thông báo chuyển khoản thành công kèm biên lai. Đơn hàng đang chờ Quản lý xác nhận để bàn giao máy.",
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
  
  /**
   * Phê duyệt đơn thuê (Chủ máy / Quản lý / Test)
   * Chuyển trạng thái từ PENDING -> APPROVED
   */
  async approveRental(rentalId, user, options = {}) {
    const rental = await Rental.findById(rentalId)
      .populate("equipment")
      .populate("owner")
      .populate("renter");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.status !== "PENDING" && rental.status !== "pending") {
      throw new AppError(400, `Đơn thuê đã ở trạng thái: ${rental.status}`);
    }

    rental.status = "APPROVED";
    if (options.note) {
      rental.notes = `${rental.notes ? rental.notes + " | " : ""}Đã duyệt: ${options.note}`;
    }
    await rental.save();

    if (UserNotification && rental.renter?._id) {
      try {
        await UserNotification.create({
          user_id: rental.renter._id,
          title: "🎉 Đơn thuê đã được phê duyệt!",
          message: `Chủ máy và Quản lý đã duyệt yêu cầu thuê #${rental.rentalCode}. Vui lòng Ký hợp đồng và Thanh toán để nhận máy!`,
          related_record_id: rental._id,
        });
      } catch (err) {
        console.error("Error sending notification:", err);
      }
    }

    return rental;
  }


  /**
   * Xóa toàn bộ lịch sử thuê của tài khoản Renter hiện tại (Dành cho kiểm thử/Reset test)
   */
  async resetRentalHistory(renterUser) {
    const renterId = renterUser._id;
    const delRentals = await Rental.deleteMany({ renter: renterId });
    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.deleteMany({ renter_id: renterId });
      const RentalContract = require("../models/RentalContract");
      await RentalContract.deleteMany({ renter_id: renterId });
      if (UserNotification) {
        await UserNotification.deleteMany({ user_id: renterId });
      }
      const Equipment = require("../models/Equipment");
      await Equipment.updateMany({}, { status: "AVAILABLE" });
    } catch (e) {}

    return {
      message: `Đã xóa sạch toàn bộ lịch sử thuê (${delRentals.deletedCount} đơn). Bạn có thể test lại từ đầu.`,
      deletedCount: delRentals.deletedCount,
    };
  }

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
        .populate("owner", "name email phone avatarUrl trust_score bankInfo")
        .populate("renter", "name email phone avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Rental.countDocuments(filter),
    ]);

    // Tự động kiểm tra và tạo thông báo nhắc nhở vào hòm thư khi đơn bước vào 3 ngày cuối
    try {
      await this.checkDeadlineRemindersForUser(renterId);
    } catch (notifyErr) {
      // Non-blocking
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
   * Tự động kiểm tra và gửi thông báo vào hòm thư tài khoản khi đơn thuê bước vào 3 ngày cuối
   */
  async checkDeadlineRemindersForUser(renterId) {
    if (!UserNotification) return;
    try {
      const nowMs = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const oneDayMs = 24 * 60 * 60 * 1000;

      const activeRentals = await Rental.find({
        renter: renterId,
        status: { $in: ["PAID", "ACTIVE", "CONFIRMED", "IN_PROGRESS", "paid", "active", "confirmed", "in_progress"] },
      }).populate("equipment", "title").lean();

      for (const r of activeRentals) {
        if (!r.endDate) continue;
        const timeStr = r.returnTime || "17:00";
        const [hh, mm] = timeStr.split(":").map(Number);
        const deadline = new Date(r.endDate);
        deadline.setHours(isNaN(hh) ? 17 : hh, isNaN(mm) ? 0 : mm, 0, 0);

        const diffMs = deadline.getTime() - nowMs;
        const equipTitle = r.equipment?.title || "Thiết bị thuê";
        const dateStr = deadline.toLocaleDateString("vi-VN");

        // 1. Mốc bước vào 3 ngày cuối
        if (diffMs <= threeDaysMs && diffMs > 0) {
          const existing3Day = await UserNotification.findOne({
            user_id: renterId,
            related_record_id: r._id,
            title: { $regex: /3 ngày cuối/i },
          }).lean();

          if (!existing3Day) {
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            await UserNotification.create({
              user_id: renterId,
              title: `⏰ Thông báo: Đơn thuê #${r.rentalCode} đã bước vào 3 ngày cuối`,
              message: `Đơn thuê thiết bị "${equipTitle}" của Quý khách đã bước vào 3 ngày cuối (Hạn chót hoàn trả: ${timeStr} ngày ${dateStr} - còn khoảng ${daysLeft} ngày). Quý khách vui lòng kiểm tra thiết bị & phụ kiện để sẵn sàng hoàn trả đúng hạn.`,
              related_record_id: r._id,
            });
          }
        }

        // 2. Mốc 24 giờ cuối
        if (diffMs <= oneDayMs && diffMs > 0) {
          const existing24h = await UserNotification.findOne({
            user_id: renterId,
            related_record_id: r._id,
            title: { $regex: /24 giờ|chưa đầy 24h/i },
          }).lean();

          if (!existing24h) {
            const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            await UserNotification.create({
              user_id: renterId,
              title: `🔔 Cảnh báo: Còn chưa đầy 24 giờ đến hạn trả máy #${r.rentalCode}`,
              message: `Đơn thuê thiết bị "${equipTitle}" chỉ còn ${hoursLeft} giờ ${minsLeft} phút nữa là đến hạn trả (${timeStr} ngày ${dateStr}). Vui lòng kiểm tra đầy đủ linh phụ kiện và bấm Báo trả đồ để Shipper đến lấy!`,
              related_record_id: r._id,
            });
          }
        }

        // 3. Quá hạn trả
        if (diffMs <= 0) {
          const existingOverdue = await UserNotification.findOne({
            user_id: renterId,
            related_record_id: r._id,
            title: { $regex: /quá hạn/i },
          }).lean();

          if (!existingOverdue) {
            await UserNotification.create({
              user_id: renterId,
              title: `🚨 CẢNH BÁO: Đơn thuê #${r.rentalCode} đã quá hạn hoàn trả!`,
              message: `Thiết bị "${equipTitle}" đã quá hạn trả từ lúc ${timeStr} ngày ${dateStr}. Quý khách vui lòng bấm nút "Báo trả đồ" ngay hoặc liên hệ Chủ máy để bàn giao tránh phát sinh phụ phí trễ hạn!`,
              related_record_id: r._id,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Lỗi kiểm tra thông báo hạn trả:", e?.message);
    }
  }

  /**
   * UC_R13: Cancel Rental Request
   */
  async cancelRental(rentalId, renterUser, cancelData = {}) {
    const rawReason = cancelData?.reason;
    const reason = (typeof rawReason === "string" && rawReason.trim())
      ? rawReason.trim()
      : "Khách thay đổi kế hoạch / Đổi ý không thuê nữa";

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      throw new AppError(404, "Rental request not found");
    }

    const renterId = rental.renter?._id ? String(rental.renter._id) : String(rental.renter);
    const currentUserId = String(renterUser._id || renterUser.id);
    if (renterId !== currentUserId) {
      throw new AppError(403, "You are not authorized to cancel this rental");
    }

    const normStatus = String(rental.status).toUpperCase();
    const cancellableStatuses = [
      "PENDING",
      "APPROVED",
      "CONTRACT_PENDING",
      "CONTRACT_SIGNED",
      "PAYMENT_PENDING",
      "CONFIRMED",
    ];
    if (!cancellableStatuses.includes(normStatus)) {
      throw new AppError(
        400,
        `Không thể hủy đơn thuê ở trạng thái hiện tại: ${rental.status}. Chỉ có thể hủy đơn khi đang chờ duyệt, đã duyệt, hoặc đã ký.`
      );
    }

    rental.status = "cancelled";
    rental.cancellation = {
      cancelledBy: renterUser._id,
      reason: reason,
      cancelledAt: new Date(),
    };

    if (rental.payment && rental.payment.paymentStatus === "paid") {
      rental.payment.paymentStatus = "refunded";
    }

    await rental.save();

    // Reset thiết bị về AVAILABLE
    if (rental.equipment) {
      try {
        await Equipment.findByIdAndUpdate(rental.equipment, { status: "AVAILABLE" });
      } catch (e) {}
    }

    // Đồng bộ hủy RentalRequest liên quan
    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.updateMany(
        {
          renter_id: renterUser._id,
          equipment_id: rental.equipment,
          status: { $in: ["pending", "pending_moderator", "contract_drafted", "approved"] },
        },
        { status: "cancelled", rejection_reason: reason }
      );
    } catch (e) {}

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
   * Xem & Tải bản PDF / HTML của Hợp đồng thuê
   */
  async getContractHtml(rentalId) {
    const rental = await Rental.findById(rentalId)
      .populate("equipment")
      .populate("owner", "name email phone address")
      .populate("renter", "name email phone address");

    if (!rental) {
      throw new AppError(404, "Không tìm thấy hợp đồng thuê này");
    }

    return buildContractHtmlServer(rental);
  }
}

module.exports = new RentalService();
