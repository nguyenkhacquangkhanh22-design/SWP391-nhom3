/**
 * Owner Equipment Analytics & Periodic Maintenance Service
 * Analyzes:
 * - Equipment utilization rate (Occupancy %)
 * - Revenue performance per gear
 * - Rental count tracking & Routine Sensor/Desiccant cleaning reminder
 */

const SAMPLE_OWNER_ANALYTICS = [
  {
    equipmentId: "eq_sony_a7m4",
    name: "Sony Alpha 7 IV (A7M4)",
    dailyRate: 350000,
    totalRentalsCompleted: 18,
    rentalsSinceLastService: 9, // Alert threshold: 10
    totalDaysRentedThisMonth: 19,
    daysInMonth: 30,
    occupancyRatePercentage: 63.3,
    totalRevenueAccumulated: 6650000,
    averageRentalDurationDays: 2.8,
    maintenanceStatus: {
      needsService: true,
      reason: "Đã qua 9 chuyến thuê. Đề xuất vệ sinh cảm biến bụi và kiểm tra nắp chống ẩm.",
      urgency: "warning", // 'ok' | 'warning' | 'urgent'
      lastServicedDate: "2026-10-15",
    },
  },
  {
    equipmentId: "eq_canon_r6m2",
    name: "Canon EOS R6 Mark II",
    dailyRate: 360000,
    totalRentalsCompleted: 12,
    rentalsSinceLastService: 3,
    totalDaysRentedThisMonth: 14,
    daysInMonth: 30,
    occupancyRatePercentage: 46.7,
    totalRevenueAccumulated: 5040000,
    averageRentalDurationDays: 3.1,
    maintenanceStatus: {
      needsService: false,
      reason: "Thiết bị hoạt động hoàn hảo, chưa cần bảo dưỡng (còn 7 lượt thuê nữa).",
      urgency: "ok",
      lastServicedDate: "2026-11-05",
    },
  },
  {
    equipmentId: "eq_sony_2470gm",
    name: "Ống kính Sony FE 24-70mm f/2.8 GM II",
    dailyRate: 250000,
    totalRentalsCompleted: 24,
    rentalsSinceLastService: 11, // Over 10 threshold!
    totalDaysRentedThisMonth: 22,
    daysInMonth: 30,
    occupancyRatePercentage: 73.3,
    totalRevenueAccumulated: 5500000,
    averageRentalDurationDays: 2.5,
    maintenanceStatus: {
      needsService: true,
      reason: "ĐÃ ĐẠT 11 LƯỢT THUÊ LIÊN TỤC! Cần lau chùi kính trước/sau và khử mốc tủ chống ẩm ngay.",
      urgency: "urgent",
      lastServicedDate: "2026-09-28",
    },
  },
];

/**
 * Get aggregated performance statistics for an owner
 */
function getOwnerEquipmentAnalytics() {
  const items = SAMPLE_OWNER_ANALYTICS;
  const totalRevenue = items.reduce((acc, curr) => acc + curr.totalRevenueAccumulated, 0);
  const totalRentals = items.reduce((acc, curr) => acc + curr.totalRentalsCompleted, 0);
  const averageOccupancy = Math.round(
    items.reduce((acc, curr) => acc + curr.occupancyRatePercentage, 0) / items.length
  );
  const alertCount = items.filter((i) => i.maintenanceStatus.needsService).length;

  return {
    summary: {
      totalRevenue,
      totalRentals,
      averageOccupancyRate: averageOccupancy,
      activeEquipments: items.length,
      maintenanceAlertsCount: alertCount,
    },
    equipments: items,
  };
}

/**
 * Record a maintenance event and reset the counter
 */
function recordMaintenanceReset(equipmentId, serviceType = "sensor_cleaning", notes = "") {
  const item = SAMPLE_OWNER_ANALYTICS.find((i) => i.equipmentId === equipmentId);
  if (item) {
    item.rentalsSinceLastService = 0;
    item.maintenanceStatus = {
      needsService: false,
      reason: "Đã bảo dưỡng thành công. Bộ đếm lượt thuê đã được đặt lại.",
      urgency: "ok",
      lastServicedDate: new Date().toISOString().split("T")[0],
    };
    return {
      success: true,
      message: `Đã ghi nhận bảo dưỡng định kỳ cho ${item.name} thành công!`,
      equipment: item,
    };
  }
  return {
    success: false,
    message: "Không tìm thấy thiết bị tương ứng.",
  };
}

module.exports = {
  SAMPLE_OWNER_ANALYTICS,
  getOwnerEquipmentAnalytics,
  recordMaintenanceReset,
};
