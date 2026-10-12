export interface EquipmentOwner {
  _id?: string;
  User_Id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  trust_score?: number;
  kycStatus?: "unverified" | "pending" | "verified" | "rejected";
}

export interface Equipment {
  _id: string;
  title: string;
  description: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  dailyRate: number;
  depositAmount: number;
  status: "AVAILABLE" | "APPROVED" | "RENTED" | "MAINTENANCE" | "UNAVAILABLE";
  images: string[];
  specifications?: Record<string, string>;
  location?: {
    address?: string;
    city?: string;
  };
  owner: EquipmentOwner;
  condition?: "like-new" | "good" | "fair";
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInfo {
  platform: {
    name: string;
    tagline: string;
    version: string;
    description: string;
  };
  stats: {
    availableEquipments: number;
    supportedCategories: string[];
    protectionPolicies: string[];
  };
  contact: {
    email: string;
    hotline: string;
    workingHours: string;
  };
}

export interface RentalContract {
  contractNumber?: string;
  termsAccepted: boolean;
  signedAt?: string;
  digitalSignature?: string;
  contractUrl?: string;
}

export interface RentalPayment {
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod?: "vnpay" | "momo" | "bank_transfer" | "wallet";
  transactionId?: string;
  paidAt?: string;
  amountPaid: number;
}

export interface RentalReturnRequest {
  requestedAt?: string;
  returnNotes?: string;
  deviceConditionNote?: string;
  returnImages?: string[];
}

export interface RentalReview {
  rating: number;
  comment?: string;
  reviewedAt?: string;
}

export interface RentalDispute {
  reason?: string;
  evidenceImages?: string[];
  disputedAt?: string;
  status?: "open" | "investigating" | "resolved";
}

export interface RentalCancellation {
  cancelledBy?: string;
  reason?: string;
  cancelledAt?: string;
}

export interface Rental {
  _id: string;
  rentalCode: string;
  renter: EquipmentOwner | string;
  equipment: Equipment;
  owner: EquipmentOwner;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  rentalFee: number;
  depositAmount: number;
  totalAmount: number;
  status:
    | "pending"
    | "contract_pending"
    | "payment_pending"
    | "confirmed"
    | "in_progress"
    | "return_requested"
    | "completed"
    | "cancelled"
    | "disputed";
  contract: RentalContract;
  payment: RentalPayment;
  returnRequest?: RentalReturnRequest;
  review?: RentalReview;
  dispute?: RentalDispute;
  cancellation?: RentalCancellation;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
