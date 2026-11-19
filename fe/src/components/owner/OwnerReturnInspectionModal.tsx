import { useState, useEffect } from "react";
import { ownerApi } from "../../services/ownerApi";

interface ScratchPoint {
  part: string;
  part_label: string;
  severity: string;
  description: string;
}

interface OwnerReturnInspectionModalProps {
  token: string;
  rentalId: string;
  rentalCode: string;
  equipmentTitle: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

const BODY_PARTS = [
  { id: "lens_front", label: "Thấu kính trước (Front Glass)" },
  { id: "lens_rear", label: "Thấu kính sau & Ngàm Mount" },
  { id: "sensor", label: "Cảm biến ảnh (CMOS / Sensor)" },
  { id: "screen", label: "Màn hình LCD / Kính ngắm EVF" },
  { id: "body_top", label: "Đỉnh máy / Vòng xoay chức năng" },
  { id: "body_bottom", label: "Đáy máy / Khe gắn Tripod" },
  { id: "grip", label: "Báng cầm & Cửa khay Pin" },
];

export default function OwnerReturnInspectionModal({
  token,
  rentalId,
  rentalCode,
  equipmentTitle,
  onClose,
  onSuccess,
  onError,
}: OwnerReturnInspectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overallCondition, setOverallCondition] = useState("flawless");
  const [sensorClean, setSensorClean] = useState(true);
  const [lensClean, setLensClean] = useState(true);
  const [shutterWorking, setShutterWorking] = useState(true);
  const [scratches, setScratches] = useState<ScratchPoint[]>([]);
  const [depositAction, setDepositAction] = useState("full_refund");
  const [deductionAmount, setDeductionAmount] = useState<number | string>(0);
  const [inspectionNotes, setInspectionNotes] = useState("");

  useEffect(() => {
    setLoading(true);
    ownerApi
      .getRentalInspection(token, rentalId)
      .then((res) => {
        if (res.inspection) {
          setOverallCondition(res.inspection.overall_condition || "flawless");
          setSensorClean(res.inspection.sensor_clean !== false);
          setLensClean(res.inspection.lens_clean !== false);
          setShutterWorking(res.inspection.shutter_working !== false);
          setScratches(res.inspection.scratches || []);
          setDepositAction(res.inspection.deposit_action || "full_refund");
          setDeductionAmount(res.inspection.deduction_amount || 0);
          setInspectionNotes(res.inspection.inspection_notes || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, rentalId]);

  const handleTogglePartScratch = (partId: string, partLabel: string) => {
    const existing = scratches.find((s) => s.part === partId);
    if (existing) {
      setScratches((prev) => prev.filter((s) => s.part !== partId));
    } else {
      setScratches((prev) => [
        ...prev,
        {
          part: partId,
          part_label: partLabel,
          severity: "light_scratch",
          description: "Vết xước dăm nhẹ",
        },
      ]);
    }
  };

  const handleUpdateScratch = (partId: string, field: "severity" | "description", val: string) => {
    setScratches((prev) =>
      prev.map((s) => (s.part === partId ? { ...s, [field]: val } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ownerApi.submitReturnInspection(token, rentalId, {
        overall_condition: overallCondition,
        sensor_clean: sensorClean,
        lens_clean: lensClean,
        shutter_working: shutterWorking,
        scratches,
        deposit_action: depositAction,
        deduction_amount: Number(deductionAmount) || 0,
        inspection_notes: inspectionNotes,
      });
      onSuccess("Đã lưu biên bản đánh giá ngoại quan và kiểm tra thiết bị thành công.");
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lưu biên bản kiểm tra thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111927] border border-[#23334d] rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#23334d] flex items-center justify-between bg-[#152033]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔍</span>
              <span>Đánh Giá Ngoại Quan & Sơ Đồ Cấn Móp (UC_O18)</span>
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
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Đang tải biên bản kiểm tra...</div>
          ) : (
            <>
              {/* Quick Health Status */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSensorClean(!sensorClean)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    sensorClean
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-300"
                  }`}
                >
                  <span className="block text-sm mb-1">{sensorClean ? "✨" : "⚠️"}</span>
                  <span className="font-bold block">Cảm biến / Sensor</span>
                  <span className="text-[10px] opacity-80">
                    {sensorClean ? "Sạch sẽ / Không bụi" : "Bụi bẩn / Cần lau"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLensClean(!lensClean)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    lensClean
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-300"
                  }`}
                >
                  <span className="block text-sm mb-1">{lensClean ? "🔎" : "⚠️"}</span>
                  <span className="font-bold block">Kính Lens</span>
                  <span className="text-[10px] opacity-80">
                    {lensClean ? "Trong suốt / Ko xước" : "Có vết / Cấn móp"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShutterWorking(!shutterWorking)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    shutterWorking
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-300"
                  }`}
                >
                  <span className="block text-sm mb-1">{shutterWorking ? "⚙️" : "⚠️"}</span>
                  <span className="font-bold block">Màn trập / Shutter</span>
                  <span className="text-[10px] opacity-80">
                    {shutterWorking ? "Hoạt động êm" : "Kẹt / Báo lỗi"}
                  </span>
                </button>
              </div>

              {/* Sơ đồ bộ phận & Vết trầy */}
              <div className="p-3.5 bg-[#0f1728] rounded-xl border border-[#213049] space-y-2.5">
                <label className="block text-xs font-bold text-slate-200">
                  📍 Sơ đồ vị trí ngoại quan (Tick chọn vị trí phát hiện cấn móp):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BODY_PARTS.map((bp) => {
                    const isMarked = scratches.some((s) => s.part === bp.id);
                    return (
                      <button
                        key={bp.id}
                        type="button"
                        onClick={() => handleTogglePartScratch(bp.id, bp.label)}
                        className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                          isMarked
                            ? "bg-rose-950/50 border-rose-500 text-rose-200"
                            : "bg-[#141f33] border-[#253754] text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <span>{bp.label}</span>
                        <span>{isMarked ? "🔴" : "⚪"}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Details for marked scratches */}
                {scratches.length > 0 && (
                  <div className="pt-2 space-y-2 border-t border-[#1e2e47]">
                    <span className="text-[11px] text-amber-400 font-bold block">
                      Chi tiết mức độ vết trầy đã đánh dấu:
                    </span>
                    {scratches.map((s) => (
                      <div
                        key={s.part}
                        className="p-2.5 rounded-lg bg-[#142036] border border-[#2a3e61] flex gap-2 items-center"
                      >
                        <span className="font-bold text-slate-200 text-xs w-1/3 truncate">
                          {s.part_label}
                        </span>
                        <select
                          value={s.severity}
                          onChange={(e) => handleUpdateScratch(s.part, "severity", e.target.value)}
                          className="bg-[#0b1220] border border-[#2d4268] rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                        >
                          <option value="light_scratch">Xước dăm nhẹ</option>
                          <option value="deep_scratch">Xước sâu</option>
                          <option value="dent">Cấn móp</option>
                          <option value="broken">Nứt vỡ / Hỏng</option>
                        </select>
                        <input
                          type="text"
                          value={s.description}
                          onChange={(e) =>
                            handleUpdateScratch(s.part, "description", e.target.value)
                          }
                          placeholder="Mô tả vị trí vết xước..."
                          className="flex-1 bg-[#0b1220] border border-[#2d4268] rounded px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tình trạng tổng quát & Quyết định cọc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Đánh giá tổng thể:
                  </label>
                  <select
                    value={overallCondition}
                    onChange={(e) => setOverallCondition(e.target.value)}
                    className="w-full bg-[#131c2b] border border-[#23354f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="flawless">Hoàn hảo / Như ban đầu</option>
                    <option value="acceptable">Chấp nhận được (Hao mòn nhẹ)</option>
                    <option value="damaged">Có hư hỏng / Trầy xước đáng kể</option>
                    <option value="disputed">Yêu cầu giữ cọc / Lập biên bản khiếu nại</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Khấu trừ tiền cọc:
                  </label>
                  <select
                    value={depositAction}
                    onChange={(e) => setDepositAction(e.target.value)}
                    className="w-full bg-[#131c2b] border border-[#23354f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="full_refund">Miễn trừ / Hoàn cọc 100%</option>
                    <option value="partial_deduction">Khấu trừ một phần sửa chữa</option>
                    <option value="hold_dispute">Tạm giữ chờ giám định</option>
                  </select>
                </div>
              </div>

              {depositAction === "partial_deduction" && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Số tiền đề xuất khấu trừ đền bù (VND):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    className="w-full bg-[#131c2b] border border-[#23354f] rounded-xl px-3 py-2 text-xs text-amber-400 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Ghi chú kết luận biên bản nghiệm thu:
                </label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Nhận xét tình trạng bàn giao hoàn trả..."
                  className="w-full bg-[#131c2b] border border-[#23354f] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs shadow-md"
                >
                  {saving ? "Đang lưu..." : "Xác nhận & Lưu biên bản"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
