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
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");
const {
  checkBookingConflict,
  lockEquipmentSchedule,
  unlockEquipmentSchedule,
} = require("../utils/bookingConflictChecker");

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

    if (start > end) {
      throw new AppError(400, "Ngày trả máy phải sau hoặc cùng ngày nhận máy");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      throw new AppError(400, "Ngày bắt đầu thuê không được ở trong quá khứ");
    }

    const startRange = new Date(start);
    startRange.setHours(0, 0, 0, 0);
    const endRange = new Date(end);
    endRange.setHours(23, 59, 59, 999);

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
        { startDate: { $lte: startRange }, endDate: { $gte: startRange } },
        { startDate: { $lte: endRange }, endDate: { $gte: endRange } },
        { startDate: { $gte: startRange }, endDate: { $lte: endRange } },
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

    // Gói bảo hiểm rơi vỡ tùy chọn (+5% giá thuê)
    const hasInsurance = Boolean(rentalData.hasInsurance);
    const insuranceFee = hasInsurance ? Math.round(subtotalRentalFee * 0.05) : 0;

    // Tính phí vận chuyển theo từng phương thức nhận và trả
    const receiveFee = (typeof DELIVERY_FEE_MAP !== "undefined" && DELIVERY_FEE_MAP[deliveryMethod]) ?? 30000;
    const returnFee = (typeof DELIVERY_FEE_MAP !== "undefined" && DELIVERY_FEE_MAP[returnMethod]) ?? 30000;
    const shippingFee = receiveFee + returnFee;

    const totalAmount = rentalFee + shippingFee + insuranceFee;

    const rentalCode = `REQ-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const contractNumber = `HD-${Date.now().toString().slice(-6)}`;
    const standardContractTerms = `HỢP ĐỒNG THUÊ THIẾT BỊ CÔNG NGHỆ SMARTEQUIP #${contractNumber}
1. ĐIỀU KHOẢN SỬ DỤNG: Người thuê cam kết sử dụng thiết bị đúng kỹ thuật, bảo quản nguyên vẹn thân máy, ống kính và phụ kiện đi kèm.
2. CÔNG THỨC PHỤ PHÍ QUÁ HẠN TRẢ MÁY:
   - Trả trễ dưới 60 phút: Miễn phí hỗ trợ (Thời gian ân hạn).
   - Trả trễ từ 1 đến 4 giờ: Phụ phí 30% đơn giá ngày (${Math.round(dailyRate * 0.3).toLocaleString("vi-VN")} đ).
   - Trả trễ từ 4 đến 8 giờ: Phụ phí 60% đơn giá ngày (${Math.round(dailyRate * 0.6).toLocaleString("vi-VN")} đ).
   - Trả trễ trên 8 giờ hoặc sang ngày kế tiếp: Phụ phí 100% đơn giá ngày (${dailyRate.toLocaleString("vi-VN")} đ/ngày).
3. BIÊN BẢN BÀN GIAO & NGOẠI QUAN: Người thuê có quyền tải lên tối đa 3 ảnh chụp ngoại quan thực tế lúc vừa nhận máy để làm bằng chứng đối chiếu khi trả đồ.
4. BẢO HIỂM RƠI VỠ: ${hasInsurance ? `ĐÃ ĐĂNG KÝ GÓI BẢO HIỂM TOÀN DIỆN (Phí: ${insuranceFee.toLocaleString("vi-VN")} đ - Miễn đền bù tối đa 70% chi phí sửa chữa rủi ro trầy xước/va chạm nhẹ).` : "KHÔNG ĐĂNG KÝ GÓI BẢO HIỂM (Người thuê chịu 100% chi phí nếu xảy ra hỏng hóc do bất cẩn)."}`;

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
      shippingFee,
      hasInsurance,
      insuranceFee,
      totalAmount,
      status: "PENDING",
      deliveryAddress: deliveryAddress || renterUser.address || "",
      deliveryTime: deliveryTime || "09:00",
      returnTime: returnTime || "17:00",
      deliveryMethod: deliveryMethod || "motorcycle",
      returnMethod: returnMethod || "motorcycle",
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

    // Keep the Owner Portal request in sync before returning success to the renter.
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
    } catch (rrErr) {
      await Rental.deleteOne({ _id: rental._id });
      throw rrErr;
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

    // Phát Socket.IO thông báo tức thì (Realtime Toast) cho Owner và hệ thống
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      const toastData = {
        type: "rental_created",
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        equipmentTitle: equipment.title,
        renterName: renterUser.name || "Khách thuê SmartEquip",
        renterId: String(renterUser._id),
        ownerId: String(effectiveOwnerId || equipment.owner || equipment.owner_id || ""),
        totalAmount: rental.totalAmount,
        title: "📬 Bạn có đơn thuê mới!",
        message: `Khách thuê ${renterUser.name} vừa gửi yêu cầu thuê thiết bị "${equipment.title}" (Mã: #${rental.rentalCode}).`,
        link: "/owner",
        createdAt: new Date(),
      };
      io.emit("rental:created", toastData);
      io.emit("notification:new_rental", toastData);
      const targetOwnerId = String(effectiveOwnerId || equipment.owner || equipment.owner_id || "");
      if (targetOwnerId) {
        io.to(`user:${targetOwnerId}`).emit("rental:created", toastData);
        io.to(`user:${targetOwnerId}`).emit("notification:new_rental", toastData);
      }
    } catch (socketErr) {
      console.warn("Socket emit error on createRentalRequest:", socketErr?.message);
    }

    return await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category brand modelNumber")
      .populate("owner", "name email phone trust_score bankInfo")
      .populate("renter", "name email phone");
  }

  /**
   * Đồng ý thỏa thuận điều khoản hợp đồng sau khi trao đổi qua chat
   * Cho phép mở nút Ký hợp đồng & Thanh toán
   */
  async agreeContract(rentalId, user) {
    let rental = null;
    if (mongoose.isValidObjectId(rentalId)) {
      rental = await Rental.findById(rentalId)
        .populate("renter", "name email phone User_Id")
        .populate("owner", "name email phone User_Id")
        .populate("equipment", "title images dailyRate");
    }

    if (!rental) {
      rental = await Rental.findOne({
        $or: [
          { rentalCode: rentalId },
          { "contract.contractNumber": rentalId },
        ],
      })
        .populate("renter", "name email phone User_Id")
        .populate("owner", "name email phone User_Id")
        .populate("equipment", "title images dailyRate");
    }

    if (!rental) {
      const RentalContract = require("../models/RentalContract");
      let rc = null;
      if (mongoose.isValidObjectId(rentalId)) {
        rc = await RentalContract.findById(rentalId).lean();
      }
      if (!rc) {
        rc = await RentalContract.findOne({ contract_code: rentalId }).lean();
      }
      if (rc) {
        rental = await Rental.findOne({
          $or: [
            { "contract.contractNumber": rc.contract_code },
            { renter: rc.renter_id, equipment: rc.equipment_id },
          ],
        })
          .populate("renter", "name email phone User_Id")
          .populate("owner", "name email phone User_Id")
          .populate("equipment", "title images dailyRate");
      }
    }

    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const userIdStr = user._id ? user._id.toString() : String(user.User_Id || user.id || "");
    const renterIdStr = rental.renter?._id?.toString() || rental.renter?.toString() || String(rental.renter?.User_Id || "");
    const ownerIdStr = rental.owner?._id?.toString() || rental.owner?.toString() || String(rental.owner?.User_Id || "");
    const userRole = String(user.role || "").toLowerCase();

    const isMatch =
      userIdStr === renterIdStr ||
      userIdStr === ownerIdStr ||
      (user.User_Id && (String(user.User_Id) === String(rental.renter?.User_Id) || String(user.User_Id) === String(rental.owner?.User_Id))) ||
      ["admin", "rentalmoderator"].includes(userRole);

    if (!isMatch) {
      throw new AppError(403, "Bạn không có quyền xác nhận thỏa thuận cho đơn thuê này");
    }

    rental.contract = rental.contract || {};
    rental.contract.agreedToSign = true;
    rental.contract.agreedAt = new Date();
    if (rental.status === "PENDING" || rental.status === "pending") {
      rental.status = "APPROVED";
    }
    if (rental.contract.moderatorStatus === "approved") {
      rental.contract.moderatorStatus = "moderator_approved";
    }
    await rental.save();

    // Phát Socket.IO để hai bên cập nhật giao diện thời gian thực
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      const payload = {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        agreedBy: user.name,
        agreedRole: userIdStr === renterIdStr ? "renter" : "owner",
        renterId: renterIdStr,
        ownerId: ownerIdStr,
      };
      io.emit("rental:agreed", payload);
    } catch (socketErr) {
      console.warn("Socket emit error on agreeContract:", socketErr?.message);
    }

    return rental;
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

    let rental = null;
    if (mongoose.isValidObjectId(rentalId)) {
      rental = await Rental.findById(rentalId);
    }
    if (!rental) {
      rental = await Rental.findOne({
        $or: [
          { rentalCode: rentalId },
          { "contract.contractNumber": rentalId },
        ],
      });
    }
    if (!rental) {
      const RentalContract = require("../models/RentalContract");
      let rc = null;
      if (mongoose.isValidObjectId(rentalId)) {
        rc = await RentalContract.findById(rentalId).lean();
      }
      if (!rc) {
        rc = await RentalContract.findOne({ contract_code: rentalId }).lean();
      }
      if (rc) {
        rental = await Rental.findOne({
          $or: [
            { "contract.contractNumber": rc.contract_code },
            { renter: rc.renter_id, equipment: rc.equipment_id },
          ],
        });
      }
    }

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

    const userIdStr = renterUser._id ? renterUser._id.toString() : String(renterUser.User_Id || renterUser.id || "");
    const renterIdStr = rental.renter?._id?.toString() || rental.renter?.toString() || String(rental.renter?.User_Id || "");

    const isRenterMatching =
      userIdStr === renterIdStr ||
      (renterUser.User_Id && String(renterUser.User_Id) === String(rental.renter?.User_Id)) ||
      (renterUser.email && rental.renter?.email && String(renterUser.email).toLowerCase() === String(rental.renter.email).toLowerCase()) ||
      ["admin", "rentalmoderator"].includes(String(renterUser.role).toLowerCase());

    if (!isRenterMatching) {
      throw new AppError(403, "Bạn không có quyền ký hợp đồng này");
    }

    if (rental.status === "CONTRACT_SIGNED" && rental.contract?.signedAt) {
      return await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount category")
        .populate("owner", "name email phone trust_score bankInfo")
        .populate("renter", "name email phone");
    }

    const normStatus = String(rental.status).toUpperCase();
    const isOwnerDraftedOrSigned = Boolean(
      rental.contract?.ownerSigned ||
      rental.contract?.contractNumber ||
      rental.contract?.agreedToSign
    );

    if (normStatus === "PENDING") {
      if (isOwnerDraftedOrSigned) {
        rental.status = "APPROVED";
      } else {
        throw new AppError(400, "Yêu cầu thuê cần được Chủ thiết bị (Owner) phê duyệt trước khi ký hợp đồng.");
      }
    }

    const signableStatuses = [
      "APPROVED",
      "approved",
      "CONFIRMED",
      "confirmed",
      "CONTRACT_PENDING",
      "contract_pending",
      "CONTRACT_SIGNED",
      "PAYMENT_PENDING",
      "ACTIVE",
    ];
    if (!signableStatuses.includes(rental.status) && !signableStatuses.includes(normStatus)) {
      throw new AppError(400, `Hợp đồng không thể ký ở trạng thái hiện tại: ${rental.status}`);
    }

    // Contract records created by the Owner are authoritative; legacy moderator-reviewed records remain signable.
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
      if (matchingContract.status === "moderator_rejected") {
        throw new AppError(
          400,
          "Hợp đồng đang được Chủ máy (Owner) điều chỉnh. Vui lòng chờ cập nhật trước khi ký tên."
        );
      }
      const allowedContractStatuses = [
        "pending_renter_signature",
        "moderator_approved",
        "signed",
        "active",
        "approved",
        "contract_created",
        "draft",
        "pending_approval",
      ];
      const ownerHasSignedOrSent = Boolean(
        matchingContract.owner_signature?.signed ||
        rental.contract?.ownerSigned ||
        rental.contract?.contractNumber
      );
      if (!allowedContractStatuses.includes(matchingContract.status) && !ownerHasSignedOrSent) {
        throw new AppError(
          400,
          "Hợp đồng này chưa được Owner gửi cho bạn ký tên."
        );
      }
    } else if (!rental.contract?.moderatorApproved && !rental.contract?.contractNumber && !rental.contract?.ownerSigned) {
      throw new AppError(
        400,
        "Hợp đồng thuê cần được Chủ thiết bị (Owner) lập và gửi cho bạn trước khi ký tên."
      );
    }

    if (!rental.contract) {
      rental.contract = {};
    }
    const signature = renterSignature || digitalSignature || renterUser.name || "Khách thuê";
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
    if (rental.contract?.moderatorStatus === "approved") {
      rental.contract.moderatorStatus = "moderator_approved";
    }

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
      const contractQuery = matchingReq
        ? { $or: [{ request_id: matchingReq._id }, { contract_code: rental.contract?.contractNumber }] }
        : { contract_code: rental.contract?.contractNumber };

      await RentalContract.updateMany(contractQuery, {
        $set: {
          status: "signed",
          "renter_signature.signed": true,
          "renter_signature.signed_at": rental.contract.signedAt || new Date(),
          "renter_signature.signature_data": rental.contract.digitalSignature || `${signature} (RENTER_SIG_${renterUser._id}_${Date.now()})`,
          "renter_signature.signer_name": signature || renterUser.name,
        },
      });
    } catch (syncErr) {
      console.warn("Đồng bộ chữ ký sang RentalContract:", syncErr.message);
    }

    const populatedRental = await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone trust_score bankInfo")
      .populate("renter", "name email phone");

    // 1. Tự động gửi tin nhắn Chat kèm Hợp đồng đã ký sang cho Owner để 2 bên đều có bản HĐ
    try {
      const ChatMessage = require("../models/ChatMessage");
      const contractNumber = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
      await ChatMessage.create({
        rental_id: rental._id,
        sender: renterUser._id,
        receiver: rental.owner,
        message: `✍️ Khách thuê (${renterUser.name}) đã ký tên vào Hợp đồng #${contractNumber}. Hợp đồng đã có đầy đủ chữ ký điện tử của hai bên. Bạn có thể mở bản PDF để xem và lưu lại bất kỳ lúc nào!`,
        message_type: "contract",
        contract_data: {
          contract_number: contractNumber,
          equipment_title: populatedRental?.equipment?.title || "Thiết bị thuê",
          rental_id: rental._id,
          total_amount: rental.totalAmount || rental.rentalFee || 0,
          status: "CONTRACT_SIGNED",
          is_signed: true,
        },
      });
    } catch (chatErr) {
      console.warn("Lỗi gửi tin nhắn hợp đồng đã ký sang Owner:", chatErr.message);
    }

    // 2. Gửi thông báo cho Chủ máy (Owner)
    if (UserNotification && rental.owner) {
      try {
        const contractNumber = rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
        await UserNotification.create({
          user_id: rental.owner,
          title: `✍️ Khách thuê đã ký Hợp đồng #${contractNumber}!`,
          message: `Khách hàng ${renterUser.name} đã ký tên điện tử vào Hợp đồng #${contractNumber}. Hợp đồng đã được cập nhật bản PDF vào khung chat để hai bên cùng lưu giữ!`,
          related_record_id: rental._id,
        });
      } catch (notifErr) {
        console.warn("Lỗi tạo thông báo ký HĐ cho Owner:", notifErr?.message);
      }
    }

    // 3. Bắn Socket.IO realtime
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      if (io) {
        const ownerIdStr = String(rental.owner?._id || rental.owner || "");
        io.emit("contract:signed", {
          rentalId: rental._id.toString(),
          rentalCode: rental.rentalCode,
          contractNumber: rental.contract?.contractNumber || `HD-${rental.rentalCode}`,
          ownerId: ownerIdStr,
          renterId: String(renterUser._id),
          renterName: renterUser.name,
          title: "✍️ Khách thuê đã ký hợp đồng!",
          message: `Khách ${renterUser.name} đã ký Hợp đồng #${rental.contract?.contractNumber || rental.rentalCode}.`,
          link: "/owner",
        });
        io.emit("chat:message", {
          rental_id: rental._id.toString(),
          sender: String(renterUser._id),
          receiver: ownerIdStr,
          message_type: "contract",
        });
      }
    } catch (socketErr) {
      console.warn("Socket emit error on confirmContract:", socketErr?.message);
    }

    return populatedRental;
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

    const normStatus = String(rental.status).toUpperCase();
    const payableStatuses = [
      "CONTRACT_SIGNED",
      "PAYMENT_PENDING",
      "payment_pending",
      "PAYMENT_REJECTED",
      "payment_rejected",
      "contract_signed",
      "CONFIRMED",
      "confirmed",
    ];
    if (!payableStatuses.includes(rental.status) && !payableStatuses.includes(normStatus)) {
      if (normStatus === "PENDING") {
        throw new AppError(400, "Đơn thuê đang chờ Chủ thiết bị (Owner) phê duyệt, chưa thể thanh toán");
      }
      if (normStatus === "APPROVED" || normStatus === "CONTRACT_PENDING") {
        throw new AppError(400, "Bạn cần ký hợp đồng điện tử trước khi thanh toán phí thuê thiết bị");
      }
      if (normStatus === "PAYMENT_VERIFYING") {
        throw new AppError(400, "Giao dịch thanh toán của bạn đang chờ xác nhận");
      }
      throw new AppError(
        400,
        `Không thể thanh toán đơn thuê ở trạng thái: ${rental.status}`
      );
    }

    const generatedTxnId = `QR-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const finalTxnId = typeof inputTxnId === "string" && inputTxnId.trim() ? inputTxnId.trim() : (transactionId || generatedTxnId);
    const proofImg = typeof proofImage === "string" && proofImage.trim() ? proofImage : (paymentData.receiptImage || paymentData.proofImage || "");

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
      proofImage: proofImg,
      receiptImage: proofImg,
      submittedAt: new Date(),
      transferNotifiedAt: new Date(),
      amountPaid: rental.totalAmount || rental.rentalFee,
      moderatorNote: "",
    };
    rental.status = "PAYMENT_VERIFYING";

    // Cập nhật chữ ký tay điện tử nếu có gửi kèm trong payload thanh toán
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

    // Thông báo cho Owner và Quản lý web
    try {
      const User = require("../models/User");
      const notifyIds = [];
      if (rental.owner) notifyIds.push(rental.owner);

      const moderators = await User.find({
        role: { $in: ["rentalmoderator", "rental_moderator", "rental moderator", "systemadmin", "admin"] },
      })
        .select("_id")
        .lean();
      moderators.forEach((m) => notifyIds.push(m._id));

      if (UserNotification && notifyIds.length > 0) {
        await UserNotification.insertMany(
          notifyIds.map((uid) => ({
            user_id: uid,
            title: `💳 Khách thuê đã chuyển khoản đơn #${rental.rentalCode}`,
            message: `Khách thuê ${renterUser.name || ""} vừa gửi xác nhận thanh toán ${(rental.totalAmount || rental.rentalFee).toLocaleString("vi-VN")} đ cho đơn #${rental.rentalCode}. Vui lòng đối chiếu và xác nhận.`,
            related_record_id: rental._id,
          }))
        );
      }

      // Đồng bộ sang RentalContract và phát Socket.IO
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
            receipt_image: proofImg,
          },
        }
      );

      const { getIO } = require("../config/socket");
      const io = getIO();
      if (io) {
        const ownerIdStr = String(rental.owner?._id || rental.owner || "");
        io.emit("payment:submitted", {
          rentalId: rental._id.toString(),
          rentalCode: rental.rentalCode,
          amount: rental.totalAmount,
          renterName: renterUser.name,
          proofImage: proofImg,
          ownerId: ownerIdStr,
          title: "💳 KHÁCH ĐÃ CHUYỂN TIỀN!",
          message: `Khách thuê ${renterUser.name || ""} vừa gửi xác nhận thanh toán ${(rental.totalAmount || rental.rentalFee).toLocaleString("vi-VN")} đ cho đơn #${rental.rentalCode}. Vui lòng kiểm tra!`,
          link: "/owner",
        });
      }
    } catch (notifyErr) {
      console.warn("Thông báo thanh toán:", notifyErr.message);
    }

    return {
      message:
        "Đã gửi xác nhận chuyển khoản QR thành công! Vui lòng chờ kiểm tra và xác nhận thanh toán.",
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

    const populatedRental = await Rental.findById(rental._id)
      .populate("equipment", "title images dailyRate depositAmount category")
      .populate("owner", "name email phone");

    // 1. Tạo thông báo cho Chủ máy (Owner)
    if (UserNotification && populatedRental?.owner) {
      try {
        const ownerId = populatedRental.owner._id || populatedRental.owner;
        const equipTitle = populatedRental.equipment?.title || "Thiết bị";
        const schedTimeStr = returnTime ? new Date(returnTime).toLocaleString("vi-VN") : "Sớm nhất";
        await UserNotification.create({
          user_id: ownerId,
          title: "📦 Khách thuê báo trả thiết bị!",
          message: `Khách hàng ${renterUser.name} đã gửi yêu cầu trả thiết bị "${equipTitle}" (Đơn #${rental.rentalCode}). Hẹn trả: ${schedTimeStr} tại: ${returnLocation || rental.deliveryAddress || "Địa chỉ theo hợp đồng"}. Tình trạng: ${rental.returnInfo.returnCondition}`,
          related_record_id: rental._id,
        });
      } catch (notifErr) {
        console.warn("Lỗi tạo thông báo báo trả thiết bị cho Owner:", notifErr?.message);
      }
    }

    // 2. Phát Socket.IO realtime cho Owner & Hệ thống
    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      const ownerIdStr = String(populatedRental.owner?._id || populatedRental.owner || "");
      const toastData = {
        type: "rental_returned",
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        ownerId: ownerIdStr,
        renterName: renterUser.name || "Khách thuê",
        renterId: String(renterUser._id),
        equipmentTitle: populatedRental.equipment?.title || "Thiết bị",
        returnInfo: rental.returnInfo,
        title: "📦 Khách thuê báo trả thiết bị!",
        message: `Khách ${renterUser.name} vừa gửi yêu cầu trả "${populatedRental.equipment?.title || "Thiết bị"}" (Đơn #${rental.rentalCode}). Vui lòng kiểm tra và nhận lại thiết bị!`,
        link: "/owner",
        createdAt: new Date(),
      };
      io.emit("rental:returned", toastData);
      io.emit("notification:new_rental", toastData);
    } catch (socketErr) {
      console.warn("Socket emit error on requestReturn:", socketErr?.message);
    }

    // 3. Đồng bộ trạng thái sang RentalRequest nếu có
    try {
      const RentalRequest = require("../models/RentalRequest");
      await RentalRequest.updateMany(
        { request_code: rental.rentalCode },
        { $set: { status: "returned" } }
      );
    } catch (rrErr) {
      console.warn("Lỗi đồng bộ RentalRequest on requestReturn:", rrErr?.message);
    }

    return {
      message: "Yêu cầu hoàn trả thiết bị đã được gửi thành công. Chủ thiết bị sẽ tiến hành nghiệm thu.",
      rental: populatedRental,
    };
  }

  /**
   * UC_R10_CHECKIN: Xác nhận nhận máy & Lưu ảnh ngoại quan ban đầu (Handover Check-in)
   */
  async submitHandoverCheckin(rentalId, user, checkinData = {}) {
    const { images = [], note = "" } = checkinData;

    const rental = await Rental.findById(rentalId).populate("equipment owner");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const renterId = rental.renter?._id ? String(rental.renter._id) : String(rental.renter);
    const currentUserId = String(user._id || user.id);
    if (renterId !== currentUserId) {
      throw new AppError(403, "Bạn không có quyền cập nhật biên bản nhận máy cho đơn này");
    }

    rental.handoverCheckin = {
      receivedAt: new Date(),
      images: Array.isArray(images) ? images : [],
      note: String(note || "").trim(),
      confirmedByRenter: true,
    };

    if (rental.status === "PAID" || rental.status === "CONFIRMED") {
      rental.status = "ACTIVE";
    }

    await rental.save();

    // Thông báo cho Owner
    try {
      const UserNotification = require("../models/UserNotification");
      if (UserNotification) {
        await UserNotification.create({
          user_id: rental.owner?._id || rental.owner,
          title: `📸 Khách đã nhận máy & lưu ảnh ngoại quan #${rental.rentalCode}`,
          message: `Khách thuê (${user.name}) đã xác nhận nhận thiết bị "${rental.equipment?.title}" và lưu ${rental.handoverCheckin.images.length} ảnh kiểm tra ngoại quan ban đầu.`,
          related_record_id: rental._id,
        });
      }
    } catch (e) {}

    return {
      success: true,
      message: "Đã xác nhận nhận máy và lưu biên bản ảnh ngoại quan ban đầu thành công!",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate depositAmount category")
        .populate("owner", "name email phone"),
    };
  }

  /**
   * UC_R11: Review Equipment & Owner
   * Gửi đánh giá sao (1-5) và bình luận sau khi hoàn thành đơn (kèm ảnh thực tế)
   */
  async reviewRental(rentalId, renterUser, reviewData) {
    const { rating, comment, reviewImages = [] } = reviewData;

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
      reviewImages: Array.isArray(reviewImages) ? reviewImages : [],
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

    // 1. Kiểm tra xung đột lịch thuê thiết bị (chống Double Booking)
    const equipmentId = rental.equipment?._id || rental.equipment;
    const conflictResult = await checkBookingConflict({
      equipmentId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      excludeRentalId: rental._id,
      excludeReferenceCode: rental.rentalCode,
    });
    if (conflictResult.hasConflict) {
      throw new AppError(400, conflictResult.message);
    }

    // 2. Tự động khóa lịch thiết bị
    await lockEquipmentSchedule(
      equipmentId,
      rental.startDate,
      rental.endDate,
      rental.rentalCode
    );

    rental.status = "APPROVED";
    if (options.note) {
      rental.notes = `${rental.notes ? rental.notes + " | " : ""}Đã duyệt: ${options.note}`;
    }
    await rental.save();

    // Tự động gửi bản hợp đồng đầu tiên vào khung chat từ Owner sang Renter để khách coi
    try {
      const ChatMessage = require("../models/ChatMessage");
      const existingContractMsg = await ChatMessage.findOne({
        rental_id: rental._id,
        message_type: "contract",
      });

      if (!existingContractMsg && rental.owner && rental.renter) {
        const ownerId = rental.owner._id || rental.owner;
        const renterId = rental.renter._id || rental.renter;
        const contractNumber =
          rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
        const equipmentTitle = rental.equipment?.title || "Thiết bị điện tử";
        const totalAmount = rental.totalAmount || rental.rentalFee || 0;

        const autoContractMsg = new ChatMessage({
          sender: ownerId,
          receiver: renterId,
          rental_id: rental._id,
          message: `Đã gửi bản hợp đồng điện tử #${contractNumber}`,
          message_type: "contract",
          contract_data: {
            contract_number: contractNumber,
            rental_code: rental.rentalCode,
            equipment_title: equipmentTitle,
            rental_id: rental._id,
            total_amount: totalAmount,
            status: "APPROVED",
            is_signed: false,
          },
        });
        await autoContractMsg.save();

        const welcomeMsg = new ChatMessage({
          sender: ownerId,
          receiver: renterId,
          rental_id: rental._id,
          message: `Chào bạn! Tôi đã kiểm tra và phê duyệt yêu cầu thuê #${rental.rentalCode}. Hợp đồng dự thảo đã được gửi ở trên, bạn hãy xem qua điều khoản và bấm "Đồng ý ký HĐ" khi thống nhất nhé!`,
          message_type: "text",
        });
        await welcomeMsg.save();

        const { getIO } = require("../config/socket");
        const io = getIO();
        if (io) {
          io.to(`user:${renterId}`).emit("chat:new_message", autoContractMsg);
          io.to(`rental:${rental._id}`).emit("chat:new_message", autoContractMsg);
          io.to(`user:${renterId}`).emit("chat:new_message", welcomeMsg);
          io.to(`rental:${rental._id}`).emit("chat:new_message", welcomeMsg);
        }
      }
    } catch (chatErr) {
      console.warn("Auto send contract chat error on approveRental:", chatErr.message);
    }

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

    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      const toastData = {
        type: "rental_approved",
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        equipmentTitle: rental.equipment?.title || "Thiết bị",
        renterId: String(rental.renter?._id || rental.renter),
        ownerId: String(rental.owner?._id || rental.owner),
        title: "🎉 Đơn thuê đã được duyệt!",
        message: `Đơn thuê #${rental.rentalCode} cho thiết bị "${rental.equipment?.title || "thiết bị"}" đã được duyệt thành công! Bạn có thể ký hợp đồng & thanh toán ngay.`,
        link: "/rentals/history",
        createdAt: new Date(),
      };
      io.emit("rental:approved", toastData);
    } catch (socketErr) {
      console.warn("Socket emit error on approveRental:", socketErr?.message);
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
    } catch (e) { }

    return {
      message: `Đã xóa sạch toàn bộ lịch sử thuê (${delRentals.deletedCount} đơn). Bạn có thể test lại từ đầu.`,
      deletedCount: delRentals.deletedCount,
    };
  }

  async getRentalHistory(renterId, query = {}) {
    const { status, page = 1, limit = 50 } = query;

    // Tự động bảo đảm đồng bộ tất cả RentalRequest/RentalContract của renter sang bảng Rental
    try {
      const RentalRequest = require("../models/RentalRequest");
      const RentalContract = require("../models/RentalContract");
      const userRequests = await RentalRequest.find({ renter_id: renterId }).lean();
      for (const rq of userRequests) {
        const existingRental = await Rental.findOne({ rentalCode: rq.request_code });
        const ct = await RentalContract.findOne({ request_id: rq._id }).lean();
        const modApproved = ct ? ct.status === "moderator_approved" || ct.status === "signed" : false;
        const modStatus = ct ? ct.status : "pending_approval";
        const ownerSigned = ct ? Boolean(ct.owner_signature?.signed) : false;
        const renterSigned = ct ? Boolean(ct.renter_signature?.signed) : false;

        if (!existingRental) {
          await Rental.create({
            rentalCode: rq.request_code,
            renter: rq.renter_id,
            equipment: rq.equipment_id,
            owner: rq.owner_id,
            startDate: rq.start_date,
            endDate: rq.end_date,
            totalDays: rq.duration_days || 1,
            dailyRate: Math.round((rq.rental_fee || 0) / (rq.duration_days || 1)) || 0,
            rentalFee: rq.rental_fee || 0,
            depositAmount: 0,
            totalAmount: rq.rental_fee || 0,
            status: renterSigned ? "CONTRACT_SIGNED" : "APPROVED",
            contract: {
              contractNumber: ct ? ct.contract_code : undefined,
              termsAccepted: renterSigned,
              contractTerms: ct ? ct.terms_content : "",
              moderatorApproved: modApproved,
              moderatorStatus: modStatus,
              ownerSigned: ownerSigned,
            },
          });
        } else {
          // Cập nhật lại trạng thái hợp đồng mới nhất từ RentalContract
          let needsSave = false;
          if (!existingRental.contract) {
            existingRental.contract = {};
            needsSave = true;
          }
          if (ct && existingRental.contract.contractNumber !== ct.contract_code) {
            existingRental.contract.contractNumber = ct.contract_code;
            needsSave = true;
          }
          if (ct && existingRental.contract.moderatorStatus !== modStatus) {
            existingRental.contract.moderatorStatus = modStatus;
            existingRental.contract.moderatorApproved = modApproved;
            needsSave = true;
          }
          if (needsSave) {
            await existingRental.save();
          }
        }
      }
    } catch (syncErr) {
      console.warn("Auto-sync rental requests warning:", syncErr.message);
    }

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
        .populate("owner", "name email phone avatarUrl trust_score bankInfo")
        .populate("renter", "name email phone avatarUrl")
        .populate("payment.verifiedBy", "name email")
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
          r.contract.moderatorStatus = contract.status === "approved" ? "moderator_approved" : contract.status;
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
      "PAYMENT_REJECTED",
      "PAID",
      "CONFIRMED",
      "pending",
      "approved",
      "contract_pending",
      "payment_pending",
      "payment_rejected",
      "confirmed",
    ];
    if (!cancellableStatuses.includes(rental.status) && !cancellableStatuses.includes(normStatus)) {
      throw new AppError(
        400,
        `Không thể hủy đơn thuê ở trạng thái hiện tại: ${rental.status}. Chỉ có thể hủy đơn khi đang chờ duyệt, đã duyệt, hoặc trước khi nhận bàn giao thiết bị.`
      );
    }

    const isPaid =
      rental.payment?.isPaid === true ||
      rental.payment?.paymentStatus === "paid" ||
      normStatus === "PAID";

    const { bankName, accountNumber, accountName } = cancelData;
    rental.status = "CANCELLED";
    rental.cancellation = {
      cancelledBy: renterUser._id,
      reason: reason,
      cancelledAt: new Date(),
    };

    if (isPaid) {
      rental.payment.paymentStatus = "refund_pending";
      if (bankName || accountNumber || accountName) {
        rental.cancellation.refundInfo = {
          bankName: String(bankName || "").trim(),
          accountNumber: String(accountNumber || "").trim(),
          accountName: String(accountName || "").trim(),
          refundAmount: rental.totalAmount || rental.rentalFee || 0,
          status: "pending",
          note: `Khách yêu cầu hoàn tiền khi hủy đơn #${rental.rentalCode}`,
        };
      }
    }

    await rental.save();

    // Reset thiết bị về AVAILABLE và mở khóa lịch
    if (rental.equipment) {
      try {
        await Equipment.findByIdAndUpdate(rental.equipment, { status: "AVAILABLE" });
        await unlockEquipmentSchedule(rental.equipment, rental.rentalCode);
      } catch (e) { }
    }

    // Thông báo xác nhận hủy & hoàn tiền cho Renter
    if (isPaid && UserNotification) {
      try {
        await UserNotification.create({
          user_id: renterUser._id,
          title: `📝 Đã ghi nhận yêu cầu hủy đơn & hoàn tiền #${rental.rentalCode}`,
          message: `Yêu cầu hủy đơn và hoàn tiền ${(rental.totalAmount || rental.rentalFee || 0).toLocaleString("vi-VN")} đ của bạn đã được tiếp nhận. SmartEquip sẽ kiểm tra và hoàn tiền về STK ${accountNumber || "của bạn"} trong vòng 24 giờ.`,
          related_record_id: rental._id,
        });
      } catch (err) {}
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
    } catch (e) { }

    return {
      message: isPaid
        ? "Đã hủy đơn thuê thành công! Thông tin tài khoản nhận hoàn tiền của bạn đã được lưu, hệ thống sẽ hoàn tiền trong vòng 24h."
        : "Hủy đơn thuê thành công.",
      rental: await Rental.findById(rental._id)
        .populate("equipment", "title images dailyRate")
        .populate("owner", "name email"),
    };
  }

  /**
   * UC_R10_EXT: Gia hạn thời gian thuê thiết bị (Request Rental Extension)
   */
  async extendRental(rentalId, renterUser, extendData = {}) {
    const rawDays = Number(extendData?.extraDays);
    const extraDays = Number.isInteger(rawDays) && rawDays > 0 ? rawDays : 1;
    const note = (extendData?.note || "").trim();

    const rental = await Rental.findById(rentalId).populate("equipment owner");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const renterId = rental.renter?._id ? String(rental.renter._id) : String(rental.renter);
    const currentUserId = String(renterUser._id || renterUser.id);
    if (renterId !== currentUserId) {
      throw new AppError(403, "Bạn không có quyền gia hạn đơn thuê này");
    }

    const normStatus = String(rental.status).toUpperCase();
    const extendableStatuses = [
      "PAID",
      "CONFIRMED",
      "ACTIVE",
      "IN_PROGRESS",
    ];
    if (!extendableStatuses.includes(normStatus)) {
      throw new AppError(
        400,
        `Chỉ có thể gia hạn khi đơn đang trong quá trình thuê hoặc đã thanh toán (Trạng thái hiện tại: ${rental.status})`
      );
    }

    if (rental.extensionRequest?.status === "PENDING_OWNER") {
      throw new AppError(400, "Đang có yêu cầu gia hạn chờ Chủ máy phê duyệt. Vui lòng đợi phản hồi từ Chủ máy.");
    }
    if (rental.extensionRequest?.status === "APPROVED") {
      throw new AppError(400, "Chủ máy đã chấp thuận yêu cầu gia hạn trước đó. Vui lòng chuyển khoản thanh toán phụ phí để hoàn tất.");
    }

    // Tính ngày kết thúc mới
    const currentEndDate = new Date(rental.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    // Kiểm tra xem thiết bị có bị trùng lịch với đơn khác không
    const equipmentId = rental.equipment?._id || rental.equipment;
    const availCheck = await this.checkAvailability(
      equipmentId,
      currentEndDate,
      newEndDate,
      rental._id
    );

    if (!availCheck.available) {
      throw new AppError(
        400,
        `Thiết bị đã có khách khác đặt trước trong khoảng thời gian này (từ ${currentEndDate.toLocaleDateString("vi-VN")} đến ${newEndDate.toLocaleDateString("vi-VN")}). Không thể gia hạn thêm ${extraDays} ngày.`
      );
    }

    // Tính phụ phí gia hạn
    const dailyRate = rental.dailyRate || rental.equipment?.dailyRate || 0;
    const extraFee = dailyRate * extraDays;

    // Lưu thông tin yêu cầu gia hạn chờ Owner phê duyệt
    rental.extensionRequest = {
      status: "PENDING_OWNER",
      extraDays,
      extraFee,
      currentEndDate,
      newEndDate,
      note,
      requestedAt: new Date(),
    };

    await rental.save();

    // Thông báo cho Owner & Renter
    const ownerId = rental.owner?._id || rental.owner;
    try {
      const UserNotification = require("../models/UserNotification");
      if (UserNotification) {
        await UserNotification.create({
          user_id: ownerId,
          title: `⏳ Yêu cầu gia hạn đơn thuê #${rental.rentalCode}`,
          message: `Khách thuê (${renterUser.name}) gửi yêu cầu gia hạn thuê thiết bị "${rental.equipment?.title || "thiết bị"}" thêm ${extraDays} ngày (đến ngày ${newEndDate.toLocaleDateString("vi-VN")}). Phụ phí: ${extraFee.toLocaleString("vi-VN")} đ. Vui lòng xem xét phê duyệt.`,
          related_record_id: rental._id,
        });

        await UserNotification.create({
          user_id: renterUser._id,
          title: `⏳ Đã gửi yêu cầu gia hạn #${rental.rentalCode}`,
          message: `Yêu cầu gia hạn thêm ${extraDays} ngày đã được gửi tới Chủ máy. Vui lòng chờ Chủ máy phê duyệt trước khi chuyển khoản thanh toán phụ phí.`,
          related_record_id: rental._id,
        });
      }
    } catch (e) {}

    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      io.emit("rental:extension_requested", {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        ownerId: String(ownerId),
        renterId: String(renterId),
        extraDays,
        extraFee,
        newEndDate,
      });
    } catch (e) {}

    return {
      success: true,
      message: `Đã gửi yêu cầu gia hạn thêm ${extraDays} ngày tới Chủ máy! Vui lòng chờ Chủ máy phê duyệt để tiến hành thanh toán phụ phí.`,
      rental,
    };
  }

  /**
   * Owner phê duyệt yêu cầu gia hạn thuê
   */
  async approveExtension(rentalId, ownerUser) {
    const rental = await Rental.findById(rentalId).populate("equipment owner renter");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const ownerId = rental.owner?._id ? String(rental.owner._id) : String(rental.owner);
    const currentUserId = String(ownerUser._id || ownerUser.id);
    if (ownerId !== currentUserId && ownerUser.role !== "admin") {
      throw new AppError(403, "Bạn không có quyền phê duyệt gia hạn cho đơn thuê này");
    }

    if (rental.extensionRequest?.status !== "PENDING_OWNER") {
      throw new AppError(400, "Đơn thuê không có yêu cầu gia hạn nào đang chờ duyệt");
    }

    // Kiểm tra lại tính khả dụng
    const equipmentId = rental.equipment?._id || rental.equipment;
    const availCheck = await this.checkAvailability(
      equipmentId,
      new Date(rental.extensionRequest.currentEndDate || rental.endDate),
      new Date(rental.extensionRequest.newEndDate),
      rental._id
    );
    if (!availCheck.available) {
      throw new AppError(400, "Thiết bị đã bị trùng lịch với khách khác, không thể duyệt gia hạn.");
    }

    rental.extensionRequest.status = "APPROVED";
    rental.extensionRequest.approvedAt = new Date();
    await rental.save();

    const renterId = rental.renter?._id || rental.renter;
    const extraFee = rental.extensionRequest.extraFee;
    const extraDays = rental.extensionRequest.extraDays;

    try {
      const UserNotification = require("../models/UserNotification");
      if (UserNotification) {
        await UserNotification.create({
          user_id: renterId,
          title: `✅ Chủ máy đã đồng ý gia hạn #${rental.rentalCode}`,
          message: `Chủ máy đã chấp thuận gia hạn thêm ${extraDays} ngày. Vui lòng quét mã VietQR PayOS chuyển khoản phụ phí ${extraFee.toLocaleString("vi-VN")} đ để hoàn tất gia hạn đơn thuê.`,
          related_record_id: rental._id,
        });
      }
    } catch (nErr) {}

    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      io.emit("rental:extension_approved", {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        ownerId: String(ownerId),
        renterId: String(renterId),
        extraDays,
        extraFee,
      });
    } catch (sErr) {}

    return {
      success: true,
      message: `Đã phê duyệt gia hạn thêm ${extraDays} ngày! Người thuê sẽ thanh toán phụ phí để hoàn tất.`,
      rental,
    };
  }

  /**
   * Owner từ chối yêu cầu gia hạn thuê
   */
  async rejectExtension(rentalId, ownerUser, reason = "") {
    const rental = await Rental.findById(rentalId).populate("equipment owner renter");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    const ownerId = rental.owner?._id ? String(rental.owner._id) : String(rental.owner);
    const currentUserId = String(ownerUser._id || ownerUser.id);
    if (ownerId !== currentUserId && ownerUser.role !== "admin") {
      throw new AppError(403, "Bạn không có quyền từ chối gia hạn cho đơn thuê này");
    }

    if (rental.extensionRequest?.status !== "PENDING_OWNER") {
      throw new AppError(400, "Đơn thuê không có yêu cầu gia hạn nào đang chờ duyệt");
    }

    rental.extensionRequest.status = "REJECTED";
    rental.extensionRequest.rejectedAt = new Date();
    rental.extensionRequest.rejectionReason = (reason || "Chủ máy không thể gia hạn vào thời gian này.").trim();
    await rental.save();

    const renterId = rental.renter?._id || rental.renter;
    try {
      const UserNotification = require("../models/UserNotification");
      if (UserNotification) {
        await UserNotification.create({
          user_id: renterId,
          title: `✕ Yêu cầu gia hạn bị từ chối #${rental.rentalCode}`,
          message: `Chủ máy đã từ chối yêu cầu gia hạn: "${rental.extensionRequest.rejectionReason}". Vui lòng hoàn trả thiết bị đúng hạn ban đầu.`,
          related_record_id: rental._id,
        });
      }
    } catch (nErr) {}

    try {
      const { getIO } = require("../config/socket");
      const io = getIO();
      io.emit("rental:extension_rejected", {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        ownerId: String(ownerId),
        renterId: String(renterId),
        reason: rental.extensionRequest.rejectionReason,
      });
    } catch (sErr) {}

    return {
      success: true,
      message: "Đã từ chối yêu cầu gia hạn đơn thuê.",
      rental,
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

    // Kiểm tra xung đột lịch thuê thiết bị (chống Double Booking)
    const equipmentId = rental.equipment?._id || rental.equipment;
    const conflictResult = await checkBookingConflict({
      equipmentId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      excludeRentalId: rental._id,
      excludeReferenceCode: rental.rentalCode,
    });
    if (conflictResult.hasConflict) {
      throw new AppError(400, conflictResult.message);
    }

    // Tự động khóa lịch thiết bị
    await lockEquipmentSchedule(
      equipmentId,
      rental.startDate,
      rental.endDate,
      rental.rentalCode
    );

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
