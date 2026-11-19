/**
 * Equipment Side-by-Side Comparison Engine
 * Compares 2 to 3 cameras or lenses on critical real-world rental criteria:
 * - Sensor & Megapixels
 * - Max Video Spec (4K 60fps 10-bit 4:2:2, Slow-motion)
 * - Image Stabilization (IBIS stops)
 * - Card Slots & Battery Life
 * - Rental Price / Day & Required Deposit
 * - Weight & Mount Ecosystem
 */

const CAMERA_SPECS_DATABASE = {
  "sony-a7-iv": {
    id: "sony-a7-iv",
    name: "Sony Alpha 7 IV (A7M4)",
    brand: "Sony",
    category: "camera",
    mount: "Sony E-mount",
    sensor: "33.0 MP Full-Frame Exmor R BSI CMOS",
    video: "4K 60p (Super35 10-bit 4:2:2), 4K 30p 7K oversampled",
    ibis: "5.5 stops 5-axis IBIS",
    iso: "100 - 51,200 (Mở rộng 50 - 204,800)",
    cardSlots: "2 khe (1x CFexpress Type A / SD UHS-II + 1x SD UHS-II)",
    weight: "658g",
    batteryLife: "Khoảng 580 ảnh / 100 phút quay (Pin NP-FZ100)",
    dailyRate: 350000,
    depositCash: 35000000,
    chipDepositCash: 8750000,
    rating: 4.9,
    reviewCount: 142,
    strengths: ["Lấy nét mắt chim/thú tự động cực nhạy", "Màu da S-Cinetone nịnh mắt", "Hệ sinh thái ống kính phong phú nhất"],
    bestFor: "Chụp tiệc, sự kiện, quay TVC và sáng tạo YouTube/TikTok",
  },
  "canon-eos-r6-ii": {
    id: "canon-eos-r6-ii",
    name: "Canon EOS R6 Mark II",
    brand: "Canon",
    category: "camera",
    mount: "Canon RF-mount",
    sensor: "24.2 MP Full-Frame CMOS",
    video: "4K 60p không crop 6K oversampled, FHD 180p",
    ibis: "Lên tới 8.0 stops IBIS (với lens IS)",
    iso: "100 - 102,400 (Mở rộng 50 - 204,800)",
    cardSlots: "2 khe SD UHS-II",
    weight: "670g",
    batteryLife: "Khoảng 580 ảnh (Pin LP-E6NH)",
    dailyRate: 360000,
    depositCash: 36000000,
    chipDepositCash: 9000000,
    rating: 4.8,
    reviewCount: 98,
    strengths: ["Chống rung 8 stop quay cầm tay không rung", "Chụp liên tiếp 40fps màn trập điện tử", "Quay 4K 60p không bị crop góc"],
    bestFor: "Thể thao, chim muông, đám cưới phóng sự và MV ca nhạc",
  },
  "fujifilm-x-t5": {
    id: "fujifilm-x-t5",
    name: "Fujifilm X-T5",
    brand: "Fujifilm",
    category: "camera",
    mount: "Fujifilm X-mount",
    sensor: "40.2 MP APS-C X-Trans CMOS 5 HR",
    video: "6.2K 30p, 4K 60p 10-bit 4:2:2 F-Log2",
    ibis: "7.0 stops 5-axis IBIS",
    iso: "125 - 12,800 (Mở rộng 64 - 51,200)",
    cardSlots: "2 khe SD UHS-II",
    weight: "557g",
    batteryLife: "Khoảng 740 ảnh (Pin NP-W235)",
    dailyRate: 280000,
    depositCash: 28000000,
    chipDepositCash: 7000000,
    rating: 4.9,
    reviewCount: 115,
    strengths: ["Giả lập màu film huyền thoại (Classic Chrome, Nostalgic Neg)", "Độ phân giải 40MP cực nét", "Body hoài cổ, nhỏ gọn dễ mang đi du lịch"],
    bestFor: "Chụp đường phố, chân dung nghệ thuật, du lịch và lookbook thời trang",
  },
  "sony-fx3": {
    id: "sony-fx3",
    name: "Sony FX3 Cinema Line",
    brand: "Sony",
    category: "cinema",
    mount: "Sony E-mount",
    sensor: "12.1 MP Full-Frame Exmor R (Dual Base ISO 800/12800)",
    video: "4K 120p All-Intra 10-bit 4:2:2, 16-bit RAW output",
    ibis: "5.5 stops Active Mode + Quạt tản nhiệt tích hợp",
    iso: "80 - 102,400 (Dual Native ISO khử nhiễu bóng tối)",
    cardSlots: "2 khe CFexpress Type A / SD UHS-II",
    weight: "715g (Có tay cầm XLR Audio)",
    batteryLife: "Khoảng 135 phút quay liên tục",
    dailyRate: 650000,
    depositCash: 75000000,
    chipDepositCash: 18750000,
    rating: 5.0,
    reviewCount: 64,
    strengths: ["Quay đêm ISO 12800 mịn như mắt thường", "Quạt làm mát quay cả ngày không lo quá nhiệt", "Cụm tay cầm XLR âm thanh chuyên nghiệp"],
    bestFor: "Làm phim ngắn, phim tài liệu, MV và TVC quảng cáo cao cấp",
  },
};

/**
 * Generate side-by-side comparison matrix for an array of equipment IDs
 */
function compareEquipments(equipmentIds = ["sony-a7-iv", "canon-eos-r6-ii"]) {
  const ids = Array.isArray(equipmentIds) ? equipmentIds : [equipmentIds];
  const items = ids
    .map((id) => CAMERA_SPECS_DATABASE[id])
    .filter(Boolean);

  if (items.length === 0) {
    // Default to comparing the two most popular
    return [CAMERA_SPECS_DATABASE["sony-a7-iv"], CAMERA_SPECS_DATABASE["canon-eos-r6-ii"]];
  }

  return items;
}

module.exports = {
  CAMERA_SPECS_DATABASE,
  compareEquipments,
};
