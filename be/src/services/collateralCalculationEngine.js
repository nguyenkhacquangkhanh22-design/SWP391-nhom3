/**
 * Flexible Collateral Calculation Engine
 * Offers 3 realistic deposit tiers:
 * 1. Tier 1: 100% Cash / Bank Transfer deposit (Standard, quick return in 2h)
 * 2. Tier 2: Valid Chip ID Card + Driver's License (Reduces cash deposit to only 25%)
 * 3. Tier 3: Collateral Asset (MacBook / Motorbike with vehicle registration - 0% cash deposit)
 */

const COLLATERAL_OPTIONS = {
  FULL_CASH: {
    id: "full_cash",
    name: "Cọc 100% Tiền Mặt / Chuyển Khoản",
    cashDepositPercentage: 1.0,
    requiredDocuments: ["Căn cước công dân đối chiếu"],
    processingTime: "Duyệt ngay lập tức (Dưới 5 phút)",
    description: "Khách cọc đủ tiền mặt hoặc chuyển khoản. Hoàn trả lại 100% vào tài khoản sau 2 giờ trả máy.",
    recommendedFor: "Khách vãng lai, công ty cần xuất hóa đơn, hoặc người không muốn giữ giấy tờ gốc.",
    riskLevel: "Thấp nhất",
  },
  CHIP_ID_AND_LICENSE: {
    id: "chip_id_license",
    name: "Cọc CCCD Gắn Chip + Bằng Lái Xe (Giảm 75% Tiền Cọc)",
    cashDepositPercentage: 0.25,
    requiredDocuments: [
      "Bản gốc CCCD gắn chip chính chủ (Giữ tại kho)",
      "Bản gốc Giấy phép lái xe (GPLX A1/A2/B2)",
      "Số điện thoại Zalo chính chủ xác thực",
    ],
    processingTime: "Xác thực 10 phút qua ứng dụng VNeID",
    description: "Giữ 1 bản gốc CCCD gắn chip và GPLX trong thời gian thuê máy. Tiền mặt cọc chỉ còn 25% giá trị máy.",
    recommendedFor: "Nhiếp ảnh gia tự do, sinh viên, người sáng tạo nội dung cá nhân tại khu vực lân cận.",
    riskLevel: "Trung bình",
  },
  ASSET_PLEDGE: {
    id: "asset_pledge",
    name: "Cọc Tài Sản Thế Chấp Tương Đương (0% Tiền Mặt)",
    cashDepositPercentage: 0.0,
    requiredDocuments: [
      "Laptop (MacBook Pro/Air hoặc Dell XPS) kèm sạc và mật khẩu mở máy",
      "HOẶC Xe máy chính chủ kèm Cà vẹt gốc (giữ tại bãi xe SmartEquip)",
      "Biên bản niêm phong tài sản có dán tem bảo mật 2 bên ký tên",
    ],
    processingTime: "Kiểm tra ngoại quan và dán tem niêm phong 15 phút",
    description: "Thế chấp tài sản có giá trị tương đương hoặc cao hơn máy thuê. Hoàn toàn không cần ứng trước tiền mặt.",
    recommendedFor: "Khách quay dự án gấp, chưa kịp gom đủ tiền mặt cọc, có phương tiện cá nhân đảm bảo.",
    riskLevel: "Bảo đảm bằng hiện vật",
  },
};

/**
 * Calculate deposit amounts for a given equipment market value
 * @param {number} equipmentMarketValue (Estimated retail value of the equipment in VND)
 * @param {string} selectedOptionId ('full_cash' | 'chip_id_license' | 'asset_pledge')
 */
function calculateDepositDetails(equipmentMarketValue = 25000000, selectedOptionId = "chip_id_license") {
  const value = Math.max(1000000, Number(equipmentMarketValue) || 25000000);
  const option = COLLATERAL_OPTIONS[Object.keys(COLLATERAL_OPTIONS).find(
    (k) => COLLATERAL_OPTIONS[k].id === selectedOptionId
  )] || COLLATERAL_OPTIONS.CHIP_ID_AND_LICENSE;

  const cashDepositRequired = Math.round(value * option.cashDepositPercentage);
  const cashSaved = value - cashDepositRequired;

  return {
    equipmentMarketValue: value,
    selectedOption: option,
    cashDepositRequired,
    cashSaved,
    requiredDocuments: option.requiredDocuments,
    processingTime: option.processingTime,
    allOptions: Object.values(COLLATERAL_OPTIONS).map((opt) => ({
      id: opt.id,
      name: opt.name,
      cashDepositRequired: Math.round(value * opt.cashDepositPercentage),
      percentage: opt.cashDepositPercentage * 100,
      description: opt.description,
      requiredDocuments: opt.requiredDocuments,
      recommendedFor: opt.recommendedFor,
    })),
  };
}

module.exports = {
  COLLATERAL_OPTIONS,
  calculateDepositDetails,
};
