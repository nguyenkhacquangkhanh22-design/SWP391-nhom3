const equipmentService = require("../services/equipmentService");

class EquipmentController {
  /**
   * UC_G02, UC_R04, UC_R05: GET /api/equipment
   */
  async searchEquipment(req, res) {
    const result = await equipmentService.searchEquipment(req.query);
    res.status(200).json({
      success: true,
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
      data: equipment,
    });
  }
}

module.exports = new EquipmentController();
