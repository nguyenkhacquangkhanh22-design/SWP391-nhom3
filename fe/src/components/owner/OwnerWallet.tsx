import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../app/AuthProvider";
import { walletApi } from "../../services/walletApi";
import type {
  BankAccount,
  WithdrawalRequest,
  WalletTransaction,
  TransactionPagination,
  TransactionSummary,
  TransactionFilterParams,
} from "../../types/wallet";

// Danh sách các ngân hàng phổ biến tại Việt Nam
const POPULAR_BANKS = [
  "MB Bank (Ngân hàng Quân Đội)",
  "Vietcombank (Ngoại thương Việt Nam)",
  "Techcombank (Kỹ thương Việt Nam)",
  "VietinBank (Công thương Việt Nam)",
  "BIDV (Đầu tư và Phát triển)",
  "VPBank (Việt Nam Thịnh Vượng)",
  "ACB (Á Châu)",
  "TPBank (Tiên Phong)",
  "Sacombank (Sài Gòn Thương Tín)",
  "HDBank (Phát triển TP.HCM)",
  "VIB (Quốc Tế)",
  "OCB (Phương Đông)",
  "Agribank (Nông nghiệp & PT Nông thôn)",
  "MSB (Hàng Hải)",
  "SHB (Sài Gòn - Hà Nội)",
  "Khác (Tự nhập)",
];

export default function OwnerWallet() {
  const { token } = useAuth();

  // Sub-tab: Lịch sử biến động số dư (Mặc định) | Lệnh rút tiền | Tài khoản ngân hàng
  const [activeSubTab, setActiveSubTab] = useState<"history" | "withdrawals" | "bankAccounts">("history");

  // State số dư & tài khoản
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // ================= UC_OWNER_08: LỊCH SỬ BIẾN ĐỘNG SỐ DƯ =================
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transLoading, setTransLoading] = useState<boolean>(false);
  const [transError, setTransError] = useState<string>("");
  const [pagination, setPagination] = useState<TransactionPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<TransactionSummary>({
    totalIn: 0,
    totalOut: 0,
    netChange: 0,
  });

  // State bộ lọc (Filter)
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDirection, setFilterDirection] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State xem chi tiết 1 giao dịch
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string>("");

  // State form thêm tài khoản ngân hàng
  const [selectedBank, setSelectedBank] = useState<string>(POPULAR_BANKS[0]);
  const [customBankName, setCustomBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolderName, setAccountHolderName] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // State Modal rút tiền
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  // Load số dư và danh sách tài khoản
  const loadWalletData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [walletRes, withdrawalRes] = await Promise.all([
        walletApi.getOwnerBankAccountsAndBalance(token),
        walletApi.getOwnerWithdrawals(token),
      ]);
      setWalletBalance(walletRes.walletBalance || 0);
      setPendingBalance(walletRes.pendingBalance || 0);
      setBankAccounts(walletRes.bankAccounts || []);
      setWithdrawals(withdrawalRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu ví");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load danh sách biến động số dư (UC_OWNER_08)
  const loadTransactions = useCallback(
    async (pageToLoad: number = 1) => {
      if (!token) return;
      setTransLoading(true);
      setTransError("");
      try {
        const params: TransactionFilterParams = {
          page: pageToLoad,
          limit: 10,
        };

        if (filterType !== "ALL") params.type = filterType;
        if (filterDirection !== "ALL") params.direction = filterDirection;
        if (filterStatus !== "ALL") params.status = filterStatus;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
        if (searchKeyword.trim()) params.search = searchKeyword.trim();

        const res = await walletApi.getOwnerTransactions(token, params);
        setTransactions(res.data || []);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        setSummary(res.summary || { totalIn: 0, totalOut: 0, netChange: 0 });
        setCurrentPage(pageToLoad);
      } catch (err: any) {
        setTransError(
          err.response?.data?.message ||
            err.message ||
            "Không thể tải lịch sử biến động số dư. Vui lòng thử lại!"
        );
      } finally {
        setTransLoading(false);
      }
    },
    [
      token,
      filterType,
      filterDirection,
      filterStatus,
      filterStartDate,
      filterEndDate,
      searchKeyword,
    ]
  );

  useEffect(() => {
    if (token) {
      void loadWalletData();
      void loadTransactions(1);
    }
  }, [token, loadWalletData, loadTransactions]);

  // Áp dụng bộ lọc
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    void loadTransactions(1);
  };

  // Đặt lại bộ lọc (Reset)
  const handleResetFilter = () => {
    setFilterType("ALL");
    setFilterDirection("ALL");
    setFilterStatus("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSearchKeyword("");
    // Trigger tải lại trang 1 với params mặc định
    setTimeout(() => {
      if (!token) return;
      setTransLoading(true);
      walletApi
        .getOwnerTransactions(token, { page: 1, limit: 10 })
        .then((res) => {
          setTransactions(res.data || []);
          setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          setSummary(res.summary || { totalIn: 0, totalOut: 0, netChange: 0 });
          setCurrentPage(1);
        })
        .catch(() => {})
        .finally(() => setTransLoading(false));
    }, 50);
  };

  // Xem chi tiết 1 giao dịch
  const handleViewDetail = async (txId: string) => {
    const cached = transactions.find((t) => t._id === txId) || null;
    setSelectedTransaction(cached);
    setDetailLoading(true);
    try {
      const res = await walletApi.getOwnerTransactionDetail(token, txId);
      setSelectedTransaction(res.data);
    } catch {
      // Fallback lấy từ danh sách hiện tại nếu API chi tiết có trục trặc
    } finally {
      setDetailLoading(false);
    }
  };

  // Sao chép mã giao dịch
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // Thêm tài khoản ngân hàng
  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (bankAccounts.length >= 3) {
      setError("Bạn chỉ được thêm tối đa 3 tài khoản ngân hàng theo quy định.");
      return;
    }

    const finalBankName = selectedBank === "Khác (Tự nhập)" ? customBankName.trim() : selectedBank;
    if (!finalBankName) {
      setError("Vui lòng chọn hoặc nhập tên ngân hàng.");
      return;
    }
    if (!accountNumber.trim()) {
      setError("Vui lòng nhập số tài khoản ngân hàng.");
      return;
    }
    if (!accountHolderName.trim()) {
      setError("Vui lòng nhập họ và tên chủ tài khoản.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await walletApi.addBankAccount(token || "", {
        bankName: finalBankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
      });
      setBankAccounts(res.data || []);
      setSuccess("Thêm tài khoản ngân hàng thành công! Đang chờ Quản trị viên (Admin) xét duyệt.");
      setAccountNumber("");
      setAccountHolderName("");
      setCustomBankName("");
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể thêm tài khoản ngân hàng");
    } finally {
      setActionLoading(false);
    }
  };

  // Xóa tài khoản ngân hàng
  const handleRemoveBankAccount = async (accountId: string) => {
    const acc = bankAccounts.find((a) => a._id === accountId);
    const pendingWithdrawal = withdrawals.find(
      (w) =>
        w.status === "PENDING" &&
        (w.bankInfoSnapshot?.bankAccountId === accountId ||
          (acc &&
            w.bankInfoSnapshot?.accountNumber === acc.accountNumber &&
            w.bankInfoSnapshot?.bankName === acc.bankName))
    );
    if (pendingWithdrawal) {
      setError(
        `Không thể xóa tài khoản ngân hàng này vì đang có Lệnh rút tiền ${pendingWithdrawal.amount.toLocaleString(
          "vi-VN"
        )} đ ở trạng thái chờ duyệt (PENDING). Vui lòng đợi Admin xử lý xong hoặc từ chối lệnh rút tiền trước khi xóa.`
      );
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?")) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.removeBankAccount(token || "", accountId);
      setBankAccounts(res.data || []);
      setSuccess("Đã xóa tài khoản ngân hàng thành công.");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể xóa tài khoản");
    } finally {
      setActionLoading(false);
    }
  };

  // Chỉ lấy danh sách tài khoản đã được Admin APPROVED
  const approvedAccounts = bankAccounts.filter((acc) => acc.status === "APPROVED");

  // Mở modal rút tiền
  const handleOpenWithdrawModal = () => {
    setError("");
    setSuccess("");
    if (approvedAccounts.length > 0) {
      setSelectedBankAccountId(approvedAccounts[0]._id);
    } else {
      setSelectedBankAccountId("");
    }
    setWithdrawAmount("");
    setShowWithdrawModal(true);
  };

  // Tạo lệnh rút tiền
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum < 10000) {
      setError("Số tiền rút tối thiểu là 10.000 đ.");
      return;
    }
    if (amountNum > walletBalance) {
      setError(`Số dư ví không đủ (Hiện có: ${walletBalance.toLocaleString("vi-VN")} đ).`);
      return;
    }
    if (!selectedBankAccountId) {
      setError("Vui lòng chọn một tài khoản ngân hàng đã được phê duyệt.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await walletApi.createWithdrawal(token || "", {
        amount: amountNum,
        bankAccountId: selectedBankAccountId,
      });
      setSuccess(res.message);
      setWalletBalance(res.remainingBalance);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      // Load lại dữ liệu ví và lịch sử biến động số dư
      void loadWalletData();
      void loadTransactions(1);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tạo yêu cầu rút tiền");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper format loại giao dịch
  const renderTransactionTypeBadge = (type: string, direction: "IN" | "OUT") => {
    switch (type) {
      case "RENTAL_INCOME":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span>💰</span> Tiền thuê thiết bị
          </span>
        );
      case "WITHDRAWAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span>💸</span> Rút tiền về ngân hàng
          </span>
        );
      case "WITHDRAWAL_REFUND":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <span>🔄</span> Hoàn tiền lệnh rút
          </span>
        );
      case "REFUND":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span>⚖️</span> Hoàn tiền / Bồi thường
          </span>
        );
      case "PLATFORM_FEE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <span>🏷️</span> Phí sàn nền tảng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-600/20 text-slate-300 border border-slate-600/30">
            {direction === "IN" ? "🟢 Tiền vào" : "🔴 Tiền ra"}
          </span>
        );
    }
  };

  // Helper format trạng thái giao dịch
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <span>✅</span> Thành công
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <span>⏳</span> Đang xử lý
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <span>❌</span> Bị từ chối
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <span>⚠️</span> Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner thông báo lỗi / thành công */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-white font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ================= PHẦN THÔNG TIN TỔNG QUAN VÍ (AVAILABLE & PENDING BALANCE) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Số dư khả dụng (Available Balance) */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2333] via-[#141d2d] to-[#0f1725] border border-[#2b3c59] p-6 shadow-xl flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>💳</span> Số dư hiện tại (Available Balance)
              </div>
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                {loading ? "..." : `${walletBalance.toLocaleString("vi-VN")} đ`}
              </div>
              <p className="text-xs text-slate-400 max-w-lg">
                Doanh thu từ các đơn thuê khi Renter thanh toán thành công sẽ được tự động cộng vào đây và có thể rút bất kỳ lúc nào.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenWithdrawModal}
                disabled={loading || walletBalance <= 0}
                className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <span>💸</span>
                <span>Rút tiền</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void loadWalletData();
                  void loadTransactions(currentPage);
                }}
                className="p-3 bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
                title="Làm mới số dư & giao dịch"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Số dư đang chờ xử lý (Pending Balance) */}
        <div className="relative overflow-hidden rounded-2xl bg-[#141d2d] border border-[#2b3c59] p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏳</span> Đang chờ xử lý
              </span>
              {pendingBalance > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  Đang duyệt
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
              {loading ? "..." : `${pendingBalance.toLocaleString("vi-VN")} đ`}
            </div>
            <p className="text-[11px] text-slate-400">
              Số tiền từ các lệnh rút tiền đang ở trạng thái Chờ duyệt (PENDING) chờ Admin đối soát và chuyển khoản.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tài khoản liên kết:</span>
            <span className="font-bold text-slate-200">
              {bankAccounts.length}/3 tài khoản
            </span>
          </div>
        </div>
      </div>

      {/* ================= SUB-NAVIGATION TABS (LỊCH SỬ BIẾN ĐỘNG / LỆNH RÚT / NGÂN HÀNG) ================= */}
      <div className="flex items-center gap-2 border-b border-[#212c42] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "history"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30"
              : "bg-[#141d2d] text-slate-400 hover:text-white hover:bg-[#1a2538] border border-[#223049]"
          }`}
        >
          <span>📊</span>
          <span>Lịch Sử Biến Động Số Dư (UC_OWNER_08)</span>
          {pagination.total > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-amber-200 font-mono">
              {pagination.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("withdrawals")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "withdrawals"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30"
              : "bg-[#141d2d] text-slate-400 hover:text-white hover:bg-[#1a2538] border border-[#223049]"
          }`}
        >
          <span>📜</span>
          <span>Yêu Cầu Rút Tiền</span>
          {withdrawals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-slate-300 font-mono">
              {withdrawals.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("bankAccounts")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "bankAccounts"
              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30"
              : "bg-[#141d2d] text-slate-400 hover:text-white hover:bg-[#1a2538] border border-[#223049]"
          }`}
        >
          <span>🏦</span>
          <span>Tài Khoản Ngân Hàng</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-slate-300 font-mono">
            {bankAccounts.length}/3
          </span>
        </button>
      </div>

      {/* ================= TAB 1: LỊCH SỬ BIẾN ĐỘNG SỐ DƯ (UC_OWNER_08) ================= */}
      {activeSubTab === "history" && (
        <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-6 animate-fadeIn">
          {/* Header & Tiêu đề */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#212c42]">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📈</span> Lịch Sử Biến Động Số Dư
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Theo dõi chi tiết tất cả các khoản tiền vào/ra trên ví của bạn: tiền thuê máy, rút tiền về ngân hàng, hoàn tiền sự cố và phí nền tảng.
              </p>
            </div>

            {/* Quick summary metrics */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="text-slate-400 mr-1.5">Tiền vào:</span>
                <span className="font-bold font-mono">+{summary.totalIn.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
                <span className="text-slate-400 mr-1.5">Tiền ra:</span>
                <span className="font-bold font-mono">-{summary.totalOut.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>
          </div>

          {/* BỘ LỌC TÌM KIẾM (FLOW 4a: FILTER) */}
          <form
            onSubmit={handleApplyFilter}
            className="p-4 rounded-xl bg-[#0f1725] border border-[#212f45] space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* 1. Từ ngày */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Từ ngày (From)</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 2. Đến ngày */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Đến ngày (To)</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 3. Loại giao dịch */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Loại giao dịch</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ALL">Tất cả loại giao dịch</option>
                  <option value="RENTAL_INCOME">💰 Tiền thuê máy (Thu nhập)</option>
                  <option value="WITHDRAWAL">💸 Rút tiền về ngân hàng</option>
                  <option value="WITHDRAWAL_REFUND">🔄 Hoàn tiền ví (Lệnh rút bị từ chối)</option>
                  <option value="REFUND">⚖️ Hoàn tiền khách / Bồi thường</option>
                  <option value="PLATFORM_FEE">🏷️ Phí nền tảng</option>
                </select>
              </div>

              {/* 4. Trạng thái */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Trạng thái</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="SUCCESS">✅ Thành công</option>
                  <option value="PENDING">⏳ Đang xử lý</option>
                  <option value="REJECTED">❌ Bị từ chối</option>
                </select>
              </div>

              {/* 5. Tìm kiếm từ khóa */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Tìm kiếm từ khóa</label>
                <input
                  type="text"
                  placeholder="Mã GD, mô tả, mã đơn..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetFilter}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              >
                🔄 Đặt lại
              </button>
              <button
                type="submit"
                disabled={transLoading}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {transLoading ? "Đang lọc..." : "🔍 Lọc giao dịch"}
              </button>
            </div>
          </form>

          {/* Lỗi tải giao dịch (Flow 4b.2: Lỗi kết nối / Server) */}
          {transError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{transError}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadTransactions(currentPage)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                🔄 Thử lại
              </button>
            </div>
          )}

          {/* BẢNG DANH SÁCH GIAO DỊCH */}
          {transLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="text-2xl animate-spin">⏳</div>
              <p className="text-xs">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : transactions.length === 0 ? (
            /* Flow 4b.1: Không có giao dịch nào */
            <div className="p-10 text-center rounded-xl bg-[#0f1725] border border-dashed border-slate-800 space-y-3">
              <div className="text-4xl text-slate-500">📜</div>
              <p className="text-sm font-bold text-slate-300">Chưa có lịch sử giao dịch nào</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi khách thuê thanh toán đơn máy hoặc bạn thực hiện lệnh rút tiền về ngân hàng, các biến động số dư sẽ được hiển thị đầy đủ tại đây.
              </p>
              {(filterType !== "ALL" || filterStatus !== "ALL" || filterStartDate || filterEndDate || searchKeyword) && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#1e2a3f] hover:bg-[#283854] text-orange-400 text-xs font-semibold cursor-pointer"
                >
                  Xóa bộ lọc hiện tại
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-[#212c42]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#1a2333] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Mã GD</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Loại giao dịch</th>
                      <th className="p-3">Mô tả & Tham chiếu</th>
                      <th className="p-3 text-right">Số tiền thay đổi</th>
                      <th className="p-3 text-right">Số dư sau GD</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#212c42]">
                    {transactions.map((tx) => {
                      const isMoneyIn = tx.direction === "IN";
                      return (
                        <tr
                          key={tx._id}
                          className="hover:bg-[#1a2333]/50 transition-colors group"
                        >
                          {/* Mã GD */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-200">
                                {tx.transactionCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(tx.transactionCode)}
                                className="text-slate-500 hover:text-orange-400 transition-colors text-[11px]"
                                title="Sao chép mã giao dịch"
                              >
                                {copiedCode === tx.transactionCode ? "✓" : "📋"}
                              </button>
                            </div>
                          </td>

                          {/* Thời gian */}
                          <td className="p-3 whitespace-nowrap text-slate-400 text-[11px]">
                            {new Date(tx.createdAt).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>

                          {/* Loại giao dịch */}
                          <td className="p-3 whitespace-nowrap">
                            {renderTransactionTypeBadge(tx.type, tx.direction)}
                          </td>

                          {/* Mô tả & Tham chiếu */}
                          <td className="p-3 max-w-xs">
                            <div className="text-slate-200 truncate font-medium" title={tx.description}>
                              {tx.description}
                            </div>
                            {tx.referenceCode && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Tham chiếu: <span className="text-orange-400/90">{tx.referenceCode}</span>
                              </div>
                            )}
                          </td>

                          {/* Số tiền thay đổi */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isMoneyIn ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isMoneyIn ? "+" : "-"}
                              {tx.amount.toLocaleString("vi-VN")} đ
                            </span>
                          </td>

                          {/* Số dư sau giao dịch */}
                          <td className="p-3 text-right whitespace-nowrap font-mono text-slate-400">
                            {tx.balanceAfter !== undefined
                              ? `${tx.balanceAfter.toLocaleString("vi-VN")} đ`
                              : "-"}
                          </td>

                          {/* Trạng thái */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {renderStatusBadge(tx.status)}
                          </td>

                          {/* Thao tác */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(tx._id)}
                              className="px-2.5 py-1 rounded-lg bg-[#1e2a3f] hover:bg-orange-600 text-slate-300 hover:text-white font-semibold text-[11px] transition-all cursor-pointer"
                              title="Xem chi tiết giao dịch này"
                            >
                              👁️ Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PHÂN TRANG (PAGINATION) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                <div>
                  Hiển thị{" "}
                  <strong className="text-slate-200">
                    {transactions.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-slate-200">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong>{" "}
                  trong tổng số <strong className="text-slate-200">{pagination.total}</strong> giao dịch
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void loadTransactions(pagination.page - 1)}
                    disabled={pagination.page <= 1 || transLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold transition-all"
                  >
                    ◀ Trước
                  </button>

                  <span className="px-3 py-1.5 rounded-lg bg-[#0f1725] text-slate-300 font-mono font-bold border border-slate-800">
                    {pagination.page} / {pagination.totalPages || 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => void loadTransactions(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || transLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold transition-all"
                  >
                    Sau ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: YÊU CẦU RÚT TIỀN (WITHDRAWALS) ================= */}
      {activeSubTab === "withdrawals" && (
        <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#212c42]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📜</span> Danh Sách Yêu Cầu Rút Tiền Về Ngân Hàng
            </h3>
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={loading || walletBalance <= 0}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>💸</span> Rút tiền ngay
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0f1725] border border-dashed border-slate-800 space-y-2">
              <p className="text-xs text-slate-400">Chưa có yêu cầu rút tiền nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#212c42]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1a2333] text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Thời gian tạo</th>
                    <th className="p-3">Số tiền rút</th>
                    <th className="p-3">Ngân hàng nhận</th>
                    <th className="p-3">Số tài khoản</th>
                    <th className="p-3">Chủ tài khoản</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212c42]">
                  {withdrawals.map((w) => (
                    <tr key={w._id} className="hover:bg-[#1a2333]/50">
                      <td className="p-3 whitespace-nowrap text-slate-400">
                        {new Date(w.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="p-3 font-bold text-emerald-400 font-mono text-sm">
                        {w.amount.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="p-3">{w.bankInfoSnapshot?.bankName}</td>
                      <td className="p-3 font-mono font-semibold">{w.bankInfoSnapshot?.accountNumber}</td>
                      <td className="p-3 uppercase">{w.bankInfoSnapshot?.accountHolderName}</td>
                      <td className="p-3">
                        {w.status === "COMPLETED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ✅ Đã chuyển tiền
                          </span>
                        )}
                        {w.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            ⏳ Chờ Admin duyệt
                          </span>
                        )}
                        {w.status === "REJECTED" && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 cursor-help"
                            title={w.adminNote || "Đã hoàn lại tiền vào ví"}
                          >
                            ❌ Đã từ chối (Đã hoàn tiền)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 max-w-xs truncate" title={w.adminNote || ""}>
                        {w.adminNote || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: QUẢN LÝ TÀI KHOẢN NGÂN HÀNG (BANK ACCOUNTS) ================= */}
      {activeSubTab === "bankAccounts" && (
        <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#212c42]">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏦</span> Tài Khoản Ngân Hàng Nhận Tiền
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#1e2a3f] text-slate-300 border border-slate-700">
                  {bankAccounts.length}/3 tài khoản
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Quy định bảo mật: Mỗi Owner chỉ được thêm tối đa 3 tài khoản ngân hàng chính chủ. Tài khoản mới thêm phải được Admin phê duyệt mới được dùng để rút tiền.
              </p>
            </div>

            {bankAccounts.length < 3 && !showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span>
                <span>Thêm tài khoản ngân hàng</span>
              </button>
            )}
          </div>

          {/* Form thêm tài khoản ngân hàng */}
          {showAddForm && bankAccounts.length < 3 && (
            <form
              onSubmit={handleAddBankAccount}
              className="p-5 rounded-xl bg-[#0f1725] border border-orange-500/30 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-bold text-orange-400 flex items-center gap-1.5">
                  <span>➕</span> Thêm Tài Khoản Ngân Hàng Mới (Chờ Admin duyệt)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  ✕ Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ngân hàng *</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {selectedBank === "Khác (Tự nhập)" && (
                    <input
                      type="text"
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      placeholder="Nhập tên ngân hàng của bạn..."
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số tài khoản *</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Ví dụ: 1903678912345"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tên chủ tài khoản (Viết hoa không dấu) *</label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: NGUYEN VAN A"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Đang gửi..." : "Gửi yêu cầu xét duyệt"}
                </button>
              </div>
            </form>
          )}

          {/* Danh sách các tài khoản ngân hàng */}
          {bankAccounts.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0f1725] border border-dashed border-slate-800 space-y-2">
              <div className="text-3xl">🏦</div>
              <p className="text-sm font-semibold text-slate-300">Chưa có tài khoản ngân hàng nào</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Vui lòng thêm ít nhất một tài khoản ngân hàng chính chủ để Admin phê duyệt trước khi tạo lệnh rút tiền.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bankAccounts.map((acc) => {
                const isApproved = acc.status === "APPROVED";
                const isPending = acc.status === "PENDING";
                const isRejected = acc.status === "REJECTED";

                const pendingWithdrawal = withdrawals.find(
                  (w) =>
                    w.status === "PENDING" &&
                    (w.bankInfoSnapshot?.bankAccountId === acc._id ||
                      (w.bankInfoSnapshot?.accountNumber === acc.accountNumber &&
                        w.bankInfoSnapshot?.bankName === acc.bankName))
                );

                return (
                  <div
                    key={acc._id}
                    className={`p-4 rounded-xl border relative flex flex-col justify-between transition-all ${
                      isApproved
                        ? "bg-[#10221e] border-emerald-500/40 shadow-emerald-500/5"
                        : isPending
                        ? "bg-[#251f15] border-amber-500/40 shadow-amber-500/5"
                        : "bg-[#221316] border-rose-500/40"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 truncate" title={acc.bankName}>
                          {acc.bankName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {pendingWithdrawal && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1"
                              title={`Đang có lệnh rút ${pendingWithdrawal.amount.toLocaleString("vi-VN")} đ chờ Admin chuyển tiền`}
                            >
                              <span>🔒</span> Lệnh rút chờ duyệt
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <span>✅</span> Đã duyệt
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                              <span>⏳</span> Chờ duyệt
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                              <span>❌</span> Từ chối
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-base font-mono font-bold text-white tracking-wider">
                        {acc.accountNumber}
                      </div>

                      <div className="text-xs text-slate-400 font-semibold uppercase">
                        {acc.accountHolderName}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {pendingWithdrawal
                          ? `🔒 Có lệnh rút ${pendingWithdrawal.amount.toLocaleString("vi-VN")} đ`
                          : isApproved
                          ? "🟢 Đủ điều kiện rút tiền"
                          : isPending
                          ? "🟡 Đang chờ Admin xác thực"
                          : "🔴 Không thể dùng"}
                      </span>
                      {pendingWithdrawal ? (
                        <span
                          className="text-slate-500 font-medium text-[11px] cursor-not-allowed flex items-center gap-1"
                          title="Không thể xóa tài khoản này vì đang có lệnh rút tiền chờ Admin duyệt đối soát"
                        >
                          🔒 Khóa xóa
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveBankAccount(acc._id)}
                          disabled={actionLoading}
                          className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL CHI TIẾT GIAO DỊCH (TRANSACTION DETAIL MODAL) ================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#2b3c59] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            {/* Header modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Chi Tiết Biến Động Số Dư</span>
                  {detailLoading && (
                    <span className="text-[11px] text-amber-400 font-normal animate-pulse">
                      (Đang tải...)
                    </span>
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Số tiền highlight */}
            <div className="p-4 rounded-xl bg-[#0f1725] border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold">
                  Số tiền thay đổi
                </div>
                <div
                  className={`text-2xl font-black font-mono mt-0.5 ${
                    selectedTransaction.direction === "IN" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {selectedTransaction.direction === "IN" ? "+" : "-"}
                  {selectedTransaction.amount.toLocaleString("vi-VN")} đ
                </div>
              </div>
              <div className="text-right space-y-1">
                <div>{renderStatusBadge(selectedTransaction.status)}</div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {selectedTransaction.direction === "IN" ? "Tiền cộng vào ví" : "Tiền trừ khỏi ví"}
                </div>
              </div>
            </div>

            {/* Chi tiết thông số */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Mã giao dịch:</span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedTransaction.transactionCode}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Loại giao dịch:</span>
                <span>{renderTransactionTypeBadge(selectedTransaction.type, selectedTransaction.direction)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Thời gian thực hiện:</span>
                <span className="font-mono text-slate-300">
                  {new Date(selectedTransaction.createdAt).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Số dư trước giao dịch:</span>
                <span className="font-mono font-bold text-slate-300">
                  {selectedTransaction.balanceBefore !== undefined
                    ? `${selectedTransaction.balanceBefore.toLocaleString("vi-VN")} đ`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Số dư sau giao dịch:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedTransaction.balanceAfter !== undefined
                    ? `${selectedTransaction.balanceAfter.toLocaleString("vi-VN")} đ`
                    : "-"}
                </span>
              </div>

              <div className="py-1.5 border-b border-slate-800/80 space-y-1">
                <span className="text-slate-400 block">Nội dung mô tả:</span>
                <p className="text-slate-200 bg-[#0f1725] p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                  {selectedTransaction.description}
                </p>
              </div>

              {/* Thông tin bản ghi liên quan (Rental hoặc Withdrawal) */}
              {selectedTransaction.referenceDetail && (
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-2">
                  <div className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <span>🔗</span> Thông Tin Đơn Hàng / Lệnh Liên Quan
                  </div>

                  {selectedTransaction.referenceModel === "Rental" && (
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div>
                        Đơn thuê: <strong className="text-white">#{selectedTransaction.referenceDetail.rentalCode}</strong>
                      </div>
                      {selectedTransaction.referenceDetail.equipment?.title && (
                        <div>
                          Thiết bị: <span className="text-slate-200">{selectedTransaction.referenceDetail.equipment.title}</span>
                        </div>
                      )}
                      {selectedTransaction.referenceDetail.renter?.name && (
                        <div>
                          Khách thuê: <span className="text-slate-200">{selectedTransaction.referenceDetail.renter.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTransaction.referenceModel === "WithdrawalRequest" && (
                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div>
                        Ngân hàng nhận:{" "}
                        <strong className="text-white">
                          {selectedTransaction.referenceDetail.bankInfoSnapshot?.bankName} (
                          {selectedTransaction.referenceDetail.bankInfoSnapshot?.accountNumber})
                        </strong>
                      </div>
                      <div>
                        Chủ tài khoản:{" "}
                        <span className="text-slate-200 uppercase font-semibold">
                          {selectedTransaction.referenceDetail.bankInfoSnapshot?.accountHolderName}
                        </span>
                      </div>
                      {selectedTransaction.referenceDetail.adminNote && (
                        <div>
                          Ghi chú Admin:{" "}
                          <span className="text-amber-300">
                            {selectedTransaction.referenceDetail.adminNote}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL RÚT TIỀN (WITHDRAW MODAL) ================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#2b3c59] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💸</span> Rút Tiền Từ Ví Về Ngân Hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cảnh báo nếu không có tài khoản APPROVED */}
            {approvedAccounts.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span> Chưa có tài khoản ngân hàng đủ điều kiện!
                </p>
                <p>
                  Bạn cần có ít nhất một tài khoản ngân hàng đã được Quản trị viên (Admin) phê duyệt trước khi có thể rút tiền.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setActiveSubTab("bankAccounts");
                      setShowAddForm(true);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                  >
                    Thêm tài khoản ngay
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitWithdrawal} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Số dư khả dụng hiện tại
                  </label>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {walletBalance.toLocaleString("vi-VN")} đ
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chọn tài khoản nhận tiền *
                  </label>
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                    required
                  >
                    {approvedAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.bankName} - {acc.accountNumber} ({acc.accountHolderName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Số tiền cần rút (VND) *
                  </label>
                  <input
                    type="number"
                    min="10000"
                    max={walletBalance}
                    step="1000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Tối thiểu 10.000 đ"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-orange-500 font-mono text-sm"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(Math.min(500000, walletBalance)))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      500.000 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(Math.min(1000000, walletBalance)))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                    >
                      1.000.000 đ
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(walletBalance))}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[11px] font-semibold"
                    >
                      Rút tất cả
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed bg-[#0f1725] p-3 rounded-xl border border-slate-800">
                  * Sau khi tạo lệnh rút, số tiền sẽ được trừ tạm thời khỏi số dư khả dụng và chuyển vào trạng thái <strong>Đang chờ xử lý</strong>. Admin sẽ kiểm tra và chuyển tiền đến tài khoản của bạn.
                </p>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !withdrawAmount || Number(withdrawAmount) < 10000}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác nhận rút tiền"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
