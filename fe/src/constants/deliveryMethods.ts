export interface DeliveryOption {
  key: string;
  label: string;
  fee: number;
  icon: string;
  description: string;
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    key: "pickup",
    label: "Tự đến nhận tại Cửa hàng / Kho",
    fee: 0,
    icon: "🏪",
    description: "Khách trực tiếp đến nhận & kiểm tra thiết bị",
  },
  {
    key: "walking",
    label: "Giao đi bộ (Nội khu, tòa nhà lân cận)",
    fee: 15000,
    icon: "🚶",
    description: "Nhân viên đi bộ giao trong bán kính 1km",
  },
  {
    key: "motorcycle",
    label: "Giao xe máy tiêu chuẩn (Shipper nội thành)",
    fee: 30000,
    icon: "🛵",
    description: "Shipper xe máy giao tận tay trong 2-4 giờ",
  },
  {
    key: "express",
    label: "Giao hỏa tốc công nghệ (Grab / Be / Ahamove)",
    fee: 60000,
    icon: "⚡",
    description: "Giao ngay lập tức trong 30 - 60 phút",
  },
  {
    key: "waterway",
    label: "Vận chuyển đường thủy (Tàu cao tốc / Sông nước)",
    fee: 100000,
    icon: "⛴️",
    description: "Vận chuyển qua bến tàu hoặc tuyến sông nước",
  },
  {
    key: "air",
    label: "Vận chuyển đường hàng không (Máy bay liên tỉnh)",
    fee: 150000,
    icon: "✈️",
    description: "Chuyển phát nhanh đường bay nhận trong ngày",
  },
];

export const RETURN_OPTIONS: DeliveryOption[] = [
  {
    key: "pickup",
    label: "Tự mang trả tại Cửa hàng / Kho",
    fee: 0,
    icon: "🏪",
    description: "Khách tự mang trả máy tại địa điểm giao dịch",
  },
  {
    key: "walking",
    label: "Nhân viên đi bộ đến lấy (Nội khu)",
    fee: 15000,
    icon: "🚶",
    description: "Nhân viên đi bộ đến nhận lại máy tận nơi",
  },
  {
    key: "motorcycle",
    label: "Shipper xe máy đến thu hồi thiết bị",
    fee: 30000,
    icon: "🛵",
    description: "Shipper xe máy đến kiểm tra và thu hồi máy",
  },
  {
    key: "express",
    label: "Hỏa tốc công nghệ thu hồi thiết bị",
    fee: 60000,
    icon: "⚡",
    description: "Tài xế công nghệ đến lấy máy giao thẳng về kho",
  },
  {
    key: "waterway",
    label: "Thu hồi qua đường thủy / Tàu cao tốc",
    fee: 100000,
    icon: "⛴️",
    description: "Gửi trả máy qua tuyến tàu thủy cao tốc",
  },
  {
    key: "air",
    label: "Thu hồi qua đường hàng không / Máy bay",
    fee: 150000,
    icon: "✈️",
    description: "Đóng gói bọc xốp gửi máy bay hoàn trả liên tỉnh",
  },
];

export function getDeliveryOption(key: string): DeliveryOption {
  return DELIVERY_OPTIONS.find((o) => o.key === key) || DELIVERY_OPTIONS[2]; // default motorcycle
}

export function getReturnOption(key: string): DeliveryOption {
  return RETURN_OPTIONS.find((o) => o.key === key) || RETURN_OPTIONS[2]; // default motorcycle
}

/**
 * Số ngày vận chuyển tương ứng với từng phương thức nhận hàng
 */
export function getDeliveryTransitDays(methodKey: string): number {
  switch (methodKey) {
    case "pickup":
    case "walking":
    case "express":
      return 0; // Giao trong ngày / Khách đến nhận trực tiếp
    case "motorcycle":
      return 1; // Shipper xe máy giao sau 1 ngày
    case "air":
      return 2; // Đường hàng không giao sau 2 ngày
    case "waterway":
      return 3; // Đường thủy / Tàu cao tốc giao sau 3 ngày
    default:
      return 1;
  }
}

/**
 * Ghi chú thời gian vận chuyển
 */
export function getDeliveryTransitNote(methodKey: string): string {
  switch (methodKey) {
    case "pickup":
      return "Đến nhận trực tiếp tại Hub đúng hẹn";
    case "walking":
      return "Giao đi bộ trong 1-2 giờ";
    case "express":
      return "Giao hỏa tốc công nghệ trong 1 giờ";
    case "motorcycle":
      return "+1 ngày vận chuyển xe máy";
    case "air":
      return "+2 ngày vận chuyển hàng không";
    case "waterway":
      return "+3 ngày vận chuyển đường thủy";
    default:
      return "+1 ngày vận chuyển tiêu chuẩn";
  }
}

/**
 * Tính ngày giờ dự kiến hàng giao tới nơi (xa hơn ngày đặt/ngày bắt đầu tương ứng với phương thức giao)
 */
export function formatEstimatedDeliveryDate(
  baseDate: string | Date | undefined,
  methodKey: string,
  deliveryTime = "09:00"
): string {
  if (!baseDate) return "Chưa xác định";
  const d = new Date(baseDate);
  if (isNaN(d.getTime())) return "Chưa xác định";

  const days = getDeliveryTransitDays(methodKey);
  const transitDate = new Date(d);
  transitDate.setDate(transitDate.getDate() + days);

  const dateFormatted = transitDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const note = getDeliveryTransitNote(methodKey);
  if (days === 0) {
    return `${deliveryTime} • Ngày ${dateFormatted} (${note})`;
  }
  return `${deliveryTime} • Ngày ${dateFormatted} (${note})`;
}

/**
 * Tính ngày giờ dự kiến shipper đến lấy máy khi khách báo trả đồ
 */
export function formatEstimatedReturnPickup(
  endDate: string | Date | undefined,
  returnMethodKey: string,
  returnTime = "17:00"
): string {
  if (!endDate) return "Chưa xác định";
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return "Chưa xác định";

  const dateFormatted = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const opt = getReturnOption(returnMethodKey);
  if (returnMethodKey === "pickup") {
    return `${returnTime} • Ngày ${dateFormatted} (Khách tự mang trả tại Hub)`;
  }
  if (returnMethodKey === "express") {
    return `${returnTime} • Ngày ${dateFormatted} (Shipper hỏa tốc đến thu hồi tận nơi)`;
  }
  return `${returnTime} • Ngày ${dateFormatted} (${opt.label.split("(")[0].trim()})`;
}

/**
 * Lấy mốc thời gian hạn chót hoàn trả thiết bị
 */
export function getReturnDeadlineDate(endDate: string | Date | undefined, returnTime = "17:00"): Date | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (isNaN(d.getTime())) return null;
  const [hh, mm] = returnTime.split(":").map(Number);
  d.setHours(isNaN(hh) ? 17 : hh, isNaN(mm) ? 0 : mm, 0, 0);
  return d;
}

/**
 * Format thời gian đếm ngược còn lại: "X giờ Y phút Z giây"
 */
export function formatCountdownRemaining(diffMs: number): string {
  if (diffMs <= 0) return "00 giờ 00 phút 00 giây";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days} ngày ${pad(remHours)} giờ ${pad(minutes)} phút ${pad(seconds)} giây`;
  }
  return `${pad(hours)} giờ ${pad(minutes)} phút ${pad(seconds)} giây`;
}



