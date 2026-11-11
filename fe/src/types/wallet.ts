export type BankAccountStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  status: BankAccountStatus;
  createdAt?: string;
}

export type WithdrawalStatus = "PENDING" | "COMPLETED" | "REJECTED";

export interface WithdrawalRequest {
  _id: string;
  ownerId:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        User_Id?: string;
        walletBalance?: number;
      };
  amount: number;
  bankInfoSnapshot: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    bankAccountId?: string;
  };
  status: WithdrawalStatus;
  adminNote?: string;
  approvedBy?: string | { _id: string; name: string; email: string };
  createdAt: string;
  completedAt?: string;
}

export interface PendingBankAccountItem {
  userId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  User_Id: string;
  account: BankAccount;
}

// ================= UC_OWNER_08: Lịch sử biến động số dư =================

export type TransactionType =
  | "RENTAL_INCOME"
  | "PLATFORM_FEE"
  | "WITHDRAWAL"
  | "REFUND"
  | "WITHDRAWAL_REFUND";

export type TransactionDirection = "IN" | "OUT";

export type TransactionStatus = "SUCCESS" | "PENDING" | "FAILED" | "REJECTED";

export interface WalletTransaction {
  _id: string;
  transactionCode: string;
  ownerId: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  referenceModel?: "Rental" | "WithdrawalRequest" | "Settlement" | "Other";
  referenceCode?: string;
  description: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  referenceDetail?: any;
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionSummary {
  totalIn: number;
  totalOut: number;
  netChange: number;
}

export interface TransactionFilterParams {
  page?: number;
  limit?: number;
  type?: string;
  direction?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface TransactionsResponse {
  success: boolean;
  data: WalletTransaction[];
  pagination: TransactionPagination;
  summary: TransactionSummary;
}
