const rentalService = require("../services/rentalService");

class RentalController {
  /**
   * POST /api/rentals/:id/agree-contract (Đồng ý thỏa thuận điều khoản hợp đồng)
   */
  async agreeContract(req, res) {
    const rental = await rentalService.agreeContract(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: "Đã xác nhận thỏa thuận điều khoản hợp đồng! Bạn có thể tiến hành Ký hợp đồng & Thanh toán.",
      data: rental,
    });
  }
  /**
   * UC_R07: POST /api/rentals/request (Tạo yêu cầu thuê & check availability)
   */
  async createRentalRequest(req, res) {
    const rental = await rentalService.createRentalRequest(req.user, req.body);
    res.status(201).json({
      success: true,
      message: "Yêu cầu thuê đã được gửi thành công. Vui lòng chờ Chủ thiết bị (Owner) phê duyệt trước khi ký hợp đồng và thanh toán.",
      data: rental,
    });
  }

  /**
   * UC_R08: POST /api/rentals/:id/confirm-contract (Ký hợp đồng điện tử)
   */
  async confirmContract(req, res) {
    const rental = await rentalService.confirmContract(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: "Ký hợp đồng điện tử thành công. Vui lòng quét mã QR để thanh toán phí thuê thiết bị.",
      data: rental,
    });
  }

  /**
   * UC_R09: POST /api/rentals/:id/pay (Thanh toán tiền thuê & tiền cọc)
   */
  async payRental(req, res) {
    const result = await rentalService.payRental(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R10_CHECKIN: POST /api/rentals/:id/handover-checkin (Lưu ảnh ngoại quan lúc nhận máy)
   */
  async submitHandoverCheckin(req, res) {
    const result = await rentalService.submitHandoverCheckin(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R10: POST /api/rentals/:id/return (Yêu cầu trả thiết bị)
   */
  async requestReturn(req, res) {
    const result = await rentalService.requestReturn(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R11: POST /api/rentals/:id/review (Đánh giá thiết bị & Owner)
   */
  async reviewRental(req, res) {
    const result = await rentalService.reviewRental(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R12: GET /api/rentals/history (Lịch sử yêu cầu thuê & hợp đồng)
   */

  /**
   * POST /api/rentals/reset-history (Xóa toàn bộ lịch sử thuê của Renter)
   */
  async resetRentalHistory(req, res) {
    const result = await rentalService.resetRentalHistory(req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  async getRentalHistory(req, res) {
    const result = await rentalService.getRentalHistory(req.user._id, req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch sử thuê thành công",
      data: result.rentals,
      pagination: result.pagination,
    });
  }

  /**
   * UC_R13: POST /api/rentals/:id/cancel (Hủy yêu cầu thuê kèm lý do)
   */
  async cancelRental(req, res) {
    const result = await rentalService.cancelRental(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R10_EXT: POST /api/rentals/:id/extend (Gia hạn thời gian thuê)
   */
  async extendRental(req, res) {
    const result = await rentalService.extendRental(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R14: POST /api/rentals/:id/dispute (Gửi khiếu nại đơn thuê)
   */
  async submitDispute(req, res) {
    const result = await rentalService.submitDispute(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.rental,
    });
  }

  /**
   * UC_R15: POST /api/support/ticket (Gửi ticket hỗ trợ)
   */
  async createSupportTicket(req, res) {
    const result = await rentalService.createSupportTicket(req.user, req.body);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.ticket,
    });
  }

  /**
   * Phê duyệt đơn thuê (Owner / Moderator / Dev Test)
   * POST /api/rentals/:id/approve
   */
  async approveRental(req, res) {
    const rental = await rentalService.approveRental(req.params.id, req.user, req.body);
    res.status(200).json({
      success: true,
      message: "Đơn thuê đã được phê duyệt thành công. Khách thuê có thể ký hợp đồng.",
      data: rental,
    });
  }

  /**
   * Owner từ chối yêu cầu thuê
   */
  async rejectRental(req, res) {
    const rental = await rentalService.rejectRental(req.params.id, req.user, req.body.reason);
    res.status(200).json({
      success: true,
      message: "Từ chối yêu cầu thuê thành công.",
      data: rental,
    });
  }

  async getContractHtml(req, res) {
    const html = await rentalService.getContractHtml(req.params.id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }

  /**
   * UC_R15_EXTEND: POST /api/rentals/:id/extend-request (Khách gửi đề xuất gia hạn)
   */
  async requestRentalExtension(req, res) {
    const { new_end_date, extraDays, reason } = req.body;
    const rentalId = req.params.id;

    const rental = await Rental.findById(rentalId).populate("equipment");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== req.user._id.toString()) {
      throw new AppError(403, "Bạn không có quyền yêu cầu gia hạn đơn thuê này");
    }

    const currentEnd = new Date(rental.endDate);
    let newEnd = new_end_date ? new Date(new_end_date) : null;
    let days = Number(extraDays) || 1;

    if (!newEnd) {
      newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + days);
    } else {
      const diffMs = newEnd.getTime() - currentEnd.getTime();
      days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    if (newEnd <= currentEnd) {
      throw new AppError(400, "Ngày kết thúc mới phải sau ngày trả hiện tại");
    }

    const dailyRate = rental.dailyRate || rental.equipment?.dailyRate || 0;
    const extraFee = days * dailyRate;

    rental.extension_request = {
      requested_end_date: newEnd,
      extra_days: days,
      extra_fee: extraFee,
      renter_reason: reason || "Đoàn phim phát sinh thêm ngày quay",
      status: "PENDING",
      requested_at: new Date(),
    };

    await rental.save();

    res.json({
      success: true,
      message: `Đã gửi đề xuất gia hạn thêm ${days} ngày tới Chủ máy thành công`,
      rental,
    });
  }

  /**
   * UC_O15_EXTEND: POST /api/rentals/:id/respond-extension (Owner duyệt đề xuất)
   */
  async respondRentalExtension(req, res) {
    const { action } = req.body; // "APPROVED" or "REJECTED"
    const rentalId = req.params.id;

    const rental = await Rental.findById(rentalId).populate("equipment");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.owner.toString() !== req.user._id.toString()) {
      throw new AppError(403, "Chỉ Chủ máy mới có quyền duyệt gia hạn");
    }

    if (!rental.extension_request || rental.extension_request.status !== "PENDING") {
      throw new AppError(400, "Không có yêu cầu gia hạn đang chờ xử lý");
    }

    if (action === "APPROVED") {
      rental.extension_request.status = "APPROVED";
      rental.extension_request.responded_at = new Date();
      rental.endDate = rental.extension_request.requested_end_date;
      rental.totalDays = (rental.totalDays || 0) + (rental.extension_request.extra_days || 0);
      rental.totalAmount = (rental.totalAmount || 0) + (rental.extension_request.extra_fee || 0);
      rental.rentalFee = (rental.rentalFee || 0) + (rental.extension_request.extra_fee || 0);
    } else {
      rental.extension_request.status = "REJECTED";
      rental.extension_request.responded_at = new Date();
    }

    await rental.save();

    res.json({
      success: true,
      message: action === "APPROVED" ? "Đã chấp thuận gia hạn hợp đồng" : "Đã từ chối gia hạn",
      rental,
    });
  }

  /**
   * UC_R17_SOS: POST /api/rentals/:id/emergency-sos (Cứu hộ kỹ thuật khẩn cấp)
   */
  async submitEmergencySOS(req, res) {
    const { issue_type, description, contact_phone } = req.body;
    const rentalId = req.params.id;

    const rental = await Rental.findById(rentalId).populate("equipment owner");
    if (!rental) {
      throw new AppError(404, "Không tìm thấy đơn thuê");
    }

    if (rental.renter.toString() !== req.user._id.toString()) {
      throw new AppError(403, "Bạn không có quyền gửi cảnh báo SOS cho đơn thuê này");
    }

    const ownerId = rental.owner?._id || rental.owner;
    const issueLabels = {
      overheat: "Nóng máy / Quá nhiệt cảm biến (Overheat)",
      lens_jam: "Kẹt ngàm / Lỗi chống rung Lens",
      card_error: "Lỗi ghi thẻ nhớ / Mất dữ liệu",
      battery_drain: "Sụt nguồn / Chai pin đột ngột",
      other: "Sự cố kỹ thuật hiện trường khác",
    };

    const label = issueLabels[issue_type] || issue_type || "Sự cố kỹ thuật";

    const UserNotification = require("../models/UserNotification");
    if (UserNotification) {
      await UserNotification.create({
        user_id: ownerId,
        title: `🚨 SOS KHẨN CẤP: Thiết bị gặp sự cố tại phim trường #${rental.rentalCode}`,
        message: `Khách thuê (${req.user.name} - SĐT: ${contact_phone || req.user.phone || "Chưa có"}) báo sự cố: "${label}". Mô tả: "${description || "Cần hỗ trợ gấp"}". Vui lòng liên hệ hỗ trợ ngay!`,
        related_record_id: rental._id,
      });
    }

    try {
      const { getIO } = require("../config/socket");
      getIO().emit("emergency:sos", {
        rentalId: rental._id,
        rentalCode: rental.rentalCode,
        ownerId: ownerId,
        renterName: req.user.name,
        phone: contact_phone || req.user.phone,
        issue: label,
        description,
      });
    } catch (e) {}

    res.json({
      success: true,
      message: "Đã phát tín hiệu SOS khẩn cấp tới Chủ máy thành công. Chủ máy đã nhận được cảnh báo!",
    });
  }
}

module.exports = new RentalController();
