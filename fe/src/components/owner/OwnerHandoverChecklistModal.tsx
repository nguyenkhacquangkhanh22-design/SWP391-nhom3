import React, { useState, useEffect } from "react";
import { ownerApi } from "../../services/ownerApi";

interface ChecklistItem {
  _id?: string;
  name: string;
  quantity: number;
  handover_checked: boolean;
  return_checked: boolean;
  condition_note: string;
}

interface OwnerHandoverChecklistModalProps {
  token: string;
  rentalId: string;
  rentalCode: string;
  equipmentTitle: string;
  isReturnMode?: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function OwnerHandoverChecklistModal({
  token,
  rentalId,
  rentalCode,
  equipmentTitle,
  isReturnMode = false,
  onClose,
  onSuccess,
  onError,
}: OwnerHandoverChecklistModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    ownerApi
      .getRentalChecklist(token, rentalId)
      .then((res) => {
        if (res.checklist) {
          setItems(res.checklist.items || []);
          setNotes(res.checklist.notes || "");
        }
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Tải checklist phụ kiện thất bại");
      })
      .finally(() => setLoading(false));
  }, [token, rentalId]);

  const handleToggleCheck = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return isReturnMode
          ? { ...item, return_checked: !item.return_checked }
          : { ...item, handover_checked: !item.handover_checked };
      })
    );
  };

  const handleNoteChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, condition_note: val } : item))
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        name: newItemName.trim(),
        quantity: Math.max(1, newItemQty),
        handover_checked: true,
        return_checked: false,
        condition_note: "Nguyên vẹn",
      },
    ]);
    setNewItemName("");
    setNewItemQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ownerApi.saveRentalChecklist(token, rentalId, {
        items,
        notes,
        is_return: isReturnMode,
      });
      onSuccess(
        isReturnMode
          ? "Đã lưu biên bản kiểm tra phụ kiện thu hồi thành công."
          : "Đã lưu bảng checklist phụ kiện bàn giao thành công."
      );
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lưu checklist thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111927] border border-[#23334d] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#23334d] flex items-center justify-between bg-[#152033]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{isReturnMode ? "📥" : "📦"}</span>
              <span>
                {isReturnMode
                  ? "Biên bản Thu hồi & Kiểm tra Phụ kiện"
                  : "Checklist Phụ kiện Bàn giao Thiết bị"}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Đơn thuê: <strong className="text-orange-400">{rentalCode}</strong> • {equipmentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Đang tải danh mục phụ kiện...</div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <span>💡</span>
                  <span>
                    {isReturnMode
                      ? "Tick chọn các phụ kiện khách hàng đã hoàn trả đủ và ghi chú tình trạng nếu bị thiếu/hỏng:"
                      : "Tick chọn các phụ kiện bạn đã đóng gói bàn giao cho khách hoặc shipper:"}
                  </span>
                </p>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isChecked = isReturnMode ? item.return_checked : item.handover_checked;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isChecked
                          ? "bg-[#182842] border-emerald-500/40"
                          : "bg-[#131c2b] border-[#202f47]"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCheck(idx)}
                          className="w-4 h-4 rounded text-emerald-500 bg-[#0d1420] border-slate-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{item.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                              x{item.quantity}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={item.condition_note}
                            onChange={(e) => handleNoteChange(idx, e.target.value)}
                            placeholder="Ghi chú ngoại quan..."
                            className="mt-1 w-full bg-[#0d1420] border border-[#243550] rounded px-2 py-0.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Xóa phụ kiện này"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Item */}
              <form onSubmit={handleAddItem} className="pt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="+ Thêm phụ kiện khác (VD: Filter UV, Đèn LED mini...)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 bg-[#131c2b] border border-[#23354f] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <input
                  type="number"
                  min={1}
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
                  className="w-16 bg-[#131c2b] border border-[#23354f] rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono focus:outline-none"
                  title="Số lượng"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#202f47] hover:bg-[#2c4060] text-slate-200 font-bold rounded-xl text-xs"
                >
                  Thêm
                </button>
              </form>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Ghi chú chung biên bản bàn giao:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm về ngoại quan hộp đựng, phụ kiện đặc biệt..."
                  className="w-full bg-[#131c2b] border border-[#23354f] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#23334d] flex justify-end gap-2 bg-[#152033]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md"
          >
            {saving ? "Đang lưu..." : isReturnMode ? "Xác nhận thu hồi đủ" : "Lưu Checklist Bàn Giao"}
          </button>
        </div>
      </div>
    </div>
  );
}
