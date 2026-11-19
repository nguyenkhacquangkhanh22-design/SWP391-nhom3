/**
 * Cleanroom Lab Maintenance & Kanban Types
 */

export type KanbanColumnStatus =
  | "intake_inspection"
  | "ultrasonic_cleaning"
  | "iso_cleanroom_service"
  | "flange_depth_shimming"
  | "quality_certified_ready";

export interface ISOChecklistStep {
  step_number: number;
  title: string;
  passed: boolean;
  notes: string;
}

export interface CleanroomMetricsLog {
  initial_sensor_dust_spots: number;
  final_sensor_dust_spots: number;
  flange_focal_error_microns: number;
  corrected_flange_error_microns: number;
  collimator_sharpness_score: number;
}

export interface LabMaintenanceWorkOrder {
  _id: string;
  work_order_code: string;
  equipment_id: {
    _id: string;
    title: string;
    brand?: string;
    model?: string;
    images?: string[];
  } | string;
  owner_id: {
    _id: string;
    full_name: string;
    email: string;
    phone?: string;
  } | string;
  technician_name: string;
  equipment_name: string;
  serial_number: string;
  service_type: string;
  kanban_status: KanbanColumnStatus;
  priority: "low" | "normal" | "high" | "emergency_urgent";
  cleanroom_environment: {
    cleanroom_class: string;
    particle_count_per_m3: number;
    temperature_celsius: number;
    relative_humidity_percent: number;
    laminar_flow_velocity_mps: number;
  };
  iso_checklist: ISOChecklistStep[];
  metrics_log: CleanroomMetricsLog;
  total_service_cost: number;
  started_at: string;
  completed_at?: string;
  quality_certificate_qr: string;
  technician_final_verdict: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoardData {
  intake_inspection: LabMaintenanceWorkOrder[];
  ultrasonic_cleaning: LabMaintenanceWorkOrder[];
  iso_cleanroom_service: LabMaintenanceWorkOrder[];
  flange_depth_shimming: LabMaintenanceWorkOrder[];
  quality_certified_ready: LabMaintenanceWorkOrder[];
}

export interface LabMetricsOverview {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  cleanroomStatus: string;
  currentParticleCount: string;
  ambientTemperature: string;
  relativeHumidity: string;
  hepaFilterEfficiency: string;
}

export interface QualityCertificateData {
  certificate_id: string;
  work_order_code: string;
  issued_at: string;
  equipment_name: string;
  serial_number: string;
  cleanroom_class: string;
  particle_count_achieved: string;
  sensor_dust_before: number;
  sensor_dust_after: number;
  flange_focal_error: string;
  sharpness_score: string;
  technician: string;
  verdict: string;
  laboratory: string;
}
