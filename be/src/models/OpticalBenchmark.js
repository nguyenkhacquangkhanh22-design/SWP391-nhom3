const mongoose = require("mongoose");

/**
 * OpticalBenchmark Schema
 * Lưu trữ kết quả đo đạc kiểm định quang học thấu kính ống kính máy ảnh/máy quay
 * Đáp ứng tiêu chuẩn phòng thí nghiệm đo lường ISO 12233 và Imatest SFR standard.
 */
const opticalBenchmarkSchema = new mongoose.Schema(
  {
    equipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: true,
      index: true,
    },
    technician_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    technician_name: {
      type: String,
      default: "Kỹ sư quang học SmartEquip Lab",
    },
    test_bench_serial: {
      type: String,
      default: "SE-COL-9000-X",
    },
    tested_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lens_model_name: {
      type: String,
      required: true,
      trim: true,
    },
    focal_length_tested_mm: {
      type: Number,
      required: true,
      min: 8,
      max: 1200,
    },
    tested_apertures: [
      {
        aperture_f_stop: {
          type: Number,
          required: true, // ví dụ: 1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0
        },
        // Độ tương phản và độ sắc nét theo MTF (Modulation Transfer Function)
        // Giá trị từ 0.00 (mờ hoàn toàn) đến 1.00 (hoàn hảo)
        mtf_10_lp_mm: {
          center: { type: Number, min: 0, max: 1, required: true },
          mid_frame: { type: Number, min: 0, max: 1, required: true }, // bán kính 14mm
          corner: { type: Number, min: 0, max: 1, required: true },    // góc rìa 21.6mm
        },
        mtf_20_lp_mm: {
          center: { type: Number, min: 0, max: 1, required: true },
          mid_frame: { type: Number, min: 0, max: 1, required: true },
          corner: { type: Number, min: 0, max: 1, required: true },
        },
        mtf_30_lp_mm: {
          center: { type: Number, min: 0, max: 1, required: true },
          mid_frame: { type: Number, min: 0, max: 1, required: true },
          corner: { type: Number, min: 0, max: 1, required: true },
        },
        mtf_40_lp_mm: {
          // Vi tương phản (Microcontrast) - độ chi tiết siêu mịn
          center: { type: Number, min: 0, max: 1, required: true },
          mid_frame: { type: Number, min: 0, max: 1, required: true },
          corner: { type: Number, min: 0, max: 1, required: true },
        },
        sagittal_astigmatism_score: {
          type: Number,
          min: 0,
          max: 100,
          default: 90,
        },
        meridional_astigmatism_score: {
          type: Number,
          min: 0,
          max: 100,
          default: 88,
        },
        vignetting_ev_drop: {
          type: Number, // Giảm sáng ở góc (EV), ví dụ -1.45 EV
          default: -1.2,
        },
      },
    ],
    // Quang sai màu sắc (Chromatic Aberration)
    chromatic_aberration: {
      lateral_ca_micrometers: {
        type: Number, // Dịch chuyển biên màu cạnh rìa (µm)
        default: 1.8,
      },
      longitudinal_ca_score: {
        type: Number, // Điểm chống viền tím ở vùng out-focus (0 - 100)
        default: 92,
      },
      color_fringing_rating: {
        type: String,
        enum: ["negligible", "minimal", "moderate", "severe"],
        default: "minimal",
      },
    },
    // Độ méo hình hình học (Geometric Distortion)
    distortion: {
      distortion_percentage: {
        type: Number, // Âm là méo thùng Barrel, dương là méo gối Pincushion (-5% đến +5%)
        default: -0.4,
      },
      distortion_type: {
        type: String,
        enum: ["barrel", "pincushion", "mustache", "neutral_flat"],
        default: "neutral_flat",
      },
      grid_linearity_score: {
        type: Number, // Độ thẳng hàng của khung lưới (0 - 100)
        default: 96,
      },
    },
    // Căn chỉnh lấy nét tự động (Autofocus Micro-Adjustment & Back/Front Focus Offset)
    autofocus_calibration: {
      af_offset_step: {
        type: Number, // -20 đến +20 (0 là hoàn hảo)
        default: 0,
        min: -20,
        max: 20,
      },
      front_focus_drift_um: {
        type: Number, // Lệch tiến (µm)
        default: 0,
      },
      back_focus_drift_um: {
        type: Number, // Lệch lùi (µm)
        default: 0,
      },
      repeatability_rate_percent: {
        type: Number, // Độ chính xác lặp lại sau 10 lần lấy nét liên tục (90 - 100%)
        default: 98.5,
      },
      status: {
        type: String,
        enum: ["calibrated_perfect", "acceptable_tolerance", "requires_shimming"],
        default: "calibrated_perfect",
      },
    },
    // Thang đo khả năng phân giải hỗ trợ cảm biến (Sensor Resolution Pairing)
    sensor_pairing_capacity: {
      max_recommended_megapixels: {
        type: Number, // Độ phân giải cảm biến tối ưu có thể khai thác hết (ví dụ: 61 MP, 100 MP)
        default: 61,
      },
      circle_of_confusion_um: {
        type: Number,
        default: 0.029, // Chuẩn Full Frame (µm)
      },
      diffraction_cutoff_aperture: {
        type: String,
        default: "f/11", // Khẩu độ bắt đầu bị tán xạ giảm nét
      },
    },
    flare_ghosting_resistance: {
      type: String,
      enum: ["grade_s_cinema", "grade_a_pro", "grade_b_standard", "grade_c_flare_prone"],
      default: "grade_s_cinema",
    },
    overall_optical_score: {
      type: Number, // 0 đến 100 điểm tổng kết quang học
      min: 0,
      max: 100,
      default: 94,
    },
    lab_notes: {
      type: String,
      default: "Thấu kính phủ nano AR kháng chói tốt, độ phẳng trường nét đều từ tâm tới rìa góc 95%.",
    },
    digital_signature_hash: {
      type: String,
      default: () => "OPT-CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
  },
  {
    timestamps: true,
  }
);

// Tính toán điểm số tổng hợp dựa trên MTF và độ méo hình
opticalBenchmarkSchema.methods.computeOpticalScore = function () {
  if (!this.tested_apertures || this.tested_apertures.length === 0) return 85;
  // Lấy khẩu độ mở lớn nhất (sweet spot mở) và khẩu độ f/5.6
  const sweetSpot = this.tested_apertures.find((a) => a.aperture_f_stop === 4.0 || a.aperture_f_stop === 5.6) || this.tested_apertures[0];
  const centerMTF = sweetSpot.mtf_30_lp_mm ? sweetSpot.mtf_30_lp_mm.center : 0.85;
  const cornerMTF = sweetSpot.mtf_30_lp_mm ? sweetSpot.mtf_30_lp_mm.corner : 0.70;
  const distPenalty = Math.abs(this.distortion.distortion_percentage) * 2;
  const caPenalty = this.chromatic_aberration.lateral_ca_micrometers * 1.5;

  let score = (centerMTF * 50) + (cornerMTF * 30) + (this.autofocus_calibration.repeatability_rate_percent * 0.2) - distPenalty - caPenalty;
  this.overall_optical_score = Math.min(100, Math.max(50, Math.round(score * 10) / 10));
  return this.overall_optical_score;
};

opticalBenchmarkSchema.index({ equipment_id: 1, tested_at: -1 });

module.exports = mongoose.model("OpticalBenchmark", opticalBenchmarkSchema);
