const userService = require("../services/userService");

class UserController {
  /**
   * UC_R02: GET /api/user/profile
   */
  async getProfile(req, res) {
    const profile = await userService.getProfile(req.user._id);
    res.status(200).json({
      success: true,
      user: profile,
    });
  }

  /**
   * UC_R02: PUT /api/user/profile
   */
  async updateProfile(req, res) {
    const updated = await userService.updateProfile(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: "Hồ sơ cá nhân đã được cập nhật thành công",
      user: updated,
    });
  }

  /**
   * UC_R03: POST /api/user/kyc
   */
  async submitKyc(req, res) {
    const profile = await userService.submitKyc(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: "Hồ sơ KYC đã được gửi thành công và đang chờ xét duyệt",
      user: profile,
    });
  }
}

module.exports = new UserController();
