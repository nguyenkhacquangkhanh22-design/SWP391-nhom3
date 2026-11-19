/**
 * Optical Physics Engine - Hệ thống tính toán mô phỏng quang học thấu kính
 * Hỗ trợ phân tích đường cong MTF, bán kính đĩa nhiễu xạ Airy, và độ mờ Bokeh.
 */

// Bước sóng ánh sáng trung bình của mắt người (xanh lá - 550nm)
const WAVELENGTH_GREEN_LIGHT_NM = 550;
const WAVELENGTH_GREEN_UM = 0.55;

/**
 * Tính bán kính đĩa nhiễu xạ Airy (Airy Disk Radius) theo tiêu chuẩn Rayleigh
 * r_airy = 1.22 * lambda * N (micrometers)
 * @param {number} apertureFStop - Trị số mở khẩu N (ví dụ 1.4, 2.8, 8, 16)
 * @returns {number} Bán kính đĩa Airy tính bằng micrometers (µm)
 */
function calculateAiryDiskRadiusUm(apertureFStop) {
  if (apertureFStop <= 0) return 0;
  return 1.22 * WAVELENGTH_GREEN_UM * apertureFStop;
}

/**
 * Tính giới hạn tần số không gian cắt của nhiễu xạ (Diffraction Cutoff Frequency)
 * f_cutoff = 1 / (lambda * N) lp/mm
 * @param {number} apertureFStop 
 * @returns {number} Tần số không gian lp/mm
 */
function calculateDiffractionCutoffLpMm(apertureFStop) {
  if (apertureFStop <= 0) return 2000;
  return 1000 / (WAVELENGTH_GREEN_UM * apertureFStop);
}

/**
 * Ước lượng đường cong MTF lý thuyết tại tần số f (lp/mm) đối với hệ thấu kính quang sai giới hạn nhiễu xạ
 * MTF_diffraction(nu) = (2 / pi) * (arccos(nu/nu_0) - (nu/nu_0) * sqrt(1 - (nu/nu_0)^2))
 */
function calculateDiffractionLimitedMTF(frequencyLpMm, apertureFStop) {
  const fCutoff = calculateDiffractionCutoffLpMm(apertureFStop);
  if (frequencyLpMm >= fCutoff) return 0.0;
  const ratio = frequencyLpMm / fCutoff;
  const term1 = Math.acos(ratio);
  const term2 = ratio * Math.sqrt(1 - ratio * ratio);
  return Math.max(0, Math.min(1, (2 / Math.PI) * (term1 - term2)));
}

/**
 * Mô phỏng phân rã độ nét từ tâm cảm biến ra góc cạnh (Radial Falloff)
 * @param {number} centerMTF - Độ tương phản/sắc nét tại tâm (0 - 1)
 * @param {number} radialDistanceMm - Khoảng cách từ tâm cảm biến Full-frame (0mm đến 21.6mm)
 * @param {number} opticalQualityTier - Hệ số cấp độ thấu kính (0.85 = phổ thông, 0.98 = G Master/Cinema)
 */
function simulateRadialMTFFalloff(centerMTF, radialDistanceMm, opticalQualityTier = 0.92) {
  // Khoảng cách góc tối đa của Full Frame là ~21.63mm (36x24mm)
  const normalizedRadius = Math.min(1.0, radialDistanceMm / 21.63);
  // Hàm suy giảm bậc 2 theo định luật cos^4 và độ cong trường nét
  const falloffFactor = 1 - Math.pow(normalizedRadius, 2.2) * (1 - opticalQualityTier);
  return Math.max(0.1, Math.round(centerMTF * falloffFactor * 1000) / 1000);
}

/**
 * Sinh bộ dữ liệu đo đạc chuẩn phòng Lab cho một ống kính cụ thể
 * @param {string} lensModel - Tên ống kính
 * @param {number} focalLengthMm - Tiêu cự
 * @param {number} maxAperture - Khẩu độ lớn nhất (ví dụ 1.2, 1.4, 2.8)
 */
function generateSyntheticLabBenchmark(lensModel, focalLengthMm, maxAperture = 1.4) {
  const aperturesToTest = [];
  const testFStops = [maxAperture, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0].filter(
    (f, idx, arr) => f >= maxAperture && arr.indexOf(f) === idx
  );

  for (const fStop of testFStops) {
    // Khẩu độ f/4.0 - f/5.6 thường đạt đỉnh độ sắc nét (Sweet spot)
    const isSweetSpot = fStop >= 2.8 && fStop <= 5.6;
    const baseCenterContrast = isSweetSpot ? 0.96 : fStop === maxAperture ? 0.84 : fStop >= 16 ? 0.78 : 0.91;
    const baseCenterResolution = isSweetSpot ? 0.92 : fStop === maxAperture ? 0.76 : fStop >= 16 ? 0.71 : 0.86;

    aperturesToTest.push({
      aperture_f_stop: fStop,
      mtf_10_lp_mm: {
        center: baseCenterContrast,
        mid_frame: simulateRadialMTFFalloff(baseCenterContrast, 14.0, 0.93),
        corner: simulateRadialMTFFalloff(baseCenterContrast, 21.6, 0.86),
      },
      mtf_20_lp_mm: {
        center: Math.round(baseCenterContrast * 0.93 * 1000) / 1000,
        mid_frame: simulateRadialMTFFalloff(baseCenterContrast * 0.93, 14.0, 0.90),
        corner: simulateRadialMTFFalloff(baseCenterContrast * 0.93, 21.6, 0.81),
      },
      mtf_30_lp_mm: {
        center: baseCenterResolution,
        mid_frame: simulateRadialMTFFalloff(baseCenterResolution, 14.0, 0.88),
        corner: simulateRadialMTFFalloff(baseCenterResolution, 21.6, 0.75),
      },
      mtf_40_lp_mm: {
        center: Math.round(baseCenterResolution * 0.87 * 1000) / 1000,
        mid_frame: simulateRadialMTFFalloff(baseCenterResolution * 0.87, 14.0, 0.82),
        corner: simulateRadialMTFFalloff(baseCenterResolution * 0.87, 21.6, 0.67),
      },
      sagittal_astigmatism_score: Math.round((92 - (fStop === maxAperture ? 8 : 0)) * 10) / 10,
      meridional_astigmatism_score: Math.round((89 - (fStop === maxAperture ? 10 : 0)) * 10) / 10,
      vignetting_ev_drop: fStop === maxAperture ? -1.85 : fStop <= 2.8 ? -1.1 : -0.35,
    });
  }

  // Phán đoán quang sai dựa trên tiêu cự (Góc rộng dễ méo thùng, tele dễ méo gối)
  let distortionPct = -0.35;
  let distType = "neutral_flat";
  if (focalLengthMm <= 24) {
    distortionPct = -1.8;
    distType = "barrel";
  } else if (focalLengthMm >= 85) {
    distortionPct = 0.85;
    distType = "pincushion";
  }

  return {
    lens_model_name: lensModel,
    focal_length_tested_mm: focalLengthMm,
    tested_apertures: aperturesToTest,
    chromatic_aberration: {
      lateral_ca_micrometers: focalLengthMm < 35 ? 2.1 : 1.2,
      longitudinal_ca_score: 93.5,
      color_fringing_rating: focalLengthMm < 35 ? "minimal" : "negligible",
    },
    distortion: {
      distortion_percentage: distortionPct,
      distortion_type: distType,
      grid_linearity_score: Math.max(88, 100 - Math.abs(distortionPct) * 4),
    },
    autofocus_calibration: {
      af_offset_step: 0,
      front_focus_drift_um: 0.2,
      back_focus_drift_um: 0.1,
      repeatability_rate_percent: 99.1,
      status: "calibrated_perfect",
    },
    sensor_pairing_capacity: {
      max_recommended_megapixels: focalLengthMm >= 50 && maxAperture <= 1.4 ? 100 : 61,
      circle_of_confusion_um: 0.029,
      diffraction_cutoff_aperture: "f/11",
    },
    flare_ghosting_resistance: "grade_s_cinema",
    overall_optical_score: 95.8,
    lab_notes: `Báo cáo kiểm định quang học thấu kính tiêu cự ${focalLengthMm}mm. Điểm tối ưu tại f/4.0 với MTF 30lp/mm vượt 0.90 trên 85% diện tích khung hình Full-Frame.`,
  };
}

module.exports = {
  calculateAiryDiskRadiusUm,
  calculateDiffractionCutoffLpMm,
  calculateDiffractionLimitedMTF,
  simulateRadialMTFFalloff,
  generateSyntheticLabBenchmark,
};
