export interface EquipmentSpec {
  key: string;
  value: string;
}

export interface EquipmentSchedule {
  start_date: string;
  end_date: string;
  status: "available" | "blocked" | "booked";
  note?: string;
}

export interface EquipmentPricing {
  price_per_hour: number;
  price_per_day: number;
  deposit_amount: number;
  weekend_rate?: number;
}

export interface Equipment {
  _id: string;
  owner_id: string | { _id: string; name: string; email: string; trust_score?: number };
  title: string;
  category: string;
  brand: string;
  model_name: string;
  serial_number: string;
  description: string;
  specifications: EquipmentSpec[];
  images: string[];
  accessories: string[];
  condition: string;
  pricing: EquipmentPricing;
  rental_terms: string;
  cancellation_policy: string;
  visibility: "published" | "hidden" | "draft";
  status: "available" | "rented" | "maintenance" | "reserved";
  availability_schedule: EquipmentSchedule[];
  rating: number;
  review_count: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentalRequest {
  _id: string;
  request_code: string;
  equipment_id: Equipment;
  owner_id: string;
  renter_id: string | { _id: string; name: string; email: string; phone?: string };
  renter_name: string;
  renter_phone?: string;
  renter_email?: string;
  rental_type: "daily" | "hourly";
  start_date: string;
  end_date: string;
  duration_days: number;
  duration_hours: number;
  rental_fee: number;
  deposit_amount: number;
  total_amount: number;
  renter_note?: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "contract_created";
  rejection_reason?: string;
  createdAt?: string;
  updatedAt?: string;
}
