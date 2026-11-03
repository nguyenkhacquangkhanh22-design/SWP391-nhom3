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
  contractTerms?: string;
  termsAccepted: boolean;
  signedAt?: string;
  renterSignature?: string;
  digitalSignature?: string;
  contractUrl?: string;
  moderatorApproved?: boolean;
  moderatorStatus?: "none" | "draft" | "pending_approval" | "moderator_rejected" | "moderator_approved" | "signed" | string;
  ownerSigned?: boolean;
}

export interface RentalPayment {
  isPaid?: boolean;
  paymentStatus: "unpaid" | "verifying" | "paid" | "rejected" | "refunded";
  paymentMethod?: "qr_transfer" | "bank_transfer" | "vnpay" | "momo" | "wallet" | string;
  transactionId?: string;
  transferNote?: string;
  senderName?: string;
  proofImage?: string;
  submittedAt?: string;
  paidAt?: string;
  amountPaid: number;
  verifiedBy?: { _id?: string; name: string; email: string } | string;
  verifiedAt?: string;
  moderatorNote?: string;
}

export interface RentalReturnRequest {
  requestedAt?: string;
  returnCondition?: string;
  returnNote?: string;
  returnTime?: string;
  returnLocation?: string;
  returnNotes?: string;
  deviceConditionNote?: string;
  returnImages?: string[];
}

export interface RentalReview {
  rating: number;
  comment?: string;
  reviewedAt?: string;
  createdAt?: string;
}

export interface RentalDispute {
  reason?: string;
  description?: string;
  evidenceImages?: string[];
  disputedAt?: string;
  status?: "open" | "investigating" | "resolved" | string;
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
  discountAmount?: number;
  totalAmount: number;
  status:
    | "PENDING"
    | "APPROVED"
    | "CONTRACT_SIGNED"
    | "PAYMENT_VERIFYING"
    | "PAYMENT_REJECTED"
    | "PAID"
    | "ACTIVE"
    | "RETURNED"
    | "COMPLETED"
    | "CANCELLED"
    | "DISPUTED"
    | "pending"
    | "approved"
    | "contract_pending"
    | "payment_pending"
    | "payment_verifying"
    | "payment_rejected"
    | "confirmed"
    | "in_progress"
    | "return_requested"
    | "completed"
    | "cancelled"
    | "disputed";
  contract: RentalContract;
  payment: RentalPayment;
  returnInfo?: RentalReturnRequest;
  returnRequest?: RentalReturnRequest;
  review?: RentalReview;
  dispute?: RentalDispute;
  cancellation?: RentalCancellation;
  deliveryAddress?: string;
  renterNote?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
