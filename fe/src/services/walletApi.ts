import axios from "axios";
import type {
  BankAccount,
  PendingBankAccountItem,
  WithdrawalRequest,
} from "../types/wallet";

const getHeaders = (token?: string | null) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

export const walletApi = {
  // ================= OWNER APIS =================

  // Lấy số dư ví và danh sách tài khoản ngân hàng
  getOwnerBankAccountsAndBalance: async (token?: string | null) => {
    const res = await axios.get<{
      success: boolean;
      walletBalance: number;
      bankAccounts: BankAccount[];
    }>("/api/owners/bank-accounts", getHeaders(token));
    return res.data;
  },

  // Thêm tài khoản ngân hàng (tối đa 3 tài khoản, mặc định PENDING)
  addBankAccount: async (
    token: string | null | undefined,
    data: { bankName: string; accountNumber: string; accountHolderName: string }
  ) => {
    const res = await axios.post<{
      success: boolean;
      message: string;
      data: BankAccount[];
    }>("/api/owners/bank-accounts", data, getHeaders(token));
    return res.data;
  },

  // Xóa tài khoản ngân hàng
  removeBankAccount: async (token: string | null | undefined, accountId: string) => {
    const res = await axios.delete<{
      success: boolean;
      message: string;
      data: BankAccount[];
    }>(`/api/owners/bank-accounts/${accountId}`, getHeaders(token));
    return res.data;
  },

  // Tạo lệnh rút tiền từ ví trung gian
  createWithdrawal: async (
    token: string | null | undefined,
    data: { amount: number; bankAccountId: string }
  ) => {
    const res = await axios.post<{
      success: boolean;
      message: string;
      data: WithdrawalRequest;
      remainingBalance: number;
    }>("/api/owners/withdraw", data, getHeaders(token));
    return res.data;
  },

  // Lịch sử rút tiền của Owner
  getOwnerWithdrawals: async (token?: string | null) => {
    const res = await axios.get<{
      success: boolean;
      data: WithdrawalRequest[];
    }>("/api/owners/withdrawals", getHeaders(token));
    return res.data;
  },

  // ================= ADMIN APIS =================

  // Lấy danh sách tài khoản ngân hàng đang chờ duyệt
  getPendingBankAccounts: async (token?: string | null) => {
    const res = await axios.get<{
      success: boolean;
      data: PendingBankAccountItem[];
    }>("/api/admin/bank-accounts/pending", getHeaders(token));
    return res.data;
  },

  // Admin phê duyệt tài khoản ngân hàng
  approveBankAccount: async (
    token: string | null | undefined,
    userId: string,
    accountId: string
  ) => {
    const res = await axios.put<{
      success: boolean;
      message: string;
      data: BankAccount;
    }>(
      `/api/admin/bank-accounts/${userId}/${accountId}/approve`,
      {},
      getHeaders(token)
    );
    return res.data;
  },

  // Admin từ chối tài khoản ngân hàng
  rejectBankAccount: async (token: string | null | undefined, userId: string, accountId: string) => {
    const res = await axios.put<{
      success: boolean;
      message: string;
      data: BankAccount;
    }>(
      `/api/admin/bank-accounts/${userId}/${accountId}/reject`,
      {},
      getHeaders(token)
    );
    return res.data;
  },

  // Lấy danh sách lệnh rút tiền cho Admin
  getAdminWithdrawals: async (token?: string | null, status?: string) => {
    const res = await axios.get<{
      success: boolean;
      data: WithdrawalRequest[];
    }>(
      "/api/admin/withdraw/pending",
      {
        ...getHeaders(token),
        params: status ? { status } : undefined,
      }
    );
    return res.data;
  },

  // Admin duyệt lệnh rút tiền (giả lập chuyển khoản thành công)
  approveWithdrawal: async (token: string | null | undefined, id: string, note?: string) => {
    const res = await axios.put<{
      success: boolean;
      message: string;
      data: WithdrawalRequest;
    }>(`/api/admin/withdraw/${id}/approve`, { note }, getHeaders(token));
    return res.data;
  },

  // Admin từ chối lệnh rút tiền và hoàn tiền ví
  rejectWithdrawal: async (token: string | null | undefined, id: string, note?: string) => {
    const res = await axios.put<{
      success: boolean;
      message: string;
      data: WithdrawalRequest;
      refundedBalance?: number;
    }>(`/api/admin/withdraw/${id}/reject`, { note }, getHeaders(token));
    return res.data;
  },
};
