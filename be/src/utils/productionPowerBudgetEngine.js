/**
 * Production Power Budget & Battery Simulation Engine
 * Mô phỏng tiêu thụ điện năng cho đoàn phim, tính toán thời lượng pin trường quay
 */

// Định mức công suất tiêu thụ tham chiếu của các thiết bị làm phim phổ biến (Watts)
const CINEMA_POWER_DRAW_TABLE = {
  // Cinema Cameras
  "arri_alexa_mini_lf": { name: "ARRI Alexa Mini LF", watts: 65, voltage: "14.4V - 24V" },
  "sony_fx9": { name: "Sony FX9 Full-Frame", watts: 35, voltage: "19.5V DC" },
  "sony_fx6": { name: "Sony FX6 Cinema Line", watts: 18, voltage: "19.5V DC" },
  "sony_fx3": { name: "Sony FX3 / A7S III", watts: 9.5, voltage: "NP-FZ100 / USB-C PD" },
  "red_v_raptor_8k": { name: "RED V-Raptor 8K VV", watts: 60, voltage: "Micro V-Mount" },
  "blackmagic_ursa_12k": { name: "Blackmagic URSA Mini Pro 12K", watts: 55, voltage: "12V XLR" },

  // Monitors & Video Transmitters
  "smallhd_cine_7": { name: "SmallHD Cine 7 Monitor", watts: 15, voltage: "Sony L-Series / V-Mount" },
  "atomos_ninja_v": { name: "Atomos Ninja V 5-inch", watts: 12, voltage: "NP-F970" },
  "hollyland_mars_4k": { name: "Hollyland Mars 4K Transmitter", watts: 9, voltage: "DC 6-16V" },
  "teradek_bolt_6_750": { name: "Teradek Bolt 6 750 XT", watts: 11, voltage: "2-pin LEMO" },

  // Production Lighting
  "aputure_ls_1200d_pro": { name: "Aputure LS 1200d Pro LED", watts: 1200, voltage: "AC 100-240V" },
  "aputure_ls_600d_pro": { name: "Aputure LS 600d Pro", watts: 720, voltage: "V-Mount / AC" },
  "aputure_300c_rgb": { name: "Aputure 300c Full Color", watts: 360, voltage: "V-Mount / AC" },
  "amaran_200x_s": { name: "Amaran 200x S Bi-Color", watts: 250, voltage: "AC / 48V Station" },
  "nanlite_pavotube_30c": { name: "Nanlite PavoTube II 30C", watts: 32, voltage: "Internal Li-ion" },

  // Audio Field Recorders
  "sound_devices_833": { name: "Sound Devices 833 8-Channel", watts: 18, voltage: "Hirose / Smart Battery" },
  "zoom_f8n_pro": { name: "Zoom F8n Pro 32-bit Float", watts: 12, voltage: "Hirose / 8x AA / DC" },

  // Gimbals & Focus Motors
  "dji_rs3_pro": { name: "DJI RS 3 Pro Gimbal", watts: 15, voltage: "BG30 Grip" },
  "tilta_nucleus_m": { name: "Tilta Nucleus-M Dual Motor", watts: 14, voltage: "D-Tap 14.8V" },
};

/**
 * Tính toán thời gian hoạt động của 1 viên pin (Hours)
 * @param {number} batteryCapacityWh - Dung lượng pin tính bằng Watt-giờ (ví dụ V-Mount 99Wh, 150Wh, 290Wh)
 * @param {number} loadWatts - Tổng công suất tiêu thụ của Rig máy quay (W)
 * @param {number} dischargeEfficiency - Hiệu suất xả an toàn (thường là 0.85 để bảo vệ cell pin không bị sập nguồn)
 */
function calculateBatteryRuntimeHours(batteryCapacityWh, loadWatts, dischargeEfficiency = 0.85) {
  if (loadWatts <= 0) return 999;
  return Math.round(((batteryCapacityWh * dischargeEfficiency) / loadWatts) * 10) / 10;
}

/**
 * Ước lượng số lượng pin V-Mount cần thiết cho một ngày quay phim liên tục
 * @param {number} rigWatts - Công suất rig máy quay
 * @param {number} shootingHours - Số giờ quay trong ngày (ví dụ 10h, 12h, 14h)
 * @param {number} batteryWhPerPack - Dung lượng mỗi viên pin (mặc định 150Wh)
 */
function estimateBatteriesNeeded(rigWatts, shootingHours, batteryWhPerPack = 150) {
  const runtimePerBattery = calculateBatteryRuntimeHours(batteryWhPerPack, rigWatts);
  if (runtimePerBattery <= 0) return 6;
  const countNeeded = Math.ceil(shootingHours / runtimePerBattery);
  // Dự phòng thêm 1-2 viên đề phòng sạc chưa kịp hoặc pin nóng
  return countNeeded + 1;
}

/**
 * Đưa ra giải pháp cấp nguồn toàn diện cho đoàn phim
 */
function generatePowerStrategy({ totalWatts, shootingHours, hasHighWattLighting }) {
  const dailyTotalWh = Math.round(totalWatts * shootingHours * 1.25);
  let powerSource = "Trạm pin V-Mount & Trạm sạc di động 2000Wh";
  let generatorRequired = false;
  let safetyAdvice = "Dùng cáp D-Tap tiêu chuẩn có cầu chì chống cháy bo mạch.";

  if (totalWatts > 2500 || hasHighWattLighting) {
    powerSource = "Máy nổ phát điện công nghiệp 5kVA - 10kVA hoặc Đấu tủ điện ba pha phim trường";
    generatorRequired = true;
    safetyAdvice = "Bắt buộc có hộp phân phối điện (Distro Box), CB chống rò rỉ và cọc nối đất an toàn.";
  } else if (totalWatts > 1000) {
    powerSource = "Trạm điện EcoFlow Delta Pro 3600Wh + 2 trạm sạc V-Mount 4 kênh";
    generatorRequired = false;
    safetyAdvice = "Phân tải ánh sáng riêng biệt với hệ thống thu thanh để tránh xung nhiễu điện từ (Humming).";
  }

  return {
    dailyTotalWattHours: dailyTotalWh,
    powerSourceRecommendation: powerSource,
    generatorRequired,
    safetyAdvice,
    vmount150WhPacksSuggested: Math.max(4, Math.ceil((Math.min(totalWatts, 150) * shootingHours) / 120)),
  };
}

module.exports = {
  CINEMA_POWER_DRAW_TABLE,
  calculateBatteryRuntimeHours,
  estimateBatteriesNeeded,
  generatePowerStrategy,
};
