const equipmentService = require("../services/equipmentService");

class EquipmentController {
  /**
   * UC_G02, UC_R04, UC_R05: GET /api/equipment
   */
  async searchEquipment(req, res) {
    const result = await equipmentService.searchEquipment(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      data: result.equipments,
      pagination: result.pagination,
    });
  }

  /**
   * UC_G03, UC_R06: GET /api/equipment/:id
   */
  async getEquipmentById(req, res) {
    const equipment = await equipmentService.getEquipmentById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Lấy chi tiết thiết bị thành công",
      data: equipment,
    });
  }

  /**
   * AI-powered Product Filter & Assistant: POST /api/equipment/ai-filter
   */
  async aiFilterEquipment(req, res) {
    const result = await equipmentService.aiFilterEquipment(req.body);
    res.status(200).json({
      success: true,
      message: "AI lọc thiết bị thành công",
      data: result.equipments,
      aiAdvice: result.aiAdvice,
      purpose: result.purpose,
      tags: result.tags,
      suggestedAddons: result.suggestedAddons,
      detectedCriteria: result.detectedCriteria,
    });
  }
}

module.exports = new EquipmentController();
