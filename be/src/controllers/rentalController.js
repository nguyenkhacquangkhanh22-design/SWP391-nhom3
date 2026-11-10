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
}

module.exports = new RentalController();
