import { useState, useEffect } from "react";
import { useAuth } from "../../app/AuthProvider";
import { walletApi } from "../../services/walletApi";
import type { PendingBankAccountItem, WithdrawalRequest } from "../../types/wallet";

export default function AdminFinanceManager() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"banks" | "withdrawals">("banks");

  // State Tab 1: Duyệt Ngân Hàng
  const [pendingBanks, setPendingBanks] = useState<PendingBankAccountItem[]>([]);
  const [loadingBanks, setLoadingBanks] = useState<boolean>(true);

  // State Tab 2: Duyệt Rút Tiền
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>("PENDING");
  const [loadingWithdrawals, setLoadingWithdrawals] = useState<boolean>(true);

  // General state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Modal Từ chối rút tiền kèm lý do
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectNote, setRejectNote] = useState<string>("");

  useEffect(() => {
    if (token) {
      if (activeTab === "banks") {
        void loadPendingBanks();
      } else {
        void loadWithdrawals(withdrawalFilter);
      }
    }
  }, [token, activeTab, withdrawalFilter]);

  const loadPendingBanks = async () => {
    setLoadingBanks(true);
    setError("");
    try {
      const res = await walletApi.getPendingBankAccounts(token);
      setPendingBanks(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách ngân hàng chờ duyệt");
    } finally {
      setLoadingBanks(false);
    }
  };

  const loadWithdrawals = async (statusFilter?: string) => {
    setLoadingWithdrawals(true);
    setError("");
    try {
      const res = await walletApi.getAdminWithdrawals(
        token,
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setWithdrawals(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải danh sách lệnh rút tiền");
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  // Admin Duyệt tài khoản ngân hàng
  const handleApproveBank = async (userId: string, accountId: string, ownerName: string) => {
    if (!window.confirm(`Xác nhận phê duyệt tài khoản ngân hàng này cho Owner "${ownerName}"?`)) return;
    setActionLoadingId(accountId);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.approveBankAccount(token || "", userId, accountId);
      setSuccess(res.message);
      // Xóa khỏi danh sách chờ duyệt
      setPendingBanks((prev) => prev.filter((item) => item.account._id !== accountId));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi phê duyệt tài khoản ngân hàng");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin Từ chối tài khoản ngân hàng
  const handleRejectBank = async (userId: string, accountId: string, ownerName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn TỪ CHỐI tài khoản ngân hàng này của Owner "${ownerName}"?`)) return;
    setActionLoadingId(accountId);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.rejectBankAccount(token || "", userId, accountId);
      setSuccess(res.message);
      // Xóa khỏi danh sách chờ duyệt
      setPendingBanks((prev) => prev.filter((item) => item.account._id !== accountId));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi từ chối tài khoản ngân hàng");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin Duyệt lệnh rút tiền (Giả lập chuyển khoản thành công)
  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    const confirmMsg = `Xác nhận đã chuyển khoản giả lập số tiền ${withdrawal.amount.toLocaleString(
      "vi-VN"
    )} đ tới tài khoản ${withdrawal.bankInfoSnapshot.bankName} (${withdrawal.bankInfoSnapshot.accountNumber})?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(withdrawal._id);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.approveWithdrawal(token || "", withdrawal._id);
      setSuccess(res.message);
      void loadWithdrawals(withdrawalFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi duyệt lệnh rút tiền");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin Từ chối lệnh rút tiền và hoàn tiền ví
  const handleConfirmRejectWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingWithdrawal) return;

    setActionLoadingId(rejectingWithdrawal._id);
    setError("");
    setSuccess("");
    try {
      const res = await walletApi.rejectWithdrawal(
        token || "",
        rejectingWithdrawal._id,
        rejectNote.trim() || "Thông tin tài khoản không hợp lệ hoặc nghi vấn bảo mật"
      );
      setSuccess(res.message);
      setRejectingWithdrawal(null);
      setRejectNote("");
      void loadWithdrawals(withdrawalFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi từ chối lệnh rút tiền");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang quản lý tài chính */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#212c42]">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>🏛️</span> Quản Lý Tài Chính & Ví Trung Gian (Admin Finance)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm tra và phê duyệt các tài khoản ngân hàng của Owner và duyệt các lệnh rút tiền từ ví trung gian.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0f1725] border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("banks")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "banks"
                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🏦</span>
            <span>Duyệt Ngân Hàng</span>
            {pendingBanks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-orange-600">
                {pendingBanks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("withdrawals")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "withdrawals"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>💸</span>
            <span>Duyệt Rút Tiền</span>
          </button>
        </div>
      </div>

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

      {/* TAB 1: DUYỆT TÀI KHOẢN NGÂN HÀNG */}
      {activeTab === "banks" && (
        <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏦</span> Danh Sách Tài Khoản Ngân Hàng Đang Chờ Duyệt ({pendingBanks.length})
            </h3>
            <button
              type="button"
              onClick={() => void loadPendingBanks()}
              className="px-3 py-1.5 bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
            >
              🔄 Tải lại
            </button>
          </div>

          {loadingBanks ? (
            <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách tài khoản...</div>
          ) : pendingBanks.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-[#0f1725] border border-dashed border-slate-800 space-y-2">
              <div className="text-3xl">🎉</div>
              <p className="text-sm font-semibold text-slate-300">Không có tài khoản ngân hàng nào đang chờ duyệt</p>
              <p className="text-xs text-slate-500">Tất cả tài khoản ngân hàng của Owner đã được xử lý xong.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1a2333] text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Chủ thiết bị (Owner)</th>
                    <th className="p-3">Ngân hàng</th>
                    <th className="p-3">Số tài khoản</th>
                    <th className="p-3">Chủ tài khoản</th>
                    <th className="p-3">Thời gian thêm</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212c42]">
                  {pendingBanks.map((item) => (
                    <tr key={item.account._id} className="hover:bg-[#1a2333]/50">
                      <td className="p-3">
                        <div className="font-bold text-white">{item.ownerName}</div>
                        <div className="text-slate-400 text-[11px]">{item.ownerEmail}</div>
                        {item.ownerPhone && (
                          <div className="text-slate-500 text-[10px]">📞 {item.ownerPhone}</div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{item.account.bankName}</td>
                      <td className="p-3 font-mono font-bold text-amber-300 text-sm">
                        {item.account.accountNumber}
                      </td>
                      <td className="p-3 font-bold uppercase text-slate-200">
                        {item.account.accountHolderName}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {item.account.createdAt
                          ? new Date(item.account.createdAt).toLocaleString("vi-VN")
                          : "Vừa xong"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionLoadingId === item.account._id}
                            onClick={() =>
                              handleApproveBank(item.userId, item.account._id, item.ownerName)
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>Phê duyệt</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === item.account._id}
                            onClick={() =>
                              handleRejectBank(item.userId, item.account._id, item.ownerName)
                            }
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <span>✕</span>
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DUYỆT RÚT TIỀN */}
      {activeTab === "withdrawals" && (
        <div className="rounded-2xl bg-[#141d2d] border border-[#263550] p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>💸</span> Danh Sách Lệnh Rút Tiền Cần Xử Lý
            </h3>

            {/* Filter trạng thái */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Lọc trạng thái:</span>
              <select
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#1a2333] border border-slate-700 text-white text-xs font-semibold"
              >
                <option value="PENDING">⏳ Đang chờ duyệt (PENDING)</option>
                <option value="COMPLETED">✅ Đã chuyển tiền (COMPLETED)</option>
                <option value="REJECTED">❌ Đã từ chối (REJECTED)</option>
                <option value="ALL">Tất cả trạng thái</option>
              </select>
              <button
                type="button"
                onClick={() => void loadWithdrawals(withdrawalFilter)}
                className="p-1.5 bg-[#1e2a3f] hover:bg-[#283854] text-slate-300 rounded-xl text-xs border border-slate-700"
              >
                🔄
              </button>
            </div>
          </div>

          {loadingWithdrawals ? (
            <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách lệnh rút tiền...</div>
          ) : withdrawals.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-[#0f1725] border border-dashed border-slate-800 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-semibold text-slate-300">Không có lệnh rút tiền nào</p>
              <p className="text-xs text-slate-500">Chưa có yêu cầu rút tiền nào với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1a2333] text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Thời gian tạo</th>
                    <th className="p-3">Owner yêu cầu</th>
                    <th className="p-3">Số tiền rút</th>
                    <th className="p-3">Ngân hàng thụ hưởng</th>
                    <th className="p-3">Số tài khoản</th>
                    <th className="p-3">Tên chủ tài khoản</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212c42]">
                  {withdrawals.map((w) => {
                    const ownerObj = typeof w.ownerId === "object" ? w.ownerId : null;
                    const isPending = w.status === "PENDING";
                    const isCompleted = w.status === "COMPLETED";
                    const isRejected = w.status === "REJECTED";

                    return (
                      <tr key={w._id} className="hover:bg-[#1a2333]/50">
                        <td className="p-3 whitespace-nowrap text-slate-400">
                          {new Date(w.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ownerObj?.name || "Chủ thiết bị"}</div>
                          <div className="text-slate-400 text-[11px]">{ownerObj?.email || ""}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {w.amount.toLocaleString("vi-VN")} đ
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          {w.bankInfoSnapshot?.bankName}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-300">
                          {w.bankInfoSnapshot?.accountNumber}
                        </td>
                        <td className="p-3 uppercase font-semibold text-slate-200">
                          {w.bankInfoSnapshot?.accountHolderName}
                        </td>
                        <td className="p-3">
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ⏳ Chờ duyệt
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ✅ Đã chuyển tiền
                            </span>
                          )}
                          {isRejected && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              title={w.adminNote}
                            >
                              ❌ Đã từ chối
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={actionLoadingId === w._id}
                                onClick={() => handleApproveWithdrawal(w)}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <span>💸</span>
                                <span>Xác nhận đã chuyển</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoadingId === w._id}
                                onClick={() => {
                                  setRejectingWithdrawal(w);
                                  setRejectNote("");
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              {isCompleted ? "Đã tất toán" : "Đã hoàn ví"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL TỪ CHỐI LỆNH RÚT TIỀN */}
      {rejectingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141d2d] border border-rose-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <span>⚠️</span> Từ Chối Lệnh Rút Tiền
              </h3>
              <button
                type="button"
                onClick={() => setRejectingWithdrawal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Khi bạn từ chối, hệ thống sẽ{" "}
              <strong className="text-emerald-400">
                tự động hoàn tiền {rejectingWithdrawal.amount.toLocaleString("vi-VN")} đ
              </strong>{" "}
              về lại ví trung gian của Owner.
            </p>

            <form onSubmit={handleConfirmRejectWithdrawal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Lý do từ chối (sẽ thông báo cho Owner) *
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Nhập lý do từ chối (Ví dụ: Sai tên chủ tài khoản, nghi vấn tài khoản không chính chủ...)"
                  className="w-full px-3 py-2 rounded-xl bg-[#1a2333] border border-slate-700 text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingWithdrawal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectingWithdrawal._id || !rejectNote.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  Xác nhận từ chối & Hoàn tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

