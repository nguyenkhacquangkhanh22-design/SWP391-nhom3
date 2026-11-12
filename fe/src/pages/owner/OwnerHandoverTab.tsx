import { useState, useEffect } from "react";
import type { RentalContract, HandoverRecord, Settlement } from "../../types/owner";
import type { Rental } from "../../types/smartequip";
import { VIETNAM_BANKS, generateVietQrUrl } from "../../constants/vietnamBanks";
import { ownerApi } from "../../services/ownerApi";
import { getSocket } from "../../services/socket";
import OwnerCancelRentalModal from "../../components/OwnerCancelRentalModal";
import OwnerReviewRenterModal from "../../components/OwnerReviewRenterModal";
import OwnerDamageReportModal from "../../components/owner/OwnerDamageReportModal";
import RentalChatModal from "../../components/RentalChatModal";
import ContractPdfModal from "../../components/ContractPdfModal";

interface Props {
  contracts: RentalContract[];
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  selectedContract?: RentalContract | null;
  onRefreshContracts: () => void;
}

export default function OwnerHandoverTab({
  contracts,
  token,
  onError,
  onSuccess,
  selectedContract,
  onRefreshContracts,
}: Props) {
  const eligibleContracts = contracts.filter((c) => {
    const s = String(c.status || "").toLowerCase();
    const p = String(c.payment_status || "").toLowerCase();
    return (
      [
        "signed",
        "contract_signed",
        "paid",
        "active",
        "returned",
        "completed",
        "pending_renter_signature",
      ].includes(s) ||
      p === "paid" ||
      Boolean(c.owner_signature?.signed && c.renter_signature?.signed)
    );
  });

  const [activeContractId, setActiveContractId] = useState<string>(
    selectedContract?._id || eligibleContracts[0]?._id || contracts[0]?._id || ""
  );

  // Direct Rentals State (Nghiệm thu hoàn trả trực tiếp từ Khách thuê)
  const [directRentals, setDirectRentals] = useState<Rental[]>([]);
  const [inspectingRental, setInspectingRental] = useState<Rental | null>(null);
  const [inspectionCondition, setInspectionCondition] = useState(
    "Thiết bị nguyên vẹn, hoạt động bình thường, đầy đủ phụ kiện."
  );
  const [inspectionNotesText, setInspectionNotesText] = useState("");
  const [damageReportRental, setDamageReportRental] = useState<Rental | null>(null);
  const [chatRental, setChatRental] = useState<Rental | null>(null);
  const [viewingPdfRental, setViewingPdfRental] = useState<Rental | null>(null);

  const fetchDirectRentals = async () => {
    if (!token) return;
    try {
      const res = await ownerApi.getOwnerRentals(token);
      if (res && Array.isArray(res.data)) {
        setDirectRentals(res.data);
      }
    } catch (e: any) {
      console.warn("Lỗi tải directRentals trong OwnerHandoverTab:", e?.message);
    }
  };

  useEffect(() => {
    void fetchDirectRentals();

    const socket = getSocket();
    const handleRefresh = () => {
      void fetchDirectRentals();
      onRefreshContracts();
    };

    socket.on("rental:returned", handleRefresh);
    socket.on("payment:approved", handleRefresh);
    socket.on("rental:completed", handleRefresh);

    return () => {
      socket.off("rental:returned", handleRefresh);
      socket.off("payment:approved", handleRefresh);
      socket.off("rental:completed", handleRefresh);
    };
  }, [token]);

  const [records, setRecords] = useState<HandoverRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HandoverRecord | null>(null);

  // Form states: Handover (UC_O08)
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [accessoriesList, setAccessoriesList] = useState<
    { item: string; checked: boolean; notes: string }[]
  >([
    { item: "Thân máy / Thiết bị chính", checked: true, notes: "Nguyên vẹn, không móp méo" },
    { item: "Pin thiết bị", checked: true, notes: "Đầy 100% pin" },
    { item: "Bộ sạc / Cáp nguồn", checked: true, notes: "Hoạt động bình thường" },
    { item: "Thẻ nhớ / Ổ cứng lưu trữ", checked: true, notes: "Đã format sạch" },
    { item: "Túi đựng / Hộp chống sốc", checked: true, notes: "Đầy đủ mút đệm" },
  ]);
  const [handoverCondition, setHandoverCondition] = useState(
    "Thiết bị hoạt động hoàn hảo, kính lens trong, sensor sạch, không trầy xước."
  );
  const [handoverWorkingStatus, setHandoverWorkingStatus] = useState("Hoạt động bình thường");
  const [handoverProofUrl, setHandoverProofUrl] = useState(
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80"
  );
  const [handoverNotes, setHandoverNotes] = useState(
    "Đã hướng dẫn Renter thao tác cơ bản và kiểm tra trực tiếp tại chỗ."
  );

  // Form states: Return Inspection (UC_O09)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnCondition, setReturnCondition] = useState("Thiết bị nguyên vẹn, có hao mòn nhẹ.");
  const [returnWorkingStatus, setReturnWorkingStatus] = useState("Hoạt động ổn định");
  const [missingItemsInput, setMissingItemsInput] = useState("");
  const [damageDetected, setDamageDetected] = useState("");
  const [damageCost, setDamageCost] = useState(0);
  const [returnProofUrl, setReturnProofUrl] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payout request states when renter receives equipment
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutBankCode, setPayoutBankCode] = useState("MB");
  const [payoutBankName, setPayoutBankName] = useState("Ngân hàng TMCP Quân đội (MB Bank)");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
  const [payoutAccountHolder, setPayoutAccountHolder] = useState("");
  const [payoutQrMode, setPayoutQrMode] = useState<"auto" | "custom">("auto");
  const [payoutCustomQrUrl, setPayoutCustomQrUrl] = useState("");
  const [payoutRequestNote, setPayoutRequestNote] = useState("");
  const [payoutSettlement, setPayoutSettlement] = useState<Settlement | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [previewHandoverQr, setPreviewHandoverQr] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (activeContractId) {
      loadRecords(activeContractId);
    }
  }, [activeContractId]);

  async function loadRecords(contractId: string) {
    setIsLoadingRecords(true);
    try {
      const data = await ownerApi.getHandoverRecords(token, contractId);
      setRecords(data.records);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRecords(false);
    }
  }

  const currentContract = contracts.find((c) => c._id === activeContractId);
  const isContractPaid =
    currentContract?.payment_status === "paid" ||
    (currentContract as any)?.payment_status === "PAID";
  const handoverRecord = records.find((r) => r.record_type === "handover");
  const returnRecord = records.find((r) => r.record_type === "return");

  function prepareRecordUpdate(record: HandoverRecord) {
    setEditingRecord(record);
    setAccessoriesList(record.accessories_checklist.map((item) => ({
      item: item.item,
      checked: item.checked,
      notes: item.notes || "",
    })));
    if (record.record_type === "handover") {
      setHandoverCondition(record.physical_condition);
      setHandoverWorkingStatus(record.working_status);
      setHandoverProofUrl(record.evidence_photos[0] || "");
      setHandoverNotes(record.notes || "");
      setShowHandoverModal(true);
    } else {
      setReturnCondition(record.physical_condition);
      setReturnWorkingStatus(record.working_status);
      setMissingItemsInput(record.missing_items?.join(", ") || "");
      setDamageDetected(record.damage_detected || "");
      setDamageCost(record.estimated_damage_cost || 0);
      setReturnProofUrl(record.evidence_photos[0] || "");
      setReturnNotes(record.notes || "");
      setShowReturnModal(true);
    }
  }

  async function handleOpenPayoutModal() {
    if (!activeContractId) return;
    try {
      const res = await ownerApi.getSettlementByContract(token, activeContractId).catch(() => null);
      if (res && res.settlement) {
        setPayoutSettlement(res.settlement);
        if (res.settlement.bank_info?.bank_code) {
          setPayoutBankCode(res.settlement.bank_info.bank_code);
        }
        if (res.settlement.bank_info?.bank_name) {
          setPayoutBankName(res.settlement.bank_info.bank_name);
        }
        if (res.settlement.bank_info?.account_number) {
          setPayoutAccountNumber(res.settlement.bank_info.account_number);
        }
        if (res.settlement.bank_info?.account_holder) {
          setPayoutAccountHolder(res.settlement.bank_info.account_holder);
        }
        if (res.settlement.qr_code_url) {
          setPayoutCustomQrUrl(res.settlement.qr_code_url);
          setPayoutQrMode("custom");
        } else {
          setPayoutQrMode("auto");
        }
        if (res.settlement.request_note) {
          setPayoutRequestNote(res.settlement.request_note);
        }
      }
    } catch {}
    setShowPayoutModal(true);
  }

  async function handleSubmitPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContractId) return;

    if (!payoutBankName.trim() || !payoutAccountNumber.trim() || !payoutAccountHolder.trim()) {
      onError("Vui lòng chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản.");
      return;
    }

    const curContract = contracts.find((c) => c._id === activeContractId);
    const payoutAmount = payoutSettlement?.owner_payout_amount || Math.round((curContract?.rental_price || 0) * 0.95);
    const autoQr = generateVietQrUrl(
      payoutBankCode,
      payoutAccountNumber,
      payoutAmount,
      `GIAI NGAN HD ${curContract?.contract_code || ""}`,
      payoutAccountHolder
    );
    const effectiveQr = payoutQrMode === "auto" ? autoQr : payoutCustomQrUrl;

    setIsSubmittingPayout(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmSettlement(token, activeContractId, {
        bank_info: {
          bank_name: payoutBankName.trim(),
          bank_code: payoutBankCode,
          account_number: payoutAccountNumber.trim(),
          account_holder: payoutAccountHolder.trim().toUpperCase(),
        },
        qr_code_url: effectiveQr,
        request_note: payoutRequestNote.trim(),
      });
      onSuccess(`Đã gửi yêu cầu thanh toán giải ngân (${payoutAmount.toLocaleString("vi-VN")} đ) lên Quản lý web (Moderator) duyệt thành công!`);
      setShowPayoutModal(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi yêu cầu thanh toán thất bại.");
    } finally {
      setIsSubmittingPayout(false);
    }
  }

  // UC_O08: Submit Handover Protocol
  async function handleSubmitHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContractId) return;

    if (!editingRecord && !isContractPaid) {
      onError("Không thể lập Biên bản bàn giao! Khách thuê chưa thanh toán phí thuê (Đơn chưa ở trạng thái PAID). Vui lòng chờ khách chuyển khoản trước khi xuất kho bàn giao máy.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const data = {
        accessories_checklist: accessoriesList,
        physical_condition: handoverCondition,
        working_status: handoverWorkingStatus,
        evidence_photos: handoverProofUrl ? [handoverProofUrl] : [],
        notes: handoverNotes,
      };
      if (editingRecord) {
        await ownerApi.updateHandoverRecord(token, editingRecord._id, data);
        onSuccess("Đã cập nhật biên bản bàn giao và gửi lại để xác minh.");
      } else {
        await ownerApi.createHandoverRecord(token, activeContractId, data);
        onSuccess("Đã lập Biên bản bàn giao thiết bị (UC_O08) và chuyển trạng thái thuê sang Đang thuê.");
      }
      setEditingRecord(null);
      setShowHandoverModal(false);
      loadRecords(activeContractId);
      onRefreshContracts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập biên bản bàn giao thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O09: Submit Return Inspection Protocol
  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContractId) return;

    if (Number(damageCost) < 0) {
      onError("Chi phí khấu trừ hư hại không được là số âm (phải ≥ 0).");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");

    const missingList = missingItemsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const data = {
        accessories_checklist: accessoriesList,
        physical_condition: returnCondition,
        working_status: returnWorkingStatus,
        missing_items: missingList,
        damage_detected: damageDetected,
        estimated_damage_cost: Number(damageCost),
        evidence_photos: returnProofUrl ? [returnProofUrl] : [],
        notes: returnNotes,
      };
      if (editingRecord) {
        await ownerApi.updateHandoverRecord(token, editingRecord._id, data);
        onSuccess("Đã cập nhật biên bản hoàn trả và gửi lại để xác minh.");
      } else {
        await ownerApi.createReturnInspection(token, activeContractId, data);
        onSuccess("Đã lập Biên bản kiểm tra trả thiết bị (UC_O09) và cập nhật dữ liệu quyết toán!");
      }
      setEditingRecord(null);
      setShowReturnModal(false);
      loadRecords(activeContractId);
      onRefreshContracts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập biên bản kiểm tra trả thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Danh sách các đơn thuê khách đang gửi yêu cầu Hoàn trả máy (UC_O09)
  const returningRentals = directRentals.filter((r: any) =>
    ["RETURNED", "RETURN_REQUESTED"].includes(String(r.status || "").toUpperCase())
  );

  // Thao tác nghiệm thu hoàn trả & nhận lại máy trực tiếp
  async function handleConfirmDirectReturn(rental: Rental) {
    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const res = await ownerApi.confirmOwnerRentalReturn(token, rental._id, {
        condition_note: inspectionCondition,
        notes: inspectionNotesText,
      });
      onSuccess(res.message || `Đã nghiệm thu và nhận lại thiết bị cho đơn #${rental.rentalCode} thành công! Thiết bị đã sẵn sàng cho thuê lại.`);
      setInspectingRental(null);
      await fetchDirectRentals();
      onRefreshContracts();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Xác nhận nhận lại thiết bị thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            🤝 Biên bản Bàn giao & Kiểm tra trả thiết bị (UC_O08, UC_O09)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Lập biên bản giao nhận trực tiếp với Renter, đối chiếu phụ kiện, tình trạng vật lý và minh chứng hình ảnh thực tế.
          </p>
        </div>

        {/* Contract Selector */}
        {eligibleContracts.length > 0 && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Hợp đồng:</span>
            <select
              className="input-field"
              value={activeContractId}
              onChange={(e) => setActiveContractId(e.target.value)}
              style={{ width: "auto" }}
            >
              {eligibleContracts.map((c) => {
                const cPaid =
                  c.payment_status === "paid" || (c as any).payment_status === "PAID";
                return (
                  <option key={c._id} value={c._id}>
                    {c.contract_code} • {c.renter_id?.name || "Renter"} • {c.equipment_id?.title} •{" "}
                    {cPaid ? "✅ Đã thanh toán (PAID)" : "⚠️ Chưa thanh toán"}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* KHỐI 1: YÊU CẦU HOÀN TRẢ THIẾT BỊ TỪ KHÁCH THUÊ (UC_O09) */}
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(79, 70, 229, 0.15))",
            border: "1px solid rgba(168, 85, 247, 0.5)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#f3e8ff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📦</span> Yêu cầu Hoàn trả & Nghiệm thu Thiết bị (UC_O09)
              <span
                style={{
                  fontSize: "0.78rem",
                  background: returningRentals.length > 0 ? "#9333ea" : "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  padding: "2px 10px",
                  borderRadius: "999px",
                  fontWeight: "bold",
                }}
              >
                {returningRentals.length} đơn cần nghiệm thu
              </span>
            </h3>
            <p style={{ margin: "4px 0 0", color: "#d8b4fe", fontSize: "0.85rem" }}>
              Khách thuê đã gửi thông tin hẹn giờ, địa điểm thu hồi và ảnh kiểm tra ngoại quan. Vui lòng đối chiếu và xác nhận nhận lại máy.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchDirectRentals()}
            className="button button-secondary"
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderRadius: "8px", borderColor: "#a855f7", color: "#d8b4fe" }}
          >
            🔄 Làm mới
          </button>
        </div>

        {returningRentals.length === 0 ? (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "18px 20px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.85rem",
            }}
          >
            Hiện chưa có đơn thuê nào đang yêu cầu hoàn trả. Khi khách thuê bấm <strong>"Báo trả đồ"</strong> trên trang Đơn thuê, yêu cầu sẽ tự động hiển thị tại đây để bạn đối chiếu phụ kiện & nghiệm thu nhận máy.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
            {returningRentals.map((r: any) => {
              const equipTitle = typeof r.equipment === "object" ? r.equipment?.title : "Thiết bị thuê";
              const equipImg =
                typeof r.equipment === "object" && r.equipment?.images?.[0]
                  ? r.equipment.images[0]
                  : "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80";
              const renterName = typeof r.renter === "object" ? r.renter?.name : "Khách thuê";
              const renterPhone = typeof r.renter === "object" ? r.renter?.phone : "0909xxxxxx";

              return (
                <div
                  key={r._id}
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: "0 4px 14px rgba(147, 51, 234, 0.12)",
                  }}
                >
                  {/* Header thẻ */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <img
                        src={equipImg}
                        alt=""
                        style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }}
                      />
                      <div>
                        <strong style={{ color: "#fff", fontSize: "0.92rem", display: "block" }}>{equipTitle}</strong>
                        <span style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 700 }}>
                          #{r.rentalCode}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        background: "rgba(147, 51, 234, 0.25)",
                        border: "1px solid #9333ea",
                        color: "#d8b4fe",
                        fontSize: "0.72rem",
                        padding: "3px 8px",
                        borderRadius: "999px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      📦 ĐÃ BÁO TRẢ
                    </span>
                  </div>

                  {/* Thông tin Renter & Lịch trình */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div>
                      👤 <strong>Khách thuê:</strong> <span style={{ color: "#38bdf8" }}>{renterName}</span> (📞 {renterPhone})
                    </div>
                    <div>
                      💰 <strong>Tiền thuê:</strong>{" "}
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>
                        {(r.totalAmount || r.rentalFee || 0).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                    <div>
                      🕒 <strong>Thời gian thuê:</strong> {new Date(r.startDate).toLocaleDateString("vi-VN")} ➔{" "}
                      {new Date(r.endDate).toLocaleDateString("vi-VN")} ({r.totalDays || 1} ngày)
                    </div>
                  </div>

                  {/* Thông tin hoàn trả khách gửi */}
                  <div
                    style={{
                      background: "rgba(147, 51, 234, 0.1)",
                      border: "1px dashed rgba(168, 85, 247, 0.45)",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div>
                      🕒 <strong style={{ color: "#c084fc" }}>Hẹn trả máy:</strong>{" "}
                      {r.returnInfo?.returnTime
                        ? new Date(r.returnInfo.returnTime).toLocaleString("vi-VN")
                        : "Sớm nhất"}
                    </div>
                    <div>
                      📍 <strong style={{ color: "#38bdf8" }}>Địa điểm nhận:</strong>{" "}
                      {r.returnInfo?.returnLocation || r.deliveryAddress || "Địa chỉ mặc định theo hợp đồng"}
                    </div>
                    <div>
                      🔍 <strong style={{ color: "#34d399" }}>Tình trạng khách báo:</strong>{" "}
                      {r.returnInfo?.returnCondition ||
                        r.returnRequest?.deviceConditionNote ||
                        "Thiết bị nguyên vẹn, hoạt động bình thường"}
                    </div>
                    {r.returnInfo?.returnNote && (
                      <div style={{ fontStyle: "italic", color: "var(--muted)" }}>
                        📝 "{r.returnInfo.returnNote}"
                      </div>
                    )}
                  </div>

                  {/* Nút thao tác */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto", paddingTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectingRental(r);
                        setInspectionCondition(
                          r.returnInfo?.returnCondition ||
                            r.returnRequest?.deviceConditionNote ||
                            "Thiết bị nguyên vẹn, hoạt động bình thường, đầy đủ phụ kiện."
                        );
                        setInspectionNotesText("");
                      }}
                      className="button"
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, #059669, #10b981)",
                        color: "#fff",
                        fontWeight: "bold",
                        border: "none",
                        padding: "7px 12px",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                        cursor: "pointer",
                      }}
                    >
                      ✅ Nghiệm thu & Nhận máy
                    </button>
                    <button
                      type="button"
                      onClick={() => setDamageReportRental(r)}
                      className="button button-quiet"
                      style={{
                        padding: "7px 10px",
                        fontSize: "0.82rem",
                        borderRadius: "8px",
                        color: "#f87171",
                        borderColor: "rgba(239, 68, 68, 0.4)",
                        background: "rgba(239, 68, 68, 0.12)",
                      }}
                      title="Báo hư hỏng hoặc thiếu phụ kiện"
                    >
                      ⚠️ Báo hỏng
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingPdfRental(r)}
                      className="button button-secondary"
                      style={{ padding: "7px 10px", fontSize: "0.82rem", borderRadius: "8px", borderColor: "#f97316", color: "#fb923c" }}
                      title="Xem file PDF hợp đồng"
                    >
                      📄 HĐ PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatRental(r)}
                      className="button button-secondary"
                      style={{ padding: "7px 10px", fontSize: "0.82rem", borderRadius: "8px", borderColor: "#38bdf8", color: "#38bdf8" }}
                      title="Nhắn tin với khách thuê"
                    >
                      💬 Chat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #1e293b", margin: "24px 0", paddingTop: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "1.15rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📋</span> Biên bản Bàn giao & Nghiệm thu theo Hợp đồng
        </h3>
      </div>

      {/* Contract Quick Status Card */}
      {currentContract && (
        <div
          style={{
            background: "#111827",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "18px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            fontSize: "0.84rem",
          }}
        >
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>Thiết bị bàn giao:</span>
            <strong style={{ color: "#fff" }}>{currentContract.equipment_id?.title}</strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>Khách thuê (Bên B):</span>
            <strong style={{ color: "#38bdf8" }}>
              {currentContract.renter_id?.name} ({currentContract.renter_id?.phone || "N/A"})
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>Tiền thuê / Cọc:</span>
            <strong style={{ color: "#10b981" }}>
              {(currentContract.rental_price || 0).toLocaleString("vi-VN")} đ
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--muted)", display: "block" }}>Trạng thái thanh toán:</span>
            <strong style={{ color: isContractPaid ? "#10b981" : "#ef4444" }}>
              {isContractPaid
                ? "✅ ĐÃ THANH TOÁN (PAID)"
                : currentContract.payment_status === "pending_confirmation"
                ? "⏳ CHỜ XÁC NHẬN CHUYỂN KHOẢN"
                : "⚠️ CHƯA THANH TOÁN (UNPAID)"}
            </strong>
          </div>
        </div>
      )}

      {!currentContract ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📋</span>
          <h3>Chưa có hợp đồng nào sẵn sàng bàn giao</h3>
          <p>
            Biên bản bàn giao áp dụng cho các hợp đồng đã được ký kết điện tử (Trạng thái: Signed, Active hoặc Completed).
          </p>
        </div>
      ) : isLoadingRecords ? (
        <div className="app-loading" style={{ margin: "40px auto" }}>
          Đang tải dữ liệu biên bản...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Column 1: Biên bản bàn giao thiết bị (UC_O08) */}
          <div className="owner-section-card">
            {/* Banner cảnh báo nếu chưa thanh toán */}
            {!isContractPaid && !handoverRecord && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.84rem",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>⛔</span>
                <div>
                  <strong style={{ color: "#ef4444" }}>Chưa thể bàn giao thiết bị:</strong> Khách thuê
                  chưa thanh toán tiền thuê cho đơn hàng này (Trạng thái:{" "}
                  <span style={{ textTransform: "uppercase", fontWeight: "bold", color: "#f87171" }}>
                    {currentContract?.payment_status === "pending_confirmation"
                      ? "Chờ xác nhận chuyển khoản"
                      : "Chưa thanh toán (UNPAID)"}
                  </span>
                  ). Nút lập biên bản bàn giao tạm thời bị khóa cứng cho đến khi đơn chuyển sang
                  trạng thái <strong>ĐÃ THANH TOÁN (PAID)</strong>.
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                1️⃣ Biên bản bàn giao thiết bị (UC_O08)
              </h3>
              {handoverRecord ? (
                handoverRecord.moderator_review?.status === "needs_changes" ? (
                  <button className="button button-secondary" onClick={() => prepareRecordUpdate(handoverRecord)}>
                    Bổ sung theo yêu cầu
                  </button>
                ) : (
                  <span className="status-badge status-active">
                    {handoverRecord.moderator_review?.status === "verified" ? "✓ Đã xác minh" : "Đã bàn giao • Chờ xác minh"}
                  </span>
                )
              ) : (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    className="button button-primary"
                    style={{
                      fontSize: "0.8rem",
                      padding: "6px 12px",
                      opacity: isContractPaid ? 1 : 0.45,
                      cursor: isContractPaid ? "pointer" : "not-allowed",
                      background: isContractPaid ? undefined : "#334155",
                      borderColor: isContractPaid ? undefined : "#475569",
                    }}
                    disabled={!isContractPaid}
                    title={
                      isContractPaid
                        ? "Lập biên bản bàn giao thiết bị"
                        : "Khóa bàn giao: Khách thuê chưa thanh toán phí thuê (Chưa PAID)"
                    }
                    onClick={() => {
                      if (!isContractPaid) {
                        onError(
                          "Khách thuê chưa thanh toán phí thuê! Bạn chỉ được phép bàn giao máy khi đơn đã ở trạng thái ĐÃ THANH TOÁN (PAID)."
                        );
                        return;
                      }
                      setShowHandoverModal(true);
                    }}
                  >
                    {isContractPaid ? "+ Lập biên bản bàn giao (UC_O08)" : "🔒 Khóa bàn giao (Chờ thanh toán)"}
                  </button>
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{
                      fontSize: "0.8rem",
                      padding: "6px 10px",
                      color: "#f87171",
                      borderColor: "rgba(239, 68, 68, 0.4)",
                    }}
                    onClick={() => setShowCancelModal(true)}
                    title="Chủ máy chủ động hủy đơn trước khi giao máy nếu thiết bị gặp sự cố bất ngờ"
                  >
                    🚫 Hủy đơn / Sự cố
                  </button>
                </div>
              )}
            </div>

            {handoverRecord ? (
              <div className="record-details-view">
                {handoverRecord.moderator_review?.note && (
                  <div className="moderator-warning">
                    <strong>Yêu cầu bổ sung:</strong> {handoverRecord.moderator_review.note}
                  </div>
                )}
                <div className="record-info-row">
                  <span className="info-lbl">Thời điểm bàn giao:</span>
                  <span className="info-val">
                    {new Date(handoverRecord.record_date).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Tình trạng vật lý:</span>
                  <span className="info-val" style={{ color: "#fff" }}>
                    {handoverRecord.physical_condition}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Trạng thái hoạt động:</span>
                  <span className="info-val">{handoverRecord.working_status}</span>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                    Danh mục phụ kiện bàn giao:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.85rem" }}>
                    {handoverRecord.accessories_checklist.map((acc, i) => (
                      <li key={i} style={{ color: acc.checked ? "#10b981" : "var(--muted)" }}>
                        {acc.checked ? "✓" : "✗"} {acc.item} {acc.notes ? `(${acc.notes})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                {handoverRecord.evidence_photos && handoverRecord.evidence_photos.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                      Ảnh minh chứng lúc giao:
                    </div>
                    <img
                      src={handoverRecord.evidence_photos[0]}
                      alt="Handover proof"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  </div>
                )}

                {/* Gửi yêu cầu thanh toán tiền lên Quản lý web khi khách nhận hàng */}
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px 14px",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <span style={{ color: "#10b981", fontWeight: 600, fontSize: "0.88rem" }}>
                        💰 Khách thuê đã nhận bàn giao thiết bị!
                      </span>
                      <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>
                        Bạn có thể gửi ngay thông tin tài khoản ngân hàng & mã QR để Quản lý web duyệt giải ngân tiền thuê.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      style={{ fontSize: "0.78rem", padding: "6px 12px", background: "#10b981" }}
                      onClick={() => void handleOpenPayoutModal()}
                    >
                      💸 Gửi yêu cầu thanh toán (QR & Ngân hàng)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="owner-empty-state" style={{ padding: "30px 10px" }}>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  Chưa lập biên bản bàn giao. Khi giao máy cho khách thuê, hãy bấm lập biên bản để xác nhận phụ kiện và tình trạng ban đầu.
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Biên bản kiểm tra trả thiết bị (UC_O09) */}
          <div className="owner-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                2️⃣ Biên bản kiểm tra trả thiết bị (UC_O09)
              </h3>
              {returnRecord ? (
                returnRecord.moderator_review?.status === "needs_changes" ? (
                  <button className="button button-secondary" onClick={() => prepareRecordUpdate(returnRecord)}>
                    Bổ sung theo yêu cầu
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="status-badge status-completed">
                      {returnRecord.moderator_review?.status === "verified" ? "✓ Đã xác minh" : "Đã kiểm tra trả • Chờ xác minh"}
                    </span>
                    {(currentContract as any)?.owner_review ? (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid #f59e0b",
                          color: "#fbbf24",
                          fontWeight: "bold",
                        }}
                      >
                        ⭐ Đã đánh giá: {(currentContract as any).owner_review.rating}/5★
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="button"
                        style={{
                          fontSize: "0.8rem",
                          padding: "5px 12px",
                          background: "#f59e0b",
                          color: "#111827",
                          fontWeight: "bold",
                          border: "none",
                        }}
                        onClick={() => setShowReviewModal(true)}
                      >
                        ⭐ Đánh giá Người thuê
                      </button>
                    )}
                  </div>
                )
              ) : handoverRecord ? (
                <button
                  className="button button-primary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px", background: "#f59e0b" }}
                  onClick={() => setShowReturnModal(true)}
                >
                  + Kiểm tra nhận trả (UC_O09)
                </button>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Cần bàn giao trước</span>
              )}
            </div>

            {returnRecord ? (
              <div className="record-details-view">
                {returnRecord.moderator_review?.note && (
                  <div className="moderator-warning">
                    <strong>Yêu cầu bổ sung:</strong> {returnRecord.moderator_review.note}
                  </div>
                )}
                <div className="record-info-row">
                  <span className="info-lbl">Thời điểm kiểm tra trả:</span>
                  <span className="info-val">
                    {new Date(returnRecord.record_date).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div className="record-info-row">
                  <span className="info-lbl">Tình trạng khi trả:</span>
                  <span className="info-val" style={{ color: "#fff" }}>
                    {returnRecord.physical_condition}
                  </span>
                </div>

                {returnRecord.missing_items && returnRecord.missing_items.length > 0 && (
                  <div className="record-info-row">
                    <span className="info-lbl" style={{ color: "#ef4444" }}>Phụ kiện thiếu:</span>
                    <span className="info-val" style={{ color: "#ef4444" }}>
                      {returnRecord.missing_items.join(", ")}
                    </span>
                  </div>
                )}

                {returnRecord.damage_detected && (
                  <div className="record-info-row">
                    <span className="info-lbl" style={{ color: "#ef4444" }}>Hư hỏng ghi nhận:</span>
                    <span className="info-val" style={{ color: "#ef4444" }}>
                      {returnRecord.damage_detected}
                    </span>
                  </div>
                )}

                {returnRecord.estimated_damage_cost && returnRecord.estimated_damage_cost > 0 ? (
                  <div className="record-info-row" style={{ background: "rgba(239, 68, 68, 0.1)", padding: "8px", borderRadius: "6px" }}>
                    <span className="info-lbl" style={{ color: "#ef4444", fontWeight: 700 }}>
                      Khấu trừ cọc bồi thường:
                    </span>
                    <span className="info-val" style={{ color: "#ef4444", fontWeight: 700 }}>
                      {returnRecord.estimated_damage_cost.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                ) : (
                  <div style={{ color: "#10b981", fontSize: "0.85rem", marginTop: "8px" }}>
                    ✓ Không phát hiện hư hỏng, hoàn 100% tiền cọc.
                  </div>
                )}

                {returnRecord.evidence_photos && returnRecord.evidence_photos.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "6px" }}>
                      Ảnh minh chứng lúc trả:
                    </div>
                    <img
                      src={returnRecord.evidence_photos[0]}
                      alt="Return proof"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="owner-empty-state" style={{ padding: "30px 10px" }}>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  Chưa lập biên bản nhận trả. Khi người thuê hoàn trả thiết bị, bấm kiểm tra để đối chiếu với biên bản bàn giao ban đầu.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Handover Equipment (UC_O08) */}
      {showHandoverModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3>🤝 {editingRecord ? "Bổ sung Biên bản Bàn giao" : "Lập Biên bản Bàn giao thiết bị (UC_O08)"}</h3>
              <button className="close-modal-btn" onClick={() => { setShowHandoverModal(false); setEditingRecord(null); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHandover}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Tình trạng vật lý & thẩm mỹ khi giao *</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Kiểm tra phụ kiện đi kèm:</label>
                  <div style={{ display: "grid", gap: "8px", background: "#111827", padding: "12px", borderRadius: "8px" }}>
                    {accessoriesList.map((item, idx) => (
                      <label key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem" }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => {
                            const updated = [...accessoriesList];
                            updated[idx].checked = e.target.checked;
                            setAccessoriesList(updated);
                          }}
                        />
                        <span>{item.item}</span>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: "4px 8px", fontSize: "0.8rem", marginLeft: "auto", width: "180px" }}
                          placeholder="Ghi chú (serial pin,...)"
                          value={item.notes}
                          onChange={(e) => {
                            const updated = [...accessoriesList];
                            updated[idx].notes = e.target.value;
                            setAccessoriesList(updated);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label">Trạng thái hoạt động kỹ thuật</label>
                  <input
                    className="input-field"
                    type="text"
                    value={handoverWorkingStatus}
                    onChange={(e) => setHandoverWorkingStatus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">URL Ảnh chụp hiện trạng bàn giao thực tế</label>
                  <input
                    className="input-field"
                    type="url"
                    value={handoverProofUrl}
                    onChange={(e) => setHandoverProofUrl(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Ghi chú bàn giao</label>
                  <input
                    className="input-field"
                    type="text"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => { setShowHandoverModal(false); setEditingRecord(null); }}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : editingRecord ? "Gửi lại để xác minh" : "Xác nhận bàn giao thiết bị"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return Inspection (UC_O09) */}
      {/* MODAL: GỬI YÊU CẦU THANH TOÁN KHI KHÁCH NHẬN HÀNG */}
      {showPayoutModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "620px" }}>
            <div className="owner-modal-header">
              <h3>💳 Gửi yêu cầu thanh toán tiền thuê lên Quản lý web</h3>
              <button className="close-modal-btn" onClick={() => setShowPayoutModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Khách thuê đã nhận thiết bị theo biên bản bàn giao. Vui lòng cung cấp số tài khoản và mã QR để Quản lý web (Moderator) duyệt và chuyển khoản giải ngân tiền thuê:
            </p>

            {(() => {
              const curContract = contracts.find((c) => c._id === activeContractId);
              const fee = curContract?.rental_price || 0;
              const platformFee = Math.round(fee * 0.05);
              const payoutAmount = payoutSettlement?.owner_payout_amount || Math.max(0, fee - platformFee);
              const autoQr = generateVietQrUrl(
                payoutBankCode,
                payoutAccountNumber,
                payoutAmount,
                `GIAI NGAN HD ${curContract?.contract_code || ""}`,
                payoutAccountHolder
              );

              return (
                <form onSubmit={handleSubmitPayout}>
                  <div style={{ background: "#111827", padding: "12px 14px", borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.88rem" }}>
                      <span style={{ color: "var(--muted)" }}>Tiền thuê thiết bị:</span>
                      <strong style={{ color: "#fff" }}>{fee.toLocaleString("vi-VN")} đ</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.88rem" }}>
                      <span style={{ color: "var(--muted)" }}>Phí nền tảng (5%):</span>
                      <span style={{ color: "var(--muted)" }}>-{platformFee.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "6px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#fff", fontWeight: 600 }}>Thực nhận giải ngân cho Owner:</span>
                      <strong style={{ color: "#10b981", fontSize: "1.2rem" }}>
                        {payoutAmount.toLocaleString("vi-VN")} đ
                      </strong>
                    </div>
                  </div>

                  <h4 style={{ margin: "0 0 10px", fontSize: "0.92rem", color: "var(--orange)" }}>
                    🏦 Thông tin ngân hàng & Mã QR nhận tiền:
                  </h4>

                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label className="field-label">Chọn ngân hàng *</label>
                      <select
                        className="input-field"
                        value={payoutBankCode}
                        onChange={(e) => {
                          setPayoutBankCode(e.target.value);
                          const f = VIETNAM_BANKS.find((b) => b.code === e.target.value);
                          if (f) setPayoutBankName(f.name);
                        }}
                        required
                      >
                        {VIETNAM_BANKS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.shortName} — {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="field-label">Số tài khoản ngân hàng *</label>
                        <input
                          className="input-field"
                          type="text"
                          placeholder="Ví dụ: 0398889999"
                          value={payoutAccountNumber}
                          onChange={(e) => setPayoutAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Tên chủ tài khoản (In hoa) *</label>
                        <input
                          className="input-field"
                          type="text"
                          placeholder="NGUYEN VAN A"
                          value={payoutAccountHolder}
                          onChange={(e) => setPayoutAccountHolder(e.target.value.toUpperCase())}
                          required
                        />
                      </div>
                    </div>

                    {/* QR Code section */}
                    <div style={{ background: "#0b1329", padding: "12px", borderRadius: 8, border: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label className="field-label" style={{ margin: 0, color: "#fff" }}>
                          📱 Mã QR chuyển khoản nhận tiền
                        </label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={`button ${payoutQrMode === "auto" ? "button-primary" : "button-quiet"}`}
                            style={{ fontSize: "0.72rem", padding: "2px 8px", height: "auto" }}
                            onClick={() => setPayoutQrMode("auto")}
                          >
                            ⚡ Tự tạo VietQR
                          </button>
                          <button
                            type="button"
                            className={`button ${payoutQrMode === "custom" ? "button-primary" : "button-quiet"}`}
                            style={{ fontSize: "0.72rem", padding: "2px 8px", height: "auto" }}
                            onClick={() => setPayoutQrMode("custom")}
                          >
                            🖼️ Dán link QR
                          </button>
                        </div>
                      </div>

                      {payoutQrMode === "auto" ? (
                        <div>
                          {payoutAccountNumber ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <img
                                src={autoQr}
                                alt="VietQR"
                                style={{ width: 110, height: 110, borderRadius: 6, background: "#fff", padding: 4, cursor: "pointer" }}
                                onClick={() => setPreviewHandoverQr(autoQr)}
                                title="Bấm để phóng to"
                              />
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                <p style={{ margin: "0 0 4px", color: "#10b981", fontWeight: 600 }}>
                                  ✓ Đã tạo mã VietQR chuẩn
                                </p>
                                <p style={{ margin: "0 0 2px" }}>Ngân hàng: <strong style={{ color: "#fff" }}>{payoutBankName}</strong></p>
                                <p style={{ margin: 0 }}>Số tiền: <strong style={{ color: "#10b981" }}>{payoutAmount.toLocaleString("vi-VN")} đ</strong></p>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                              👉 Nhập số tài khoản để hiển thị mã VietQR tự động.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <input
                            className="input-field"
                            type="url"
                            placeholder="Dán link ảnh mã QR (https://...)"
                            value={payoutCustomQrUrl}
                            onChange={(e) => setPayoutCustomQrUrl(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="field-label">Ghi chú cho Quản lý web (Tùy chọn)</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Khách đã nhận bàn giao máy tốt..."
                        value={payoutRequestNote}
                        onChange={(e) => setPayoutRequestNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button type="button" className="button button-quiet" onClick={() => setShowPayoutModal(false)}>
                      Hủy
                    </button>
                    <button type="submit" className="button button-primary" disabled={isSubmittingPayout}>
                      {isSubmittingPayout ? "Đang gửi..." : "📤 Gửi yêu cầu thanh toán lên Quản lý web"}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewHandoverQr && (
        <div className="owner-modal-overlay" onClick={() => setPreviewHandoverQr(null)}>
          <div className="owner-modal-card" style={{ maxWidth: "360px", textAlign: "center", padding: "20px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", color: "#fff", fontSize: "1rem" }}>📱 Mã QR Nhận tiền</h3>
            <img src={previewHandoverQr} alt="QR" style={{ width: "100%", borderRadius: 8, background: "#fff", padding: 6 }} />
            <div style={{ marginTop: 12 }}>
              <button type="button" className="button button-secondary" style={{ width: "100%" }} onClick={() => setPreviewHandoverQr(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "600px" }}>
            <div className="owner-modal-header">
              <h3>🔍 {editingRecord ? "Bổ sung Biên bản hoàn trả" : "Biên bản kiểm tra trả & Đối chiếu bàn giao (UC_O09)"}</h3>
              <button className="close-modal-btn" onClick={() => { setShowReturnModal(false); setEditingRecord(null); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReturn}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">Tình trạng vật lý khi nhận lại *</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Phụ kiện thiếu hụt (nếu có, cách nhau bằng dấu phẩy)</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Thiếu 1 nắp lens cap trước, thiếu cáp sạc USB-C"
                    value={missingItemsInput}
                    onChange={(e) => setMissingItemsInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Hư hỏng / Trầy xước phát hiện (nếu có)</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Trầy xước viền ngoài lens, va đập cánh quạt flycam"
                    value={damageDetected}
                    onChange={(e) => setDamageDetected(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Chi phí khấu trừ hư hại đề xuất (VND)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step={50000}
                    value={damageCost}
                    onChange={(e) => setDamageCost(Math.max(0, Number(e.target.value)))}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e") e.preventDefault();
                    }}
                  />
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Khoản này sẽ tự động được cấn trừ vào tiền cọc hoàn trả của Renter theo quy định tại UC_O10.
                  </span>
                </div>

                <div>
                  <label className="field-label">Trạng thái hoạt động kỹ thuật</label>
                  <input
                    className="input-field"
                    type="text"
                    value={returnWorkingStatus}
                    onChange={(e) => setReturnWorkingStatus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Ghi chú kiểm tra trả</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ghi chú thêm về hiện trạng..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">URL Ảnh chụp minh chứng hư hỏng / khi nhận</label>
                  <input
                    className="input-field"
                    type="url"
                    placeholder="https://..."
                    value={returnProofUrl}
                    onChange={(e) => setReturnProofUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => { setShowReturnModal(false); setEditingRecord(null); }}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : editingRecord ? "Gửi lại để xác minh" : "Xác nhận biên bản kiểm tra trả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL HỦY ĐƠN / SỰ CỐ THIẾT BỊ TRƯỚC BÀN GIAO */}
      {showCancelModal && currentContract && (
        <OwnerCancelRentalModal
          isOpen={showCancelModal}
          rentalId={currentContract._id}
          rentalCode={currentContract.contract_code}
          equipmentTitle={currentContract.equipment_id?.title || "Thiết bị"}
          renterName={currentContract.renter_id?.name || "Khách thuê"}
          isPaid={isContractPaid}
          totalAmount={currentContract.rental_price || 0}
          token={token}
          onClose={() => setShowCancelModal(false)}
          onSuccess={(msg) => {
            onSuccess(msg);
            onRefreshContracts();
          }}
          onError={onError}
        />
      )}

      {/* MODAL ĐÁNH GIÁ KHÁCH THUÊ & CHẤM ĐIỂM UY TÍN (TRUST SCORE) */}
      {showReviewModal && currentContract && (
        <OwnerReviewRenterModal
          isOpen={showReviewModal}
          rentalId={currentContract._id}
          rentalCode={currentContract.contract_code}
          equipmentTitle={currentContract.equipment_id?.title || "Thiết bị"}
          renterName={currentContract.renter_id?.name || "Khách thuê"}
          token={token}
          initialReview={(currentContract as any)?.owner_review}
          onClose={() => setShowReviewModal(false)}
          onSuccess={(msg) => {
            onSuccess(msg);
            onRefreshContracts();
          }}
          onError={onError}
        />
      )}
      {/* MODAL NGHIỆM THU & XÁC NHẬN NHẬN LẠI MÁY (UC_O09) */}
      {inspectingRental && (
        <div className="modal-backdrop" onClick={() => setInspectingRental(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: "620px", width: "95%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📦</span> Nghiệm Thu & Xác Nhận Nhận Lại Thiết Bị
                </h3>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                  Đơn thuê: <strong style={{ color: "#38bdf8" }}>#{inspectingRental.rentalCode}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRental(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.3rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Thông tin thiết bị & khách thuê */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Thiết bị:</span>
                <strong style={{ color: "#fff" }}>
                  {typeof inspectingRental.equipment === "object"
                    ? inspectingRental.equipment?.title
                    : "Thiết bị thuê"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Người thuê:</span>
                <strong style={{ color: "#38bdf8" }}>
                  {typeof inspectingRental.renter === "object" ? inspectingRental.renter?.name : "Khách thuê"}
                </strong>
                {typeof inspectingRental.renter === "object" && inspectingRental.renter?.phone && (
                  <span style={{ color: "var(--muted)", display: "block", fontSize: "0.78rem" }}>
                    📞 {inspectingRental.renter.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Khối thông tin khách khai báo khi trả đồ */}
            <div
              style={{
                background: "rgba(147, 51, 234, 0.08)",
                border: "1px solid rgba(147, 51, 234, 0.35)",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: "18px",
              }}
            >
              <h4 style={{ margin: "0 0 10px", color: "#d8b4fe", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📋</span> Thông tin Người thuê khai báo lúc trả đồ:
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.84rem" }}>
                <div>
                  🕒 <strong style={{ color: "#c084fc" }}>Thời gian hẹn trả:</strong>{" "}
                  {inspectingRental.returnInfo?.returnTime
                    ? new Date(inspectingRental.returnInfo.returnTime).toLocaleString("vi-VN")
                    : "Sớm nhất"}
                </div>
                <div>
                  📍 <strong style={{ color: "#38bdf8" }}>Địa điểm nhận lại:</strong>{" "}
                  {inspectingRental.returnInfo?.returnLocation || inspectingRental.deliveryAddress || "Địa chỉ mặc định theo hợp đồng"}
                </div>
                <div>
                  🔍 <strong style={{ color: "#34d399" }}>Tình trạng máy khách báo:</strong>{" "}
                  {inspectingRental.returnInfo?.returnCondition ||
                    inspectingRental.returnRequest?.deviceConditionNote ||
                    "Thiết bị nguyên vẹn, hoạt động bình thường"}
                </div>
                {inspectingRental.returnInfo?.returnNote && (
                  <div>
                    📝 <strong style={{ color: "#fbbf24" }}>Ghi chú của khách:</strong>{" "}
                    <em>"{inspectingRental.returnInfo.returnNote}"</em>
                  </div>
                )}
                {/* Ảnh chụp thực tế của khách nếu có */}
                {Array.isArray(inspectingRental.returnRequest?.returnImages) && inspectingRental.returnRequest.returnImages.length > 0 && (
                  <div style={{ marginTop: "6px" }}>
                    <span style={{ color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      📸 Ảnh minh chứng do khách chụp:
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {inspectingRental.returnRequest.returnImages.map((img: string, idx: number) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                          <img
                            src={img}
                            alt=""
                            style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1px solid #334155" }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form nghiệm thu của Chủ máy */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                Tình trạng thiết bị khi bạn nhận lại:
              </label>
              <input
                type="text"
                className="input-field"
                value={inspectionCondition}
                onChange={(e) => setInspectionCondition(e.target.value)}
                placeholder="Ví dụ: Thiết bị nguyên vẹn, sensor sạch, đầy đủ pin sạc và thẻ nhớ."
                style={{ width: "100%", marginBottom: "12px", fontSize: "0.85rem" }}
              />

              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                Ghi chú nghiệm thu của Chủ máy (tùy chọn):
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={inspectionNotesText}
                onChange={(e) => setInspectionNotesText(e.target.value)}
                placeholder="Ghi chú thêm về phụ kiện, số serial, hoặc hướng dẫn tiếp theo..."
                style={{ width: "100%", fontSize: "0.85rem" }}
              />
            </div>

            {/* Nút hành động */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const target = inspectingRental;
                  setInspectingRental(null);
                  setDamageReportRental(target);
                }}
                className="button button-quiet"
                style={{
                  color: "#f87171",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  background: "rgba(239, 68, 68, 0.12)",
                  fontSize: "0.82rem",
                  padding: "8px 14px",
                  borderRadius: "10px",
                }}
              >
                ⚠️ Báo hư hỏng / Khiếu nại
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setInspectingRental(null)}
                  className="button button-secondary"
                  style={{ fontSize: "0.82rem", padding: "8px 14px", borderRadius: "10px" }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmDirectReturn(inspectingRental)}
                  className="button"
                  style={{
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    padding: "8px 18px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    border: "none",
                    boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  {isSubmitting ? "Đang xử lý..." : "✅ Xác nhận nhận máy & Hoàn tất"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KHIẾU NẠI HƯ HỎNG THIẾT BỊ (REPORT DAMAGE) */}
      {damageReportRental && (
        <OwnerDamageReportModal
          isOpen={Boolean(damageReportRental)}
          rental={damageReportRental as any}
          token={token}
          onClose={() => setDamageReportRental(null)}
          onSuccess={() => {
            onSuccess("Đã gửi hồ sơ khiếu nại hư hỏng lên Admin thành công. Đơn hàng chuyển sang trạng thái Đang tranh chấp.");
            void fetchDirectRentals();
            onRefreshContracts();
          }}
        />
      )}

      {/* MODAL CHAT VỚI KHÁCH THUÊ */}
      {chatRental && (
        <RentalChatModal
          rental={chatRental}
          isOpen={Boolean(chatRental)}
          token={token}
          onClose={() => setChatRental(null)}
          onViewContract={(r) => {
            setViewingPdfRental(r);
          }}
        />
      )}

      {/* MODAL XEM HỢP ĐỒNG PDF */}
      {viewingPdfRental && (
        <ContractPdfModal
          rental={viewingPdfRental}
          isOpen={Boolean(viewingPdfRental)}
          isOwner={true}
          onClose={() => setViewingPdfRental(null)}
        />
      )}
    </div>
  );
}
