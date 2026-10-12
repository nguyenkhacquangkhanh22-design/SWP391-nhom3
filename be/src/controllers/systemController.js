const systemService = require("../services/systemService");

class SystemController {
  /**
   * UC_G01: GET /api/system/info
   */
  async getSystemInfo(_req, res) {
    const data = await systemService.getSystemInfo();
    res.status(200).json({
      success: true,
      data,
    });
  }
}

module.exports = new SystemController();
