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

