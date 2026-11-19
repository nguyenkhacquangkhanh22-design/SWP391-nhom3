/**
 * Optical Benchmark Types
 * Định nghĩa cấu trúc dữ liệu đo đạc kiểm định quang học thấu kính
 */

export interface MTFSpatialData {
  center: number;
  mid_frame: number;
  corner: number;
}

export interface ApertureTestRecord {
  aperture_f_stop: number;
  mtf_10_lp_mm: MTFSpatialData;
  mtf_20_lp_mm: MTFSpatialData;
  mtf_30_lp_mm: MTFSpatialData;
  mtf_40_lp_mm: MTFSpatialData;
  sagittal_astigmatism_score: number;
  meridional_astigmatism_score: number;
  vignetting_ev_drop: number;
}

export interface ChromaticAberrationData {
  lateral_ca_micrometers: number;
  longitudinal_ca_score: number;
  color_fringing_rating: "negligible" | "minimal" | "moderate" | "severe";
}

export interface DistortionData {
  distortion_percentage: number;
  distortion_type: "barrel" | "pincushion" | "mustache" | "neutral_flat";
  grid_linearity_score: number;
}

export interface AutofocusCalibrationData {
  af_offset_step: number;
  front_focus_drift_um: number;
  back_focus_drift_um: number;
  repeatability_rate_percent: number;
  status: "calibrated_perfect" | "acceptable_tolerance" | "requires_shimming";
}

export interface SensorPairingData {
  max_recommended_megapixels: number;
  circle_of_confusion_um: number;
  diffraction_cutoff_aperture: string;
}

export interface OpticalBenchmark {
  _id: string;
  equipment_id: {
    _id: string;
    title: string;
    brand?: string;
    model?: string;
    price_per_day?: number;
    images?: string[];
  } | string;
  technician_name: string;
  test_bench_serial: string;
  tested_at: string;
  lens_model_name: string;
  focal_length_tested_mm: number;
  tested_apertures: ApertureTestRecord[];
  chromatic_aberration: ChromaticAberrationData;
  distortion: DistortionData;
  autofocus_calibration: AutofocusCalibrationData;
  sensor_pairing_capacity: SensorPairingData;
  flare_ghosting_resistance: "grade_s_cinema" | "grade_a_pro" | "grade_b_standard" | "grade_c_flare_prone";
  overall_optical_score: number;
  lab_notes: string;
  digital_signature_hash: string;
}

export interface SensorCompatibilityResult {
  equipment_title: string;
  sensor_tested_mp: number;
  sensor_format: string;
  resolving_efficiency_percent: number;
  nyquist_frequency_limit_lp_mm: number;
  sweet_spot_aperture: string;
  recommendation: string;
}

export interface CalibrationCertificate {
  certificate_id: string;
  issued_date: string;
  valid_until: string;
  equipment_name: string;
  equipment_serial: string;
  optical_score: number;
  collimator_model: string;
  astigmatism_verified: boolean;
  af_micro_adjustment_offset: number;
  repeatability_accuracy: string;
  technician: string;
  issuer: string;
}
