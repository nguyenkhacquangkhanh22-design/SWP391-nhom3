const OpticalBenchmark = require("../models/OpticalBenchmark");
const Equipment = require("../models/Equipment");
const { generateSyntheticLabBenchmark } = require("../utils/opticalPhysicsEngine");
const { findLensPresetByTitle, LENS_OPTICAL_PRESETS } = require("../utils/lensOpticalPresets");

/**
 * Lấy báo cáo kiểm định quang học của một thiết bị cụ thể
 */
exports.getBenchmarkByEquipment = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    let benchmark = await OpticalBenchmark.findOne({ equipment_id: equipmentId })
      .populate("equipment_id", "title brand model category price_per_day images status")
      .populate("technician_id", "full_name email");

    // Nếu thiết bị chưa có dữ liệu kiểm định, tìm preset trước hoặc sinh tự động
    if (!benchmark) {
      const equip = await Equipment.findById(equipmentId);
      if (!equip) {
        return res.status(404).json({ message: "Không tìm thấy thiết bị tương ứng" });
      }

      const preset = findLensPresetByTitle(equip.title);
      let benchmarkData;
      if (preset) {
        benchmarkData = {
          lens_model_name: preset.model,
          focal_length_tested_mm: preset.focal_length_tested_mm,
          tested_apertures: preset.tested_apertures,
          chromatic_aberration: preset.chromatic_aberration,
          distortion: preset.distortion,
          autofocus_calibration: preset.autofocus_calibration,
          sensor_pairing_capacity: preset.sensor_pairing_capacity,
          flare_ghosting_resistance: preset.flare_ghosting_resistance,
          overall_optical_score: preset.overall_optical_score,
          lab_notes: `Báo cáo kiểm định quang học theo tiêu chuẩn phòng thí nghiệm đối với ống kính ${preset.brand} ${preset.model}. Cấu trúc quang học: ${preset.element_groups}.`,
        };
      } else {
        const focalLength = equip.title && equip.title.match(/(\d+)mm/) ? parseInt(equip.title.match(/(\d+)mm/)[1], 10) : 50;
        benchmarkData = generateSyntheticLabBenchmark(equip.title || "Cinema Lens", focalLength, 1.4);
      }

      benchmark = new OpticalBenchmark({
        equipment_id: equip._id,
        technician_id: req.user ? req.user.id : equip.owner_id,
        ...benchmarkData,
      });
      benchmark.computeOpticalScore();
      await benchmark.save();
    }

    return res.json({
      success: true,
      data: benchmark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tạo mới hoặc cập nhật kết quả kiểm định phòng Lab
 */
exports.createOrUpdateBenchmark = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const equip = await Equipment.findById(equipmentId);
    if (!equip) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    let benchmark = await OpticalBenchmark.findOne({ equipment_id: equipmentId });
    if (!benchmark) {
      benchmark = new OpticalBenchmark({
        equipment_id: equipmentId,
        technician_id: req.user ? req.user.id : equip.owner_id,
        lens_model_name: equip.title,
        focal_length_tested_mm: req.body.focal_length_tested_mm || 50,
      });
    }

    // Cập nhật các trường
    if (req.body.tested_apertures) benchmark.tested_apertures = req.body.tested_apertures;
    if (req.body.chromatic_aberration) benchmark.chromatic_aberration = req.body.chromatic_aberration;
    if (req.body.distortion) benchmark.distortion = req.body.distortion;
    if (req.body.autofocus_calibration) benchmark.autofocus_calibration = req.body.autofocus_calibration;
    if (req.body.sensor_pairing_capacity) benchmark.sensor_pairing_capacity = req.body.sensor_pairing_capacity;
    if (req.body.flare_ghosting_resistance) benchmark.flare_ghosting_resistance = req.body.flare_ghosting_resistance;
    if (req.body.lab_notes) benchmark.lab_notes = req.body.lab_notes;

    benchmark.computeOpticalScore();
    await benchmark.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật kết quả kiểm định quang học thành công",
      data: benchmark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh sách Top thấu kính có chỉ số quang học sắc nét nhất sàn
 */
exports.listTopPerformers = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const benchmarks = await OpticalBenchmark.find({})
      .sort({ overall_optical_score: -1 })
      .limit(limit)
      .populate("equipment_id", "title brand model category price_per_day images rating");

    return res.json({
      success: true,
      count: benchmarks.length,
      data: benchmarks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Tính toán độ tương thích ghép đôi giữa Ống kính & Cảm biến máy ảnh
 * (Lens-to-Sensor Resolving Power Compatibility Engine)
 */
exports.getSensorCompatibilityScore = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const { sensorResolutionMp = 45, sensorFormat = "full_frame" } = req.query;

    const benchmark = await OpticalBenchmark.findOne({ equipment_id: equipmentId });
    const equip = await Equipment.findById(equipmentId);

    const mp = parseFloat(sensorResolutionMp);
    const maxCapacity = benchmark && benchmark.sensor_pairing_capacity ? benchmark.sensor_pairing_capacity.max_recommended_megapixels : 60;

    // Tính tỷ lệ giải quyết chi tiết pixel (Resolving efficiency)
    let resolvingEfficiency = 100;
    if (mp > maxCapacity) {
      resolvingEfficiency = Math.max(65, Math.round((maxCapacity / mp) * 100));
    }

    const nyquistCutoffLpMm = Math.round(1000 / (2 * (36 / Math.sqrt(mp * 1000000 * 1.5))));
    const sweetSpotAperture = "f/4.0 - f/5.6";
    const recommendation = resolvingEfficiency >= 90
      ? "Thấu kính phân giải siêu nét, khai thác 100% độ nét của cảm biến này."
      : resolvingEfficiency >= 80
      ? "Thấu kính phân giải tốt, độ nét đạt mức chuẩn thương mại và điện ảnh."
      : "Cảm biến có số Megapixel cao hơn năng lực phân giải của thấu kính, có thể hơi mềm ở rìa ảnh khi zoom 200%.";

    return res.json({
      success: true,
      equipment_title: equip ? equip.title : "Cinema Lens",
      sensor_tested_mp: mp,
      sensor_format: sensorFormat,
      resolving_efficiency_percent: resolvingEfficiency,
      nyquist_frequency_limit_lp_mm: nyquistCutoffLpMm,
      sweet_spot_aperture: sweetSpotAperture,
      recommendation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Xuất chứng chỉ kiểm định quang học kèm QR và chữ ký điện tử
 */
exports.getCalibrationCertificate = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const benchmark = await OpticalBenchmark.findOne({ equipment_id: equipmentId })
      .populate("equipment_id", "title brand model serial_number category")
      .populate("technician_id", "full_name email");

    if (!benchmark) {
      return res.status(404).json({ message: "Chưa có chứng thư kiểm định cho thiết bị này" });
    }

    const certificate = {
      certificate_id: benchmark.digital_signature_hash,
      issued_date: benchmark.tested_at,
      valid_until: new Date(benchmark.tested_at.getTime() + 180 * 24 * 60 * 60 * 1000), // Giá trị trong 6 tháng
      equipment_name: benchmark.equipment_id ? benchmark.equipment_id.title : benchmark.lens_model_name,
      equipment_serial: benchmark.equipment_id && benchmark.equipment_id.serial_number ? benchmark.equipment_id.serial_number : "SN-" + Math.floor(100000 + Math.random() * 900000),
      optical_score: benchmark.overall_optical_score,
      collimator_model: benchmark.test_bench_serial,
      astigmatism_verified: benchmark.autofocus_calibration.status === "calibrated_perfect",
      af_micro_adjustment_offset: benchmark.autofocus_calibration.af_offset_step,
      repeatability_accuracy: `${benchmark.autofocus_calibration.repeatability_rate_percent}%`,
      technician: benchmark.technician_name,
      issuer: "Trung Tâm Đo Lường Quang Học & Căn Chỉnh SmartEquip Lab",
    };

    return res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};
