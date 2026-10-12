const rentalService = require("../services/rentalService");

class RentalController {
  /**
   * UC_R07: POST /api/rentals/request (Tạo yêu cầu thuê & check availability)
   */
  async createRentalRequest(req, res) {
    const rental = await rentalService.createRentalRequest(req.user, req.body);
    res.status(201).json({
      success: true,
      message: "Yêu cầu thuê đã được tạo thành công. Vui lòng ký hợp đồng để tiếp tục.",
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
      message: "Ký hợp đồng điện tử thành công. Vui lòng thanh toán tiền thuê và tiền cọc.",
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
  async getRentalHistory(req, res) {
    const result = await rentalService.getRentalHistory(req.user._id, req.query);
    res.status(200).json({
      success: true,
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
}

module.exports = new RentalController();
