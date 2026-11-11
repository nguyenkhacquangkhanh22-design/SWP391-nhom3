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
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    bankCode?: string;
  };
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
  rating?: number;
  review_count?: number;
  reviews?: EquipmentReview[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  rental_id?: string | any;
  sender: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
  receiver: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
  message: string;
  message_type: "text" | "contract" | "image";
  file_url?: string;
  contract_data?: {
    contract_number?: string;
    rental_code?: string;
    equipment_title?: string;
    rental_id?: string;
    total_amount?: number;
    status?: string;
    is_signed?: boolean;
  };
  is_read: boolean;
  createdAt: string;
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
  agreedToSign?: boolean;
  agreedAt?: string;
  moderatorApproved?: boolean;
  moderatorStatus?: "none" | "draft" | "pending_renter_signature" | "pending_approval" | "moderator_rejected" | "moderator_approved" | "signed" | string;
  ownerSigned?: boolean;
}

export interface EquipmentReview {
  _id: string;
  rentalCode?: string;
  rating: number;
  comment: string;
  reviewImages?: string[];
  reviewedAt: string;
  renterName: string;
  renterAvatar?: string;
}

export interface RentalPayment {
  isPaid?: boolean;
  paymentStatus: "unpaid" | "pending_confirmation" | "verifying" | "paid" | "rejected" | "refunded" | "refund_pending";
  paymentMethod?: "qr_transfer" | "bank_transfer" | "vnpay" | "momo" | "wallet" | "payos_vietqr" | string;
  transactionId?: string;
  transferNote?: string;
  senderName?: string;
  proofImage?: string;
  submittedAt?: string;
  paidAt?: string;
  amountPaid: number;
  receiptImage?: string;
  orderCode?: number;
  paymentLinkId?: string;
  checkoutUrl?: string;
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
  reviewImages?: string[];
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

export interface RentalRefundInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  refundAmount?: number;
  status?: "pending" | "processed" | "rejected";
  processedAt?: string;
  note?: string;
}

export interface RentalCancellation {
  cancelledBy?: string;
  reason?: string;
  cancelledAt?: string;
  refundInfo?: RentalRefundInfo;
}

export interface RentalExtension {
  extendedAt: string;
  extraDays: number;
  extraFee: number;
  previousEndDate: string;
  newEndDate: string;
  note?: string;
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
  ownerReview?: {
    rating: number;
    trustScoreDelta?: number;
    equipmentPreservation?: string;
    onTimeReturn?: boolean;
    comment?: string;
    reviewedAt?: string;
  };
  dispute?: RentalDispute;
  cancellation?: RentalCancellation;
  extensions?: RentalExtension[];
  hasInsurance?: boolean;
  insuranceFee?: number;
  handoverCheckin?: {
    receivedAt?: string;
    images: string[];
    note?: string;
    confirmedByRenter?: boolean;
  };
  deliveryAddress?: string;
  deliveryTime?: string;
  returnTime?: string;
  deliveryMethod?: string;
  returnMethod?: string;
  shippingFee?: number;
  renterNote?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  rental_id?: string | any;
  sender: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
  receiver: {
    _id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string;
  };
  message: string;
  message_type: "text" | "contract" | "image";
  file_url?: string;
  contract_data?: {
    contract_number?: string;
    rental_code?: string;
    equipment_title?: string;
    rental_id?: string;
    total_amount?: number;
    status?: string;
    is_signed?: boolean;
  };
  is_read: boolean;
  createdAt: string;
}
