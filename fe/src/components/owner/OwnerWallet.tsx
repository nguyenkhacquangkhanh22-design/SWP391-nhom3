import { useState, useEffect } from "react";
import { useAuth } from "../../app/AuthProvider";
import { walletApi } from "../../services/walletApi";
import type { BankAccount, WithdrawalRequest } from "../../types/wallet";

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

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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

  useEffect(() => {
    if (token) {
      void loadWalletData();
    }
  }, [token]);

  const loadWalletData = async () => {
    setLoading(true);
    setError("");
    try {
      const [walletRes, withdrawalRes] = await Promise.all([
        walletApi.getOwnerBankAccountsAndBalance(token),
        walletApi.getOwnerWithdrawals(token),
      ]);
      setWalletBalance(walletRes.walletBalance || 0);
      setBankAccounts(walletRes.bankAccounts || []);
      setWithdrawals(withdrawalRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu ví");
    } finally {
      setLoading(false);
    }
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?")) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.removeBankAccount(token || "", accountId);
      setBankAccounts(res.data || []);
      setSuccess("Đã xóa tài khoản ngân hàng.");
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
      // Load lại lịch sử rút tiền
      void loadWalletData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tạo yêu cầu rút tiền");
    } finally {
      setActionLoading(false);
    }
  };

  // Điền nhanh số tiền rút
  const handleQuickAmount = (amount: number) => {
    if (amount > walletBalance) {
      setWithdrawAmount(String(walletBalance));
    } else {
      setWithdrawAmount(String(amount));
    }
  };

  return (
    <div className="space-y-6">
      {/* Thông báo lỗi / thành công */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-white font-bold">
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
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Card 1: Số dư ví trung gian & Nút Rút tiền */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2333] via-[#141d2d] to-[#0f1725] border border-[#2b3c59] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>💳</span> Ví Trung Gian SmartEquip
            </div>
            <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              {loading ? "..." : `${walletBalance.toLocaleString("vi-VN")} đ`}
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Doanh thu từ các đơn thuê khi Renter thanh toán thành công qua PayOS sẽ được tự động cộng vào ví trung gian này.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenWithdrawModal}
              disabled={loading || walletBalance <= 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <span>💸</span>
              <span>Rút tiền về ngân hàng</span>
            </button>
            <button
              type="button"
              onClick={() => void loadWalletData()}
              className="p-3 bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Làm mới số dư"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Quản lý tài khoản ngân hàng (Tối đa 3 tài khoản) */}
      <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#212c42]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🏦</span> Tài Khoản Ngân Hàng Nhận Tiền
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#1e2a3f] text-slate-300 border border-slate-700">
                {bankAccounts.length}/3 tài khoản
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Quy định bảo mật: Mỗi Owner chỉ được thêm tối đa 3 tài khoản ngân hàng. Tài khoản mới thêm phải được Admin phê duyệt mới được dùng để rút tiền.
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

        {/* Thông báo nếu đã đạt giới hạn 3 tài khoản */}
        {bankAccounts.length >= 3 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <span>🔒</span>
            <span>Bạn đã đạt giới hạn tối đa 3 tài khoản ngân hàng theo quy định bảo mật của hệ thống.</span>
          </div>
        )}

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
                className="text-slate-400 hover:text-white text-xs font-bold"
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
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

        {/* Danh sách các tài khoản ngân hàng hiện có */}
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
                      {/* Badge trạng thái */}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                          <span>✅</span> Đã duyệt
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0 animate-pulse">
                          <span>⏳</span> Chờ duyệt
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 shrink-0">
                          <span>❌</span> Từ chối
                        </span>
                      )}
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
                      {isApproved
                        ? "🟢 Đủ điều kiện rút tiền"
                        : isPending
                        ? "🟡 Đang chờ Admin xác thực"
                        : "🔴 Không thể dùng"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(acc._id)}
                      disabled={actionLoading}
                      className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card 3: Lịch sử các lệnh rút tiền */}
      <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>📜</span> Lịch Sử Rút Tiền Gần Đây
        </h3>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Chưa có yêu cầu rút tiền nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1a2333] text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Số tiền</th>
                  <th className="p-3">Ngân hàng nhận</th>
                  <th className="p-3">Số tài khoản</th>
                  <th className="p-3">Chủ tài khoản</th>
                  <th className="p-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212c42]">
                {withdrawals.map((w) => (
                  <tr key={w._id} className="hover:bg-[#1a2333]/50">
                    <td className="p-3 whitespace-nowrap text-slate-400">
                      {new Date(w.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 font-bold text-emerald-400 font-mono">
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RÚT TIỀN */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-[#2b3c59] w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💸</span> Rút Tiền Từ Ví Về Ngân Hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white font-bold"
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
                  Theo yêu cầu bảo mật, bạn chỉ có thể rút tiền về tài khoản ngân hàng đã được Quản trị viên (Admin) xét duyệt (trạng thái APPROVED).
                </p>
                <p className="text-slate-400">
                  Vui lòng thêm tài khoản ngân hàng ở mục bên ngoài và chờ Admin phê duyệt trước khi thực hiện rút tiền.
                </p>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  Đã hiểu & Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitWithdrawal} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Số dư khả dụng hiện tại
                  </label>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {walletBalance.toLocaleString("vi-VN")} đ
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Chọn tài khoản ngân hàng nhận tiền *
                  </label>
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-semibold"
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
                    Số tiền muốn rút (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min="10000"
                    max={walletBalance}
                    step="1000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Tối thiểu 10.000 đ"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-mono text-base font-bold"
                    required
                  />

                  {/* Nút chọn nhanh số tiền */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[100000, 200000, 500000, 1000000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAmount(amt)}
                        className="px-2.5 py-1 rounded-lg bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 font-mono text-[11px] border border-slate-700"
                      >
                        {(amt / 1000).toLocaleString()}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleQuickAmount(walletBalance)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/40"
                    >
                      Rút tất cả
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1725] border border-slate-800 text-slate-400 text-[11px] space-y-1">
                  <p className="flex items-center gap-1 text-slate-300 font-semibold">
                    <span>ℹ️</span> Lưu ý khi rút tiền:
                  </p>
                  <p>• Số tiền sẽ được trừ khỏi ví trung gian ngay khi bạn tạo lệnh.</p>
                  <p>• Quản trị viên sẽ tiến hành đối soát và giả lập chuyển khoản đến STK của bạn.</p>
                  <p>• Nếu lệnh bị từ chối, số tiền sẽ được hoàn trả 100% về ví ngay lập tức.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || !withdrawAmount || Number(withdrawAmount) <= 0}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
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

