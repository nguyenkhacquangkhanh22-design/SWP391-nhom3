const mongoose = require("mongoose");

/**
 * ProductionProjectPackage Schema
 * Quản lý gói thuê thiết bị tổng hợp dành cho Đoàn làm phim / TVC / Music Video
 * Hỗ trợ phân bổ theo Tổ A-Cam, Tổ Ánh sáng, Âm thanh, Grip và dự toán Pin/Điện trường quay.
 */
const productionProjectPackageSchema = new mongoose.Schema(
  {
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project_title: {
      type: String,
      required: true,
      trim: true,
    },
    production_type: {
      type: String,
      enum: ["feature_film", "commercial_tvc", "music_video", "documentary", "event_livestream", "short_film"],
      default: "commercial_tvc",
    },
    client_name: {
      type: String,
      default: "Đoàn sản xuất điện ảnh",
    },
    director_of_photography: {
      type: String,
      default: "",
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    shooting_days: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    daily_shooting_hours: {
      type: Number,
      default: 12,
      min: 4,
      max: 24,
    },
    // Danh sách thiết bị phân theo các tổ chuyên môn
    departments: {
      camera_a: [
        {
          equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
          item_name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          daily_price: { type: Number, default: 0, min: 0 },
          power_draw_watts: { type: Number, default: 25 }, // Công suất tiêu thụ (W)
          lens_mount: { type: String, default: "Sony E" },
          notes: { type: String, default: "" },
        },
      ],
      camera_b: [
        {
          equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
          item_name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          daily_price: { type: Number, default: 0, min: 0 },
          power_draw_watts: { type: Number, default: 20 },
          lens_mount: { type: String, default: "Sony E" },
          notes: { type: String, default: "" },
        },
      ],
      lighting: [
        {
          equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
          item_name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          daily_price: { type: Number, default: 0, min: 0 },
          power_draw_watts: { type: Number, default: 300 }, // Ví dụ đèn Aputure 600d = 600W
          color_temp_kelvin: { type: String, default: "5600K Bi-Color" },
          c_stand_included: { type: Boolean, default: true },
          notes: { type: String, default: "" },
        },
      ],
      sound: [
        {
          equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
          item_name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          daily_price: { type: Number, default: 0, min: 0 },
          power_draw_watts: { type: Number, default: 15 },
          channel_count: { type: Number, default: 4 },
          notes: { type: String, default: "" },
        },
      ],
      grip_stabilizer: [
        {
          equipment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
          item_name: { type: String, required: true },
          quantity: { type: Number, default: 1, min: 1 },
          daily_price: { type: Number, default: 0, min: 0 },
          power_draw_watts: { type: Number, default: 10 },
          max_payload_kg: { type: Number, default: 4.5 },
          notes: { type: String, default: "" },
        },
      ],
    },
    // Dự toán công suất và thời lượng Pin (Power & Battery Simulation)
    power_budget: {
      total_camera_rig_watts: { type: Number, default: 0 },
      total_lighting_watts: { type: Number, default: 0 },
      total_audio_grip_watts: { type: Number, default: 0 },
      grand_total_watts: { type: Number, default: 0 },
      daily_required_watt_hours: { type: Number, default: 0 }, // Wh cần thiết cho cả ngày
      recommended_vmount_batteries_count: { type: Number, default: 6 }, // Loại 150Wh
      recommended_power_stations_count: { type: Number, default: 1 }, // EcoFlow / Jackery 2000Wh
      ac_generator_needed: { type: Boolean, default: false }, // Có cần máy nổ điện công nghiệp ko
    },
    pricing_summary: {
      subtotal_daily: { type: Number, default: 0 },
      total_before_discount: { type: Number, default: 0 },
      multi_day_discount_percent: { type: Number, default: 0 },
      discount_amount: { type: Number, default: 0 },
      package_total: { type: Number, default: 0 },
      security_deposit: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "submitted_for_quote", "confirmed", "in_production", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    logistics: {
      on_set_location: { type: String, default: "Phim trường Studio / Ngoại cảnh" },
      delivery_mode: { type: String, enum: ["crew_pickup", "direct_van_delivery"], default: "direct_van_delivery" },
      special_instructions: { type: String, default: "" },
    },
    master_agreement_code: {
      type: String,
      default: () => "PROD-PKG-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
  },
  {
    timestamps: true,
  }
);

// Phương thức tự động tính toán tổng chi phí và tổng công suất điện năng
productionProjectPackageSchema.methods.calculateTotals = function () {
  let subtotalDaily = 0;
  let rigWatts = 0;
  let lightWatts = 0;
  let otherWatts = 0;

  const countDept = (items, category) => {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      const q = item.quantity || 1;
      const price = item.daily_price || 0;
      const watts = item.power_draw_watts || 0;
      subtotalDaily += price * q;

      if (category === "rig") rigWatts += watts * q;
      else if (category === "lighting") lightWatts += watts * q;
      else otherWatts += watts * q;
    }
  };

  countDept(this.departments.camera_a, "rig");
  countDept(this.departments.camera_b, "rig");
  countDept(this.departments.lighting, "lighting");
  countDept(this.departments.sound, "other");
  countDept(this.departments.grip_stabilizer, "other");

  const totalWatts = rigWatts + lightWatts + otherWatts;
  const hours = this.daily_shooting_hours || 12;
  const days = this.shooting_days || 1;

  // Watt-hours cần thiết (nhân thêm hệ số bù tải 1.25 phòng ngừa pin chai/nhiệt độ)
  const dailyWattHours = Math.round(totalWatts * hours * 1.25);

  // Chiết khấu theo số ngày quay
  let discountPct = 0;
  if (days >= 7) discountPct = 25;
  else if (days >= 5) discountPct = 20;
  else if (days >= 3) discountPct = 15;
  else if (days >= 2) discountPct = 10;

  const totalBeforeDiscount = subtotalDaily * days;
  const discountAmount = Math.round((totalBeforeDiscount * discountPct) / 100);
  const packageTotal = totalBeforeDiscount - discountAmount;
  const securityDeposit = Math.round(packageTotal * 0.3); // 30% cọc thiết bị đoàn

  this.power_budget = {
    total_camera_rig_watts: rigWatts,
    total_lighting_watts: lightWatts,
    total_audio_grip_watts: otherWatts,
    grand_total_watts: totalWatts,
    daily_required_watt_hours: dailyWattHours,
    recommended_vmount_batteries_count: Math.max(4, Math.ceil((rigWatts * hours) / 150)),
    recommended_power_stations_count: lightWatts > 1000 ? Math.ceil(lightWatts / 1200) : 1,
    ac_generator_needed: totalWatts >= 3000,
  };

  this.pricing_summary = {
    subtotal_daily: subtotalDaily,
    total_before_discount: totalBeforeDiscount,
    multi_day_discount_percent: discountPct,
    discount_amount: discountAmount,
    package_total: packageTotal,
    security_deposit: securityDeposit,
  };
};

module.exports = mongoose.model("ProductionProjectPackage", productionProjectPackageSchema);
