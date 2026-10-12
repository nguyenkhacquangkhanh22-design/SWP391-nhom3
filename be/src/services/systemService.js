const Equipment = require("../models/Equipment");

class SystemService {
  /**
   * UC_G01: Lấy thông tin hệ thống, trang chủ & giới thiệu SmartEquip
   */
  async getSystemInfo() {
    const totalEquipment = await Equipment.countDocuments({
      status: { $in: ["APPROVED", "AVAILABLE"] },
    });

    return {
      platform: {
        name: "SmartEquip",
        tagline: "Nền tảng chia sẻ & cho thuê thiết bị thông minh và tin cậy",
        version: "1.0.0",
        description:
          "SmartEquip kết nối người sở hữu thiết bị điện tử, công nghệ, quay chụp, máy móc với những người có nhu cầu thuê trong thời gian ngắn với quy trình hợp đồng điện tử và bảo hiểm cọc an toàn.",
      },
      stats: {
        availableEquipments: totalEquipment,
        supportedCategories: [
          "Máy ảnh & Quay phim",
          "Laptop & Công nghệ",
          "Âm thanh & Ánh sáng",
          "Thiết bị đo lường & Cơ khí",
          "Flycam & Drone",
        ],
        protectionPolicies: [
          "Hợp đồng thuê điện tử minh bạch",
          "Quy trình xác thực danh tính KYC chống gian lận",
          "Ký quỹ và bảo đảm cọc an toàn",
        ],
      },
      contact: {
        email: "support@smartequip.vn",
        hotline: "1900 8888",
        workingHours: "8:00 - 20:00 (Thứ 2 - Chủ Nhật)",
      },
    };
  }
}

module.exports = new SystemService();
