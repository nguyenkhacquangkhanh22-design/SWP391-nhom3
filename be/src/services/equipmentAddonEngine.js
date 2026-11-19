/**
 * Equipment Add-on & Accessory Matching Engine
 * Recommends compatible lenses, memory cards, extra batteries, and gimbals
 * Calculates 10% - 15% bundle discount when rented with camera body.
 */

const DEFAULT_ADDONS = [
  {
    _id: "addon_sd_128",
    name: "Thẻ nhớ SanDisk Extreme Pro 128GB V60 (4K 120fps)",
    category: "storage",
    compatibleMounts: ["Universal"],
    compatibleBrands: ["Universal"],
    dailyRate: 50000,
    bundleDiscountRate: 0.15,
    depositAmount: 300000,
    inStock: 12,
    specification: "Đọc 280MB/s, Ghi 150MB/s, chuẩn U3 V60 quay 4K mượt mà",
    imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Cần thiết cho máy quay 4K chất lượng cao, không lo tràn bộ nhớ",
  },
  {
    _id: "addon_sd_256",
    name: "Thẻ nhớ SanDisk Extreme Pro 256GB V90 (All-Intra / Cinema)",
    category: "storage",
    compatibleMounts: ["Universal"],
    compatibleBrands: ["Universal"],
    dailyRate: 90000,
    bundleDiscountRate: 0.15,
    depositAmount: 600000,
    inStock: 8,
    specification: "Đọc 300MB/s, Ghi 260MB/s chuẩn V90 quay All-Intra 10-bit",
    imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Dành cho quay tốc độ cao 120fps không bao giờ bị nghẽn buffer",
  },
  {
    _id: "addon_bat_sony_fz100",
    name: "Bộ 2 Pin Sony NP-FZ100 + Dock Sạc Đôi LCD",
    category: "battery",
    compatibleMounts: ["Sony E"],
    compatibleBrands: ["Sony"],
    dailyRate: 70000,
    bundleDiscountRate: 0.15,
    depositAmount: 800000,
    inStock: 15,
    specification: "2x 2280mAh, quay liên tục thêm 4-5 tiếng, dock sạc hiển thị % pin",
    imageUrl: "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Bắt buộc phải có cho buổi quay sự kiện hoặc ngoài trời cả ngày",
  },
  {
    _id: "addon_bat_canon_lpe6nh",
    name: "Bộ 2 Pin Canon LP-E6NH + Sạc Đôi Nhanh",
    category: "battery",
    compatibleMounts: ["Canon RF", "Canon EF"],
    compatibleBrands: ["Canon"],
    dailyRate: 70000,
    bundleDiscountRate: 0.15,
    depositAmount: 800000,
    inStock: 10,
    specification: "2x 2130mAh tương thích R5, R6, R6 II, R7, dock sạc Type-C",
    imageUrl: "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Đảm bảo máy hoạt động liên tục không bị gián đoạn",
  },
  {
    _id: "addon_lens_sony_2470gm",
    name: "Ống kính Sony FE 24-70mm f/2.8 GM II",
    category: "lens",
    compatibleMounts: ["Sony E"],
    compatibleBrands: ["Sony"],
    dailyRate: 250000,
    bundleDiscountRate: 0.15,
    depositAmount: 5000000,
    inStock: 4,
    specification: "Tiêu cự đa dụng 24-70mm, khẩu lớn f/2.8 toàn dải, chống bụi ẩm",
    imageUrl: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Ống kính chụp tiệc, kỷ yếu, sự kiện & phỏng vấn đa năng nhất",
  },
  {
    _id: "addon_lens_canon_2470rf",
    name: "Ống kính Canon RF 24-70mm f/2.8 L IS USM",
    category: "lens",
    compatibleMounts: ["Canon RF"],
    compatibleBrands: ["Canon"],
    dailyRate: 260000,
    bundleDiscountRate: 0.15,
    depositAmount: 5000000,
    inStock: 3,
    specification: "Chống rung IS 5 stop, thấu kính Nano USM lấy nét siêu êm",
    imageUrl: "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Chuẩn mực dòng L cho các nhà sáng tạo nội dung và làm phim",
  },
  {
    _id: "addon_gimbal_rs3pro",
    name: "Gimbal Chống Rung DJI RS 3 Pro Combo",
    category: "stabilizer",
    compatibleMounts: ["Universal"],
    compatibleBrands: ["Universal"],
    dailyRate: 180000,
    bundleDiscountRate: 0.15,
    depositAmount: 3000000,
    inStock: 6,
    specification: "Tải trọng 4.5kg, cánh tay trục carbon, motor Focus và bộ phát truyền hình",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Cảnh quay chuyển động mượt như rạp phim, chống rung hoàn hảo",
  },
  {
    _id: "addon_tripod_benro",
    name: "Chân Máy Quay Benro KH25P Video Tripod Đầu Dầu",
    category: "tripod",
    compatibleMounts: ["Universal"],
    compatibleBrands: ["Universal"],
    dailyRate: 60000,
    bundleDiscountRate: 0.15,
    depositAmount: 800000,
    inStock: 10,
    specification: "Đầu dầu Pan/Tilt êm ái, tải trọng 5kg, chiều cao tối đa 1.56m",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Cố định góc máy phỏng vấn, quay livestream chuẩn xác không rung",
  },
  {
    _id: "addon_mic_dji_mic2",
    name: "Bộ Micro Thu Âm Không Dây DJI Mic 2 (2 TX + 1 RX)",
    category: "audio",
    compatibleMounts: ["Universal"],
    compatibleBrands: ["Universal"],
    dailyRate: 120000,
    bundleDiscountRate: 0.15,
    depositAmount: 1500000,
    inStock: 8,
    specification: "Ghi âm 32-bit Float nội bộ chống vỡ tiếng, khử ồn thông minh, cự ly 250m",
    imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
    recommendedReason: "Thu âm giọng nói rõ nét, tự tin quay Vlog và sự kiện ngoài trời gió lớn",
  },
];

/**
 * Get recommended add-ons based on equipment name or category
 */
function getRecommendedAddons(equipment) {
  const name = (equipment?.name || "").toLowerCase();
  const brand = name.includes("sony")
    ? "Sony"
    : name.includes("canon")
    ? "Canon"
    : name.includes("fuji")
    ? "Fujifilm"
    : name.includes("nikon")
    ? "Nikon"
    : "Universal";

  const isCamera =
    name.includes("a7") ||
    name.includes("fx3") ||
    name.includes("fx30") ||
    name.includes("r5") ||
    name.includes("r6") ||
    name.includes("x-t") ||
    name.includes("camera") ||
    name.includes("máy");

  return DEFAULT_ADDONS.filter((addon) => {
    // Universal accessories are always available
    if (addon.compatibleBrands.includes("Universal")) return true;
    // Brand specific matching
    if (addon.compatibleBrands.includes(brand)) return true;
    return false;
  }).map((addon) => {
    const discountedRate = Math.round(addon.dailyRate * (1 - addon.bundleDiscountRate));
    const savings = addon.dailyRate - discountedRate;
    return {
      ...addon,
      discountedDailyRate: discountedRate,
      dailySavings: savings,
    };
  });
}

/**
 * Calculate total combo price with days and selected addons
 */
function calculateComboPrice(baseEquipmentDailyRate, selectedAddonIds, rentalDays = 1) {
  const days = Math.max(1, parseInt(rentalDays, 10) || 1);
  const baseCost = baseEquipmentDailyRate * days;

  let addonsOriginalCost = 0;
  let addonsDiscountedCost = 0;
  let totalAddonsDeposit = 0;
  const items = [];

  for (const id of selectedAddonIds) {
    const addon = DEFAULT_ADDONS.find((a) => a._id === id);
    if (addon) {
      const orig = addon.dailyRate * days;
      const discounted = Math.round(addon.dailyRate * (1 - addon.bundleDiscountRate)) * days;
      addonsOriginalCost += orig;
      addonsDiscountedCost += discounted;
      totalAddonsDeposit += addon.depositAmount;

      items.push({
        id: addon._id,
        name: addon.name,
        category: addon.category,
        originalPrice: orig,
        discountedPrice: discounted,
        savings: orig - discounted,
      });
    }
  }

  const totalComboPrice = baseCost + addonsDiscountedCost;
  const totalSavings = addonsOriginalCost - addonsDiscountedCost;

  return {
    rentalDays: days,
    baseCost,
    addonsOriginalCost,
    addonsDiscountedCost,
    totalComboPrice,
    totalSavings,
    totalAddonsDeposit,
    items,
  };
}

module.exports = {
  DEFAULT_ADDONS,
  getRecommendedAddons,
  calculateComboPrice,
};
