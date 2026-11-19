/**
 * Camera Trade-In Automated Valuation Engine
 * Thuật toán định giá thu cũ đổi mới máy ảnh và ống kính dựa trên độ hao mòn cơ học, thời gian sử dụng và tình trạng cảm biến
 */

const CAMERA_BASE_VALUATION_DATABASE = {
  // Sony Cameras
  "sony_a7_iv": { brand: "Sony", model: "Alpha A7 IV", baseNewPriceVnd: 55000000, maxRatedShutter: 200000, releaseYear: 2021 },
  "sony_a7r_v": { brand: "Sony", model: "Alpha A7R V", baseNewPriceVnd: 85000000, maxRatedShutter: 500000, releaseYear: 2022 },
  "sony_a7s_iii": { brand: "Sony", model: "Alpha A7S III", baseNewPriceVnd: 75000000, maxRatedShutter: 250000, releaseYear: 2020 },
  "sony_fx3": { brand: "Sony", model: "FX3 Cinema Line", baseNewPriceVnd: 89000000, maxRatedShutter: 300000, releaseYear: 2021 },
  "sony_fx6": { brand: "Sony", model: "FX6 Cinema Line", baseNewPriceVnd: 145000000, maxRatedShutter: 500000, releaseYear: 2020 },
  "sony_a6700": { brand: "Sony", model: "Alpha A6700", baseNewPriceVnd: 33000000, maxRatedShutter: 200000, releaseYear: 2023 },

  // Canon Cameras
  "canon_eos_r5": { brand: "Canon", model: "EOS R5", baseNewPriceVnd: 79000000, maxRatedShutter: 500000, releaseYear: 2020 },
  "canon_eos_r6_ii": { brand: "Canon", model: "EOS R6 Mark II", baseNewPriceVnd: 56000000, maxRatedShutter: 400000, releaseYear: 2022 },
  "canon_eos_r8": { brand: "Canon", model: "EOS R8", baseNewPriceVnd: 32000000, maxRatedShutter: 150000, releaseYear: 2023 },
  "canon_c70": { brand: "Canon", model: "EOS C70 Cinema", baseNewPriceVnd: 110000000, maxRatedShutter: 400000, releaseYear: 2020 },

  // Fujifilm Cameras
  "fujifilm_x_t5": { brand: "Fujifilm", model: "X-T5", baseNewPriceVnd: 41000000, maxRatedShutter: 300000, releaseYear: 2022 },
  "fujifilm_x_h2s": { brand: "Fujifilm", model: "X-H2S", baseNewPriceVnd: 54000000, maxRatedShutter: 500000, releaseYear: 2022 },

  // Nikon Cameras
  "nikon_z8": { brand: "Nikon", model: "Z8 Full-Frame", baseNewPriceVnd: 88000000, maxRatedShutter: 500000, releaseYear: 2023 },
  "nikon_z6_iii": { brand: "Nikon", model: "Z6 III", baseNewPriceVnd: 58000000, maxRatedShutter: 400000, releaseYear: 2024 },

  // Panasonic Lumix
  "lumix_s5_ii_x": { brand: "Panasonic", model: "Lumix S5 IIX", baseNewPriceVnd: 48000000, maxRatedShutter: 250000, releaseYear: 2023 },
};

/**
 * Tính toán giá trị khấu hao và định giá thu mua Trade-In
 */
function calculateTradeInQuote({
  cameraKey,
  customOriginalPriceVnd,
  yearsUsed = 1,
  shutterCount = 15000,
  conditionGrade = "excellent_95",
  sensorCondition = "flawless_clean",
}) {
  const ref = CAMERA_BASE_VALUATION_DATABASE[cameraKey];
  const originalPrice = ref ? ref.baseNewPriceVnd : (customOriginalPriceVnd || 40000000);
  const maxShutter = ref ? ref.maxRatedShutter : 200000;

  // 1. Khấu hao theo thời gian sử dụng (Annual Depreciation Decay)
  // Năm 1 mất 15%, các năm tiếp theo mất 10%/năm
  let timeFactor = 1.0;
  if (yearsUsed <= 1) {
    timeFactor = 0.85;
  } else {
    timeFactor = 0.85 * Math.pow(0.90, yearsUsed - 1);
  }
  timeFactor = Math.max(0.35, timeFactor);

  // 2. Khấu hao cơ học theo số shot màn trập (Mechanical Shutter Wear)
  const shutterRatio = Math.min(1.0, shutterCount / maxShutter);
  const shutterFactor = Math.max(0.60, 1.0 - 0.40 * Math.pow(shutterRatio, 1.15));

  // 3. Hệ số ngoại quan (Cosmetic Condition Multiplier)
  const conditionMultipliers = {
    like_new_99: 1.0,
    excellent_95: 0.93,
    good_90: 0.85,
    fair_85: 0.76,
    cosmetic_wear_80: 0.65,
  };
  const conditionFactor = conditionMultipliers[conditionGrade] || 0.90;

  // 4. Hệ số tình trạng cảm biến (Sensor Multiplier)
  const sensorMultipliers = {
    flawless_clean: 1.0,
    minor_dust: 0.97,
    cleaned_certified: 0.95,
    micro_scratches: 0.70, // Sensor trầy sẽ mất giá nặng vì phải thay cụm lọc IR/sensor
  };
  const sensorFactor = sensorMultipliers[sensorCondition] || 0.95;

  // Giá thị trường định giá máy cũ đã kiểm định (Certified Market Resale Value)
  const certifiedMarketValue = Math.round(originalPrice * timeFactor * shutterFactor * conditionFactor * sensorFactor);

  // Giá thu mua trực tiếp tiền mặt (Instant Cash Payout): Chiết khấu 15% biên độ an toàn vận hành
  const cashPayoutQuote = Math.round(certifiedMarketValue * 0.85);

  // Giá trị đổi sang Voucher thuê thiết bị SmartEquip (Rental Credit Bonus): Tặng thêm 12% giá trị
  const rentalCreditVoucherQuote = Math.round(certifiedMarketValue * 0.95);

  return {
    cameraModel: ref ? `${ref.brand} ${ref.model}` : "Máy ảnh tùy chỉnh",
    originalPriceVnd: originalPrice,
    yearsUsed,
    shutterCount,
    maxRatedShutter: maxShutter,
    shutterWearPercentage: Math.round(shutterRatio * 100),
    conditionGrade,
    certifiedMarketValue,
    cashPayoutQuote,
    rentalCreditVoucherQuote,
    bonusCreditAmount: rentalCreditVoucherQuote - cashPayoutQuote,
  };
}

module.exports = {
  CAMERA_BASE_VALUATION_DATABASE,
  calculateTradeInQuote,
};
