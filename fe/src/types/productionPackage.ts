/**
 * Production Project Package & Power Budget Types
 */

export interface DepartmentEquipmentItem {
  equipment_id?: string;
  item_name: string;
  quantity: number;
  daily_price: number;
  power_draw_watts: number;
  lens_mount?: string;
  color_temp_kelvin?: string;
  channel_count?: number;
  max_payload_kg?: number;
  notes?: string;
}

export interface ProductionDepartments {
  camera_a: DepartmentEquipmentItem[];
  camera_b: DepartmentEquipmentItem[];
  lighting: DepartmentEquipmentItem[];
  sound: DepartmentEquipmentItem[];
  grip_stabilizer: DepartmentEquipmentItem[];
}

export interface PowerBudgetSummary {
  total_camera_rig_watts: number;
  total_lighting_watts: number;
  total_audio_grip_watts: number;
  grand_total_watts: number;
  daily_required_watt_hours: number;
  recommended_vmount_batteries_count: number;
  recommended_power_stations_count: number;
  ac_generator_needed: boolean;
}

export interface PricingSummary {
  subtotal_daily: number;
  total_before_discount: number;
  multi_day_discount_percent: number;
  discount_amount: number;
  package_total: number;
  security_deposit: number;
}

export interface ProductionProjectPackage {
  _id: string;
  creator_id: {
    _id: string;
    full_name: string;
    email: string;
  } | string;
  project_title: string;
  production_type: "feature_film" | "commercial_tvc" | "music_video" | "documentary" | "event_livestream" | "short_film";
  client_name: string;
  director_of_photography: string;
  start_date: string;
  end_date: string;
  shooting_days: number;
  daily_shooting_hours: number;
  departments: ProductionDepartments;
  power_budget: PowerBudgetSummary;
  pricing_summary: PricingSummary;
  status: "draft" | "submitted_for_quote" | "confirmed" | "in_production" | "completed" | "cancelled";
  logistics: {
    on_set_location: string;
    delivery_mode: "crew_pickup" | "direct_van_delivery";
    special_instructions: string;
  };
  master_agreement_code: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionPackageTemplate {
  template_id: string;
  title: string;
  description: string;
  estimated_daily_price: number;
  departments: ProductionDepartments;
}

export interface PowerSimulatorResult {
  totalWatts: number;
  singleBatteryRuntimeHours: number;
  recommendedBatteryCount: number;
  powerStrategy: {
    dailyTotalWattHours: number;
    powerSourceRecommendation: string;
    generatorRequired: boolean;
    safetyAdvice: string;
    vmount150WhPacksSuggested: number;
  };
  powerPresets: Record<string, { name: string; watts: number; voltage: string }>;
}
