import { useEffect, useState } from "react";
import { useAuth } from "../../app/AuthProvider";
import type { OwnerContractTemplate, RentalContract, RentalRequest, DigitalSignaturePayload } from "../../types/owner";
import DigitalSignaturePad from "../../components/DigitalSignaturePad";
import { ownerApi } from "../../services/ownerApi";

interface Props {
  contracts: RentalContract[];
  approvedRequests: RentalRequest[];
  token: string;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  initialSelectedRequest?: RentalRequest | null;
  onOpenHandoverTab: (contract: RentalContract) => void;
}

function buildStandardOwnerContractText(
  req: RentalRequest | undefined,
  ownerName: string,
  ownerEmail: string,
  specialConditions: string
): string {
  if (!req) return "";
  const eq = req.equipment_id;
  const accessoriesText =
    eq?.accessories && eq.accessories.length > 0
      ? eq.accessories.join(", ")
      : "Theo tiêu chuẩn nhà sản xuất";

  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
--------------------------------------------------
HỢP ĐỒNG THUÊ THIẾT BỊ ĐIỆN TỬ CHUẨN
(Dự thảo trình Quản lý web kiểm duyệt và gửi Người thuê ký tên)

Căn cứ Bộ luật Dân sự nước CHXHCN Việt Nam hiện hành;
Căn cứ Quy chế hoạt động và Kiểm duyệt Hợp đồng của Nền tảng SWP391 Rental;
Hôm nay, ngày ${new Date().toLocaleDateString("vi-VN")}, chúng tôi gồm có:

I. BÊN CHO THUÊ THIẾT BỊ (BÊN A - OWNER):
- Họ và tên đại diện: ${ownerName}
- Email liên hệ: ${ownerEmail}
- Vai trò: Chủ sở hữu hợp pháp của thiết bị cho thuê trên nền tảng.

II. BÊN THUÊ THIẾT BỊ (BÊN B - RENTER):
- Họ và tên đại diện: ${req.renter_name}
- Email liên hệ: ${req.renter_email || "N/A"}
- Số điện thoại: ${req.renter_phone || "N/A"}
- Mã yêu cầu thuê gốc: ${req.request_code}

Hai bên thống nhất lập Hợp đồng thuê thiết bị chuẩn với các điều khoản dưới đây:

ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG & TÌNH TRẠNG THIẾT BỊ
1.1. Tên thiết bị: ${eq?.title || "Thiết bị cho thuê"}
1.2. Thương hiệu / Model: ${eq?.brand || "Chính hãng"} / ${eq?.model_name || "Tiêu chuẩn"}
1.3. Số Serial (S/N): ${eq?.serial_number || "Ghi nhận chi tiết tại Biên bản bàn giao"}
1.4. Tình trạng thiết bị khi lập hợp đồng: ${eq?.condition || "Tốt (95%)"}
1.5. Phụ kiện đi kèm: ${accessoriesText}

ĐIỀU 2: THỜI HẠN THUÊ THIẾT BỊ
2.1. Thời gian bắt đầu nhận máy: ${new Date(req.start_date).toLocaleString("vi-VN")}
2.2. Thời gian hoàn trả máy: ${new Date(req.end_date).toLocaleString("vi-VN")}
2.3. Hình thức tính thuê: ${
    req.rental_type === "hourly"
      ? "Thuê theo giờ"
      : `Thuê theo ngày (${req.duration_days || 1} ngày)`
  }

ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG & THANH TOÁN
3.1. Tổng phí thuê thiết bị: ${req.rental_fee.toLocaleString("vi-VN")} VND (Không cần tiền cọc)
3.4. Chính sách hủy đơn: ${eq?.cancellation_policy || "Miễn phí hủy trước 24 giờ."}

ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A (OWNER)
4.1. Bàn giao thiết bị đúng chủng loại, số serial, phụ kiện và tình trạng hoạt động tốt đúng thời gian đã thỏa thuận.
4.2. Lập Biên bản bàn giao (UC_O08) và Biên bản kiểm tra hoàn trả (UC_O09) có đầy đủ hình ảnh minh chứng.
4.3. Xác nhận hoàn tất nghiệm thu thiết bị sau khi Bên B hoàn trả đầy đủ không phát sinh hư hại.

ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B (RENTER)
5.1. Kiểm tra kỹ tình trạng vật lý và hoạt động của thiết bị khi nhận bàn giao.
5.2. Sử dụng thiết bị đúng mục đích, tự bảo quản thiết bị, không tự ý tháo mở, sửa chữa hoặc cho bên thứ ba thuê lại.
5.3. Quy định của Owner: ${
    eq?.rental_terms ||
    "Người thuê chịu trách nhiệm bảo quản nguyên vẹn thiết bị và hoàn trả đúng hẹn."
  }
5.4. Trường hợp trả trễ hạn hoặc phát sinh hư hỏng, mất mát linh kiện/phụ kiện, Bên B đồng ý thanh toán chi phí khắc phục thực tế theo Biên bản hoàn trả được Quản lý web xác minh.

ĐIỀU 6: ĐIỀU KHOẢN BỔ SUNG CỦA OWNER
${specialConditions.trim() || "Không có điều khoản bổ sung đặc biệt."}

ĐIỀU 7: QUY TRÌNH PHÊ DUYỆT CỦA QUẢN LÝ WEB & CHỮ KÝ NGƯỜI THUÊ
7.1. Hợp đồng này được Bên A (Owner) lập sau khi duyệt yêu cầu thuê do Quản lý web chuyển tiếp, và gửi lên cho Quản lý web kiểm duyệt nội dung.
7.2. Sau khi Quản lý web phê duyệt hợp lệ, Quản lý web gửi Hợp đồng này tới Bên B (Người thuê) để Bên B ký tên điện tử xác nhận hiệu lực hợp đồng.`;
}

export default function OwnerContractsTab({
  contracts,
  approvedRequests,
  token,
  onRefresh,
  onError,
  onSuccess,
  initialSelectedRequest,
  onOpenHandoverTab,
}: Props) {
  const { user } = useAuth();

  // Create Modal states
  const [showCreateModal, setShowCreateModal] = useState(Boolean(initialSelectedRequest));
  const [selectedRequestForContract, setSelectedRequestForContract] = useState<string>(
    initialSelectedRequest?._id || ""
  );
  const [specialConditions, setSpecialConditions] = useState("");
  const [customDraftTerms, setCustomDraftTerms] = useState("");
  const [isCustomizingTerms, setIsCustomizingTerms] = useState(false);

  const [publishedTemplates, setPublishedTemplates] = useState<OwnerContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});

  // Edit Modal states (UC_O13)
  const [editingContract, setEditingContract] = useState<RentalContract | null>(null);
  const [editedTerms, setEditedTerms] = useState("");
  const [editedSpecialConditions, setEditedSpecialConditions] = useState("");
  const [changesSummary, setChangesSummary] = useState("");

  // View Modal states
  const [viewingContract, setViewingContract] = useState<RentalContract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Digital Signature states (UC_O12, UC_O13, UC_O15)
  const [createSignature, setCreateSignature] = useState<DigitalSignaturePayload | null>(null);
  const [editSignature, setEditSignature] = useState<DigitalSignaturePayload | null>(null);
  const [signingContract, setSigningContract] = useState<RentalContract | null>(null);
  const [signingSignature, setSigningSignature] = useState<DigitalSignaturePayload | null>(null);

  useEffect(() => {
    ownerApi
      .getPublishedContractTemplates(token)
      .then(({ templates }) => setPublishedTemplates(templates))
      .catch((err: unknown) =>
        onError(err instanceof Error ? err.message : "Không thể tải mẫu hợp đồng.")
      );
  }, [token]);

  useEffect(() => {
    if (initialSelectedRequest) {
      setSelectedRequestForContract(initialSelectedRequest._id);
      setIsCustomizingTerms(false);
      setShowCreateModal(true);
    }
  }, [initialSelectedRequest]);

  const selectableRequests =
    initialSelectedRequest && !approvedRequests.some((r) => r._id === initialSelectedRequest._id)
      ? [initialSelectedRequest, ...approvedRequests]
      : approvedRequests;

  const activeRequestObj = selectableRequests.find((r) => r._id === selectedRequestForContract);

  // Keep standard contract preview updated unless Owner manually toggled custom editing
  useEffect(() => {
    if (!isCustomizingTerms && activeRequestObj) {
      setCustomDraftTerms(
        buildStandardOwnerContractText(
          activeRequestObj,
          user?.name || "Chủ thiết bị (Owner)",
          user?.email || "owner@swp391.vn",
          specialConditions
        )
      );
    }
  }, [activeRequestObj, specialConditions, isCustomizingTerms, user]);

  const selectedTemplate = publishedTemplates.find(
    (template) => template._id === selectedTemplateId
  );
  const automaticTemplateFields = new Set([
    "contract_code",
    "owner_name",
    "owner_email",
    "renter_name",
    "renter_email",
    "renter_phone",
    "equipment_title",
    "equipment_brand",
    "equipment_model",
    "equipment_condition",
    "start_date",
    "end_date",
    "rental_price",
    "deposit_amount",
    "special_conditions",
  ]);

  // UC_O12 (+ optional UC_O14): Create Standard Contract & send to Web Manager with Digital Signature
  async function handleCreateContract(submitImmediately: boolean) {
    if (!selectedRequestForContract) {
      onError("Vui lòng chọn một yêu cầu thuê đã chấp nhận.");
      return;
    }

    if (submitImmediately && !createSignature) {
      onError("Vui lòng ký chữ ký số và xác nhận cam kết trách nhiệm pháp lý trước khi gửi Quản lý web duyệt.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const res = await ownerApi.createContract(token, {
        request_id: selectedRequestForContract,
        special_conditions: specialConditions,
        custom_terms: selectedTemplateId ? undefined : customDraftTerms,
        template_id: selectedTemplateId || undefined,
        template_values: templateValues,
        submit_immediately: submitImmediately,
        digital_signature: createSignature || undefined,
      });
      onSuccess(
        submitImmediately
          ? `Đã lập Hợp đồng chuẩn "${res.contract.contract_code}" kèm Chữ ký số của Owner và gửi cho Quản lý web duyệt! Sau khi Quản lý web duyệt sẽ gửi cho Người thuê ký tên.`
          : `Đã lưu bản nháp Hợp đồng chuẩn "${res.contract.contract_code}" (v1)${createSignature ? " kèm chữ ký số" : ""}. Bạn có thể kiểm tra lại và gửi cho Quản lý web duyệt.`
      );
      setShowCreateModal(false);
      setSpecialConditions("");
      setCustomDraftTerms("");
      setIsCustomizingTerms(false);
      setSelectedTemplateId("");
      setTemplateValues({});
      setCreateSignature(null);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Lập hợp đồng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O13: Update Draft / Rejected Contract (with optional immediate resubmit to Web Manager)
  async function handleUpdateDraft(submitImmediately: boolean) {
    if (!editingContract) return;
    if (!changesSummary.trim()) {
      onError("Vui lòng nhập tóm tắt nội dung thay đổi của phiên bản mới.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      const res = await ownerApi.updateDraftContract(token, editingContract._id, {
        terms_content: editedTerms,
        special_conditions: editedSpecialConditions,
        changes_summary: changesSummary,
        submit_immediately: submitImmediately,
        digital_signature: editSignature || undefined,
      });
      onSuccess(
        submitImmediately
          ? `Đã lưu phiên bản v${res.contract.version} và gửi lại cho Quản lý web phê duyệt!`
          : `Đã lưu hợp đồng phiên bản mới (v${res.contract.version}) ở trạng thái bản nháp.`
      );
      setEditingContract(null);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Cập nhật hợp đồng thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O15: Confirm / Re-sign E-Contract with Digital Signature
  async function handleConfirmEContract() {
    if (!signingContract) return;
    if (!signingSignature) {
      onError("Vui lòng hoàn tất nét ký / chọn phông chữ ký và xác nhận cam kết pháp lý.");
      return;
    }

    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.confirmEContract(token, signingContract._id, {
        digital_signature: signingSignature,
      });
      onSuccess(`Đã ghi nhận Chữ ký số điện tử của Owner cho Hợp đồng "${signingContract.contract_code}" thành công!`);
      setSigningContract(null);
      setSigningSignature(null);
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ký chữ ký số thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UC_O14: Submit for Approval to Web Manager
  async function handleSubmitApproval(contract: RentalContract) {
    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.submitContractApproval(token, contract._id);
      onSuccess(
        `Đã gửi hợp đồng chuẩn "${contract.contract_code}" (v${contract.version}) đến Quản lý web xét duyệt. Sau khi Quản lý web duyệt sẽ gửi cho Người thuê ký tên.`
      );
      if (viewingContract && viewingContract._id === contract._id) {
        setViewingContract(null);
      }
      onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi phê duyệt thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  function renderWorkflowStepper(c: RentalContract) {
    // 4-step contract workflow after Owner approved request:
    // Step 1: Owner lập HĐ cho thuê (draft / moderator_rejected)
    // Step 2: Gửi Quản lý web duyệt (pending_approval)
    // Step 3: Quản lý web duyệt & gửi Người thuê ký (moderator_approved)
    // Step 4: Người thuê (Renter) ký tên hoàn tất (signed / active / completed)
    const isRejected = c.status === "moderator_rejected";
    const step1Done = true;
    const step2Active = c.status === "pending_approval";
    const step2Done = ["moderator_approved", "signed", "active", "completed"].includes(c.status);
    const step3Active = c.status === "moderator_approved";
    const step3Done = ["moderator_approved", "signed", "active", "completed"].includes(c.status);
    const step4Done = ["signed", "active", "completed"].includes(c.status);

    const steps = [
      {
        num: 1,
        label: `1. Owner lập Hợp đồng (v${c.version})`,
        sub: isRejected ? "Cần chỉnh sửa lại" : "Đã soạn thảo & ký Bên A",
        state: isRejected ? "rejected" : step1Done ? "done" : "current",
      },
      {
        num: 2,
        label: "2. Gửi Quản lý web duyệt",
        sub: step2Active
          ? "Đang chờ Quản lý web duyệt..."
          : step2Done
          ? "Đã gửi Quản lý web"
          : isRejected
          ? "Cần gửi duyệt lại"
          : "Chưa gửi duyệt",
        state: step2Done ? "done" : step2Active ? "current" : "pending",
      },
      {
        num: 3,
        label: "3. Quản lý web duyệt & gửi Renter",
        sub: isRejected
          ? "Quản lý web từ chối"
          : step3Done
          ? `Đã duyệt v${c.moderator_approved_version || c.version} & gửi Renter`
          : "Chờ Quản lý web duyệt",
        state: isRejected ? "rejected" : step3Done ? "done" : "pending",
      },
      {
        num: 4,
        label: "4. Người thuê (Renter) ký tên",
        sub: step4Done
          ? "Người thuê đã ký tên!"
          : step3Active
          ? "Đang chờ Người thuê ký..."
          : "Chờ bước 3",
        state: step4Done ? "done" : step3Active ? "current" : "pending",
      },
    ];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "10px",
          marginTop: "14px",
          marginBottom: "14px",
        }}
      >
        {steps.map((st) => {
          const borderColor =
            st.state === "done"
              ? "rgba(16, 185, 129, 0.45)"
              : st.state === "current"
              ? "rgba(249, 115, 22, 0.65)"
              : st.state === "rejected"
              ? "rgba(239, 68, 68, 0.55)"
              : "var(--border)";
          const bg =
            st.state === "done"
              ? "rgba(16, 185, 129, 0.08)"
              : st.state === "current"
              ? "rgba(249, 115, 22, 0.12)"
              : st.state === "rejected"
              ? "rgba(239, 68, 68, 0.1)"
              : "#111827";
          const titleColor =
            st.state === "done"
              ? "#34d399"
              : st.state === "current"
              ? "#fb923c"
              : st.state === "rejected"
              ? "#f87171"
              : "#94a3b8";

          return (
            <div
              key={st.num}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: `1px solid ${borderColor}`,
                background: bg,
              }}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: titleColor }}>
                {st.state === "done" ? "✓ " : st.state === "rejected" ? "✕ " : st.state === "current" ? "● " : "○ "}
                {st.label}
              </div>
              <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: "3px" }}>
                {st.sub}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="owner-tab-content">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            📝 Lập Hợp đồng cho thuê & Trình Quản lý web duyệt (UC_O12 – UC_O15)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Quy trình:{" "}
            <strong style={{ color: "#fb923c" }}>1. Owner lập Hợp đồng cho thuê</strong> ➔{" "}
            <strong style={{ color: "#38bdf8" }}>2. Gửi Quản lý web duyệt</strong> ➔{" "}
            <strong style={{ color: "#34d399" }}>3. Quản lý web duyệt & gửi cho Người thuê</strong> ➔{" "}
            <strong style={{ color: "#fff" }}>4. Người thuê ký tên</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="input-field"
            style={{ width: "auto", minHeight: "42px", padding: "6px 12px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái ({contracts.length})</option>
            <option value="draft">
              📝 Bản nháp chờ gửi ({contracts.filter((c) => c.status === "draft").length})
            </option>
            <option value="pending_approval">
              ⏳ Chờ Quản lý web duyệt ({contracts.filter((c) => c.status === "pending_approval").length})
            </option>
            <option value="moderator_rejected">
              ❌ Quản lý web yêu cầu sửa ({contracts.filter((c) => c.status === "moderator_rejected").length})
            </option>
            <option value="moderator_approved">
              📨 Đã gửi Người thuê - Chờ ký ({contracts.filter((c) => c.status === "moderator_approved").length})
            </option>
            <option value="signed">
              ✍️ Người thuê đã ký tên ({contracts.filter((c) => c.status === "signed").length})
            </option>
          </select>

          <button
            className="button button-primary"
            style={{ width: "auto" }}
            onClick={() => {
              if (approvedRequests.length > 0 && !selectedRequestForContract) {
                setSelectedRequestForContract(approvedRequests[0]._id);
              }
              setShowCreateModal(true);
            }}
          >
            + Lập hợp đồng cho thuê mới (UC_O12) 📜
          </button>
        </div>
      </div>

      {/* Notice banner if there are approved requests waiting for Owner to draft contract */}
      {approvedRequests.length > 0 && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "12px",
            background: "rgba(249, 115, 22, 0.12)",
            border: "1px solid rgba(249, 115, 22, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <strong style={{ color: "#fb923c" }}>
              🔔 Bạn có {approvedRequests.length} yêu cầu thuê đã duyệt đang chờ lập Hợp đồng!
            </strong>
            <div style={{ fontSize: "0.84rem", color: "#cbd5e1", marginTop: "2px" }}>
              Hãy lập Hợp đồng cho thuê và gửi cho Quản lý web duyệt để Quản lý web gửi cho Người thuê ký tên.
            </div>
          </div>
          <button
            type="button"
            className="button button-primary"
            style={{ width: "auto", minHeight: "38px", padding: "0 16px" }}
            onClick={() => {
              setSelectedRequestForContract(approvedRequests[0]._id);
              setShowCreateModal(true);
            }}
          >
            Lập hợp đồng gửi Quản lý web ngay →
          </button>
        </div>
      )}

      {filteredContracts.length === 0 ? (
        <div className="owner-section-card owner-empty-state">
          <span style={{ fontSize: "2.5rem" }}>📜</span>
          <h3>Chưa có hợp đồng nào trong danh mục này</h3>
          <p>
            Hợp đồng sẽ được Owner lập từ các yêu cầu thuê đã duyệt, gửi cho Quản lý web kiểm duyệt, sau đó Quản lý web gửi cho Người thuê ký tên.
          </p>
          {approvedRequests.length > 0 && (
            <button
              className="button button-primary"
              style={{ marginTop: "12px", width: "auto" }}
              onClick={() => {
                setSelectedRequestForContract(approvedRequests[0]._id);
                setShowCreateModal(true);
              }}
            >
              Lập hợp đồng cho {approvedRequests.length} yêu cầu đã duyệt 🚀
            </button>
          )}
        </div>
      ) : (
        <div className="owner-contracts-list">
          {filteredContracts.map((c) => (
            <div key={c._id} className="owner-contract-card">
              <div className="owner-contract-header">
                <div>
                  <span className="contract-code-tag">{c.contract_code}</span>
                  <span className="contract-version-tag">Phiên bản: v{c.version}</span>
                  <h3 style={{ margin: "8px 0 4px", fontSize: "1.15rem", color: "#fff" }}>
                    {c.title}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    Người thuê:{" "}
                    <strong style={{ color: "#fff" }}>{c.renter_id?.name || "Renter"}</strong> (
                    {c.renter_id?.email || "N/A"}) • Thiết bị:{" "}
                    <strong style={{ color: "#fff" }}>{c.equipment_id?.title}</strong>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span className={`status-badge status-${c.status}`}>
                    {c.status === "draft"
                      ? "📝 Bước 1: Bản nháp (Chờ gửi Quản lý web)"
                      : c.status === "pending_approval"
                      ? "⏳ Bước 2: Đang chờ Quản lý web duyệt"
                      : c.status === "moderator_rejected"
                      ? "❌ Quản lý web yêu cầu chỉnh sửa"
                      : c.status === "moderator_approved"
                      ? "📨 Bước 3: Quản lý web đã duyệt & gửi Renter chờ ký"
                      : c.status === "signed"
                      ? "✍️ Bước 4: Người thuê đã ký tên (Sẵn sàng bàn giao)"
                      : c.status === "active"
                      ? "🚀 Đang thuê (Đã bàn giao)"
                      : c.status === "completed"
                      ? "🏁 Đã hoàn tất"
                      : c.status}
                  </span>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "6px" }}>
                    Tạo ngày: {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>

              {/* 4-Step Visual Progress Bar */}
              {renderWorkflowStepper(c)}

              {/* Moderator Feedback / Approval Notice */}
              {c.status === "moderator_rejected" && c.moderator_feedback && (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#fca5a5",
                    fontSize: "0.88rem",
                  }}
                >
                  <strong>⚠️ Yêu cầu chỉnh sửa từ Quản lý web:</strong> {c.moderator_feedback}
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "4px" }}>
                    Vui lòng bấm <strong>"Sửa hợp đồng & Gửi duyệt lại (UC_O13)"</strong> bên dưới để cập nhật phiên bản v{c.version + 1}.
                  </div>
                </div>
              )}

              {c.status === "pending_approval" && (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#7dd3fc",
                    fontSize: "0.86rem",
                  }}
                >
                  ⏳ <strong>Đang chờ Quản lý web kiểm duyệt:</strong> Hợp đồng phiên bản{" "}
                  <strong>v{c.version}</strong> đang được Quản lý web rà soát. Sau khi Quản lý web duyệt sẽ tự động chuyển tới Người thuê để ký tên.
                </div>
              )}

              {c.status === "moderator_approved" && (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "rgba(249, 115, 22, 0.12)",
                    border: "1px solid rgba(249, 115, 22, 0.35)",
                    color: "#fdba74",
                    fontSize: "0.88rem",
                  }}
                >
                  📨 <strong>Quản lý web đã phê duyệt hợp đồng (v{c.moderator_approved_version || c.version}) và gửi cho Người thuê!</strong>{" "}
                  Hệ thống đang chờ Người thuê (<strong>{c.renter_id?.name || "Renter"}</strong>) ký tên điện tử để hợp đồng chính thức có hiệu lực.
                </div>
              )}

              {c.status === "signed" && (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#6ee7b7",
                    fontSize: "0.88rem",
                  }}
                >
                  ✍️ <strong>Người thuê ({c.renter_id?.name || "Renter"}) đã ký tên xác nhận Hợp đồng!</strong>{" "}
                  Hợp đồng đã có đầy đủ hiệu lực pháp lý. Bạn có thể tiến hành <strong>Bàn giao thiết bị (UC_O08)</strong>.
                </div>
              )}

              {/* Financial & Dates summary */}
              <div className="contract-meta-bar">
                <div>
                  <span className="meta-label">Thời gian thuê:</span>
                  <span className="meta-val">
                    {new Date(c.start_date).toLocaleDateString("vi-VN")} ➔{" "}
                    {new Date(c.end_date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Giá trị thuê:</span>
                  <span className="meta-val" style={{ color: "#10b981", fontWeight: 700 }}>
                    {c.rental_price.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div>
                  <span className="meta-label">Tiền cọc cam kết:</span>
                  <span className="meta-val" style={{ color: "#10b981" }}>0 đ (Miễn cọc)</span>
                </div>
                <div>
                  <span className="meta-label">Chữ ký số Owner (Bên A):</span>
                  <span className="meta-val">
                    {c.owner_signature?.signed ? (
                      <span style={{ color: "#10b981", fontWeight: 700 }}>
                        ✍️ Đã ký số ({c.owner_signature.signer_name || "Owner"})
                      </span>
                    ) : (
                      <span style={{ color: "#f87171" }}>⚠️ Chưa ký số</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Chữ ký Người thuê (Bên B):</span>
                  <span className="meta-val">
                    {c.renter_signature?.signed || c.status === "signed" || c.status === "active" || c.status === "completed" ? (
                      <span style={{ color: "#10b981", fontWeight: 700 }}>✅ Người thuê đã ký</span>
                    ) : c.status === "moderator_approved" ? (
                      <span style={{ color: "#fb923c", fontWeight: 600 }}>⏳ Đã gửi - Chờ Renter ký</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>🔒 Chờ Quản lý web duyệt</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Version History preview */}
              {c.version_history && c.version_history.length > 0 && (
                <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--muted)" }}>
                  <span>Lịch sử phiên bản ({c.version_history.length}): </span>
                  {c.version_history.map((v, i) => (
                    <span key={i} style={{ marginRight: "8px" }}>
                      [v{v.version}: {v.changes_summary}]
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="contract-actions-bar">
                <button
                  className="button button-secondary"
                  style={{ width: "auto" }}
                  onClick={() => setViewingContract(c)}
                >
                  👁️ Xem toàn văn Hợp đồng
                </button>

                {/* UC_O15: Ký / cập nhật chữ ký số */}
                {["draft", "moderator_rejected"].includes(c.status) && (
                  <button
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    onClick={() => {
                      setSigningContract(c);
                      setSigningSignature(null);
                    }}
                  >
                    ✍️ {c.owner_signature?.signed ? "Ký lại Chữ ký số" : "Ký Chữ ký số (UC_O15)"}
                  </button>
                )}

                {/* UC_O13: Sửa bản nháp / bị trả lại */}
                {["draft", "moderator_rejected"].includes(c.status) && (
                  <button
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    onClick={() => {
                      setEditingContract(c);
                      setEditedTerms(c.terms_content);
                      setEditedSpecialConditions(c.special_conditions || "");
                      setChangesSummary(
                        c.status === "moderator_rejected"
                          ? `Chỉnh sửa theo phản hồi của Quản lý web (lên phiên bản v${c.version + 1})`
                          : `Cập nhật nội dung hợp đồng chuẩn v${c.version + 1}`
                      );
                    }}
                  >
                    ✏️ {c.status === "moderator_rejected" ? "Sửa theo yêu cầu Quản lý web" : "Chỉnh sửa nháp"} (v
                    {c.version + 1} - UC_O13)
                  </button>
                )}

                {/* UC_O14: Gửi Quản lý web duyệt */}
                {c.status === "draft" && (
                  <button
                    className="button button-primary"
                    style={{ width: "auto" }}
                    onClick={() => handleSubmitApproval(c)}
                    disabled={isSubmitting}
                  >
                    📤 Gửi Quản lý web duyệt (UC_O14)
                  </button>
                )}

                {/* Move to Handover when signed */}
                {(c.status === "signed" || c.status === "active") && (
                  <button
                    className="button button-primary"
                    style={{ width: "auto" }}
                    onClick={() => onOpenHandoverTab(c)}
                  >
                    🤝 Bàn giao & Kiểm tra thiết bị (UC_O08, UC_O09)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create Standard Contract from Approved Request (UC_O12) */}
      {showCreateModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "820px" }}>
            <div className="owner-modal-header">
              <h3>📜 Lập Hợp đồng cho thuê & Gửi Quản lý web duyệt (UC_O12)</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Hệ thống tự động trích xuất dữ liệu từ Yêu cầu thuê đã được Owner duyệt để lập{" "}
              <strong style={{ color: "#fff" }}>Hợp đồng cho thuê chuẩn</strong>. Sau khi bạn gửi lên,{" "}
              <strong style={{ color: "var(--orange)" }}>Quản lý web</strong> sẽ duyệt và gửi cho{" "}
              <strong style={{ color: "#10b981" }}>Người thuê ký tên</strong>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateContract(true);
              }}
            >
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label className="field-label">1. Chọn yêu cầu thuê đã được Owner chấp nhận *</label>
                  <select
                    className="input-field"
                    value={selectedRequestForContract}
                    onChange={(e) => {
                      setSelectedRequestForContract(e.target.value);
                      setIsCustomizingTerms(false);
                    }}
                    required
                  >
                    <option value="">-- Chọn yêu cầu thuê --</option>
                    {selectableRequests.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.request_code} • Người thuê: {r.renter_name} • Thiết bị: {r.equipment_id?.title} (
                        {r.rental_fee.toLocaleString("vi-VN")} đ)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Request Summary Box */}
                {activeRequestObj && (
                  <div
                    style={{
                      background: "#111827",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "14px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                      fontSize: "0.83rem",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Thiết bị cho thuê:</span>
                      <strong style={{ color: "#fff" }}>{activeRequestObj.equipment_id?.title}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Người thuê (Bên B):</span>
                      <strong style={{ color: "#fff" }}>
                        {activeRequestObj.renter_name} ({activeRequestObj.renter_phone || "N/A"})
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Thời hạn thuê:</span>
                      <strong style={{ color: "#fb923c" }}>
                        {new Date(activeRequestObj.start_date).toLocaleDateString("vi-VN")} ➔{" "}
                        {new Date(activeRequestObj.end_date).toLocaleDateString("vi-VN")}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Tiền thuê / Tiền cọc:</span>
                      <strong style={{ color: "#10b981" }}>
                        {activeRequestObj.rental_fee.toLocaleString("vi-VN")} đ
                      </strong>{" "}
                      / 0 đ (Miễn cọc)
                    </div>
                  </div>
                )}

                {publishedTemplates.length > 0 && (
                  <div>
                    <label className="field-label">Mẫu hợp đồng áp dụng</label>
                    <select
                      className="input-field"
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        setTemplateValues({});
                      }}
                    >
                      <option value="">-- Mẫu Hợp đồng thuê thiết bị chuẩn của Owner (Khuyên dùng) --</option>
                      {publishedTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name} • v{template.version}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedTemplate?.fields
                  .filter((field) => !automaticTemplateFields.has(field.key))
                  .map((field) => (
                    <div key={field.key}>
                      <label className="field-label" htmlFor={`template-${field.key}`}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>
                      <input
                        id={`template-${field.key}`}
                        className="input-field"
                        value={templateValues[field.key] || ""}
                        onChange={(e) =>
                          setTemplateValues((current) => ({ ...current, [field.key]: e.target.value }))
                        }
                        required={field.required}
                      />
                    </div>
                  ))}

                <div>
                  <label className="field-label">
                    2. Điều khoản bổ sung riêng của Owner (Địa điểm bàn giao, cam kết bảo quản, phụ phí...)
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Ví dụ: Bàn giao trực tiếp tại Studio Quận 1; Renter kiểm tra kỹ cảm biến (sensor) và ngàm ống kính khi nhận máy..."
                    value={specialConditions}
                    onChange={(e) => setSpecialConditions(e.target.value)}
                  />
                </div>

                {/* Standard Contract Preview & Editor */}
                {!selectedTemplateId && activeRequestObj && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <label className="field-label" style={{ marginBottom: 0 }}>
                        3. Toàn văn Hợp đồng chuẩn do Owner lập (Gửi Quản lý web duyệt) *
                      </label>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ width: "auto", minHeight: "30px", padding: "2px 10px", fontSize: "0.75rem" }}
                        onClick={() => {
                          setIsCustomizingTerms(false);
                          setCustomDraftTerms(
                            buildStandardOwnerContractText(
                              activeRequestObj,
                              user?.name || "Chủ thiết bị (Owner)",
                              user?.email || "owner@swp391.vn",
                              specialConditions
                            )
                          );
                        }}
                      >
                        🔄 Khôi phục văn bản chuẩn mặc định
                      </button>
                    </div>
                    <textarea
                      className="input-field"
                      rows={11}
                      value={customDraftTerms}
                      onChange={(e) => {
                        setIsCustomizingTerms(true);
                        setCustomDraftTerms(e.target.value);
                      }}
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.82rem",
                        lineHeight: 1.55,
                        background: "#0b101b",
                      }}
                      required
                    />
                  </div>
                )}

                {/* 4. Digital Signature Pad for Owner (UC_O12) */}
                <div>
                  <label className="field-label" style={{ fontSize: "0.95rem", color: "#38bdf8", marginBottom: "4px" }}>
                    4. Chữ ký số điện tử của Bên Cho Thuê (Owner) *
                  </label>
                  <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 0, marginBottom: "8px" }}>
                    Theo Luật Giao dịch điện tử 2023, chữ ký số chứng thực tính pháp lý của hợp đồng trước khi gửi Quản lý web duyệt.
                  </p>
                  <DigitalSignaturePad
                    initialSignerName={user?.name || ""}
                    onSignatureChange={setCreateSignature}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-quiet"
                  style={{ width: "auto" }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    disabled={isSubmitting || !selectedRequestForContract}
                    onClick={() => void handleCreateContract(false)}
                  >
                    📝 Chỉ lưu bản nháp (v1)
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    style={{ width: "auto" }}
                    disabled={isSubmitting || !selectedRequestForContract}
                  >
                    {isSubmitting
                      ? "Đang xử lý..."
                      : "📤 Lập Hợp đồng & Gửi Quản lý web duyệt ngay"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Draft / Rejected Contract (UC_O13 with versioning) */}
      {editingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "760px" }}>
            <div className="owner-modal-header">
              <h3>✏️ Chỉnh sửa Hợp đồng & Gửi lại Quản lý web duyệt (UC_O13)</h3>
              <button className="close-modal-btn" onClick={() => setEditingContract(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 0 }}>
              Hợp đồng: <strong>{editingContract.contract_code}</strong> • Phiên bản hiện tại:{" "}
              <strong>v{editingContract.version}</strong> ➔ Sẽ lưu thành{" "}
              <strong style={{ color: "var(--orange)" }}>v{editingContract.version + 1}</strong>.
            </p>

            {editingContract.moderator_feedback && (
              <div
                style={{
                  marginBottom: "14px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  fontSize: "0.85rem",
                }}
              >
                <strong>Lý do Quản lý web yêu cầu chỉnh sửa:</strong> {editingContract.moderator_feedback}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdateDraft(true);
              }}
            >
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label className="field-label">Tóm tắt nội dung cập nhật ở v{editingContract.version + 1} *</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Bổ sung chi tiết số serial và điều khoản bảo quản theo yêu cầu Quản lý web..."
                    value={changesSummary}
                    onChange={(e) => setChangesSummary(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Điều khoản bổ sung</label>
                  <input
                    className="input-field"
                    type="text"
                    value={editedSpecialConditions}
                    onChange={(e) => setEditedSpecialConditions(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Toàn văn Hợp đồng chuẩn *</label>
                  <textarea
                    className="input-field"
                    rows={12}
                    value={editedTerms}
                    onChange={(e) => setEditedTerms(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.84rem", background: "#0b101b" }}
                    required
                  />
                </div>

                {/* Digital Signature Pad for Edit */}
                <div>
                  <label className="field-label" style={{ fontSize: "0.92rem", color: "#38bdf8", marginBottom: "4px" }}>
                    Cập nhật Chữ ký số cho phiên bản v{editingContract.version + 1} (Tùy chọn)
                  </label>
                  <DigitalSignaturePad
                    initialSignerName={editingContract.owner_signature?.signer_name || user?.name || ""}
                    initialSignature={editingContract.owner_signature}
                    onSignatureChange={setEditSignature}
                    required={false}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button-quiet"
                  style={{ width: "auto" }}
                  onClick={() => setEditingContract(null)}
                >
                  Hủy
                </button>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ width: "auto" }}
                    disabled={isSubmitting}
                    onClick={() => void handleUpdateDraft(false)}
                  >
                    📝 Lưu nháp v{editingContract.version + 1}
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    style={{ width: "auto" }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Đang lưu..."
                      : `📤 Lưu v${editingContract.version + 1} & Gửi Quản lý web duyệt ngay`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Standard Contract Details */}
      {viewingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "800px" }}>
            <div className="owner-modal-header">
              <h3>
                📄 Hợp đồng chuẩn {viewingContract.contract_code} (Phiên bản v{viewingContract.version})
              </h3>
              <button className="close-modal-btn" onClick={() => setViewingContract(null)}>
                ✕
              </button>
            </div>

            {/* Workflow Stepper inside modal */}
            {renderWorkflowStepper(viewingContract)}

            <div
              style={{
                background: "#0b101b",
                padding: "20px",
                borderRadius: "10px",
                maxHeight: "360px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "0.84rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                border: "1px solid var(--border)",
              }}
            >
              {viewingContract.terms_content}
            </div>

            {/* Digital Signature Certificates of Both Parties */}
            <div
              style={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Bên A: Owner Digital Signature */}
              <div
                style={{
                  background: "#0d1527",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  borderRadius: "12px",
                  padding: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
                    🛡️ BÊN CHO THUÊ (BÊN A - OWNER)
                  </span>
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    e-Sign Certified
                  </span>
                </div>

                {viewingContract.owner_signature?.signature_image ? (
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      textAlign: "center",
                      margin: "8px 0",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    <img
                      src={viewingContract.owner_signature.signature_image}
                      alt="Chữ ký Owner"
                      style={{ maxHeight: "72px", maxWidth: "100%", objectFit: "contain", display: "inline-block" }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "12px",
                      textAlign: "center",
                      margin: "8px 0",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Brush Script MT', 'Dancing Script', cursive",
                        fontSize: "1.7rem",
                        color: "#1d4ed8",
                        fontStyle: "italic",
                      }}
                    >
                      {viewingContract.owner_signature?.signer_name || user?.name || "Owner"}
                    </span>
                  </div>
                )}

                <div style={{ fontSize: "0.8rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>
                    Người ký:{" "}
                    <strong style={{ color: "#fff" }}>
                      {viewingContract.owner_signature?.signer_name || user?.name || "Chủ thiết bị"}
                    </strong>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "3px" }}>
                    Thời gian ký:{" "}
                    {new Date(
                      viewingContract.owner_signature?.signed_at || viewingContract.createdAt
                    ).toLocaleString("vi-VN")}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#38bdf8", marginTop: "3px", fontFamily: "monospace" }}>
                    Mã chứng thư: {viewingContract.owner_signature?.certificate_code || `CERT-OWNER-${viewingContract.contract_code}`}
                  </div>
                </div>

                {["draft", "moderator_rejected"].includes(viewingContract.status) && (
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{ marginTop: "10px", width: "100%", fontSize: "0.78rem", minHeight: "30px" }}
                    onClick={() => {
                      setSigningContract(viewingContract);
                      setSigningSignature(null);
                    }}
                  >
                    ✍️ Ký lại Chữ ký số điện tử
                  </button>
                )}
              </div>

              {/* Bên B: Renter Digital Signature */}
              <div
                style={{
                  background: "#0d1527",
                  border: `1px solid ${
                    viewingContract.renter_signature?.signed || viewingContract.status === "signed"
                      ? "rgba(16, 185, 129, 0.4)"
                      : "rgba(100, 116, 139, 0.3)"
                  }`,
                  borderRadius: "12px",
                  padding: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase" }}>
                    🛡️ BÊN THUÊ (BÊN B - RENTER)
                  </span>
                  <span
                    style={{
                      background:
                        viewingContract.renter_signature?.signed || viewingContract.status === "signed"
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(249, 115, 22, 0.15)",
                      color:
                        viewingContract.renter_signature?.signed || viewingContract.status === "signed"
                          ? "#34d399"
                          : "#fb923c",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    {viewingContract.renter_signature?.signed || viewingContract.status === "signed"
                      ? "e-Sign Certified"
                      : "Pending"}
                  </span>
                </div>

                {viewingContract.renter_signature?.signed || viewingContract.status === "signed" ? (
                  <>
                    {viewingContract.renter_signature?.signature_image ? (
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "8px",
                          padding: "8px 14px",
                          textAlign: "center",
                          margin: "8px 0",
                        }}
                      >
                        <img
                          src={viewingContract.renter_signature.signature_image}
                          alt="Chữ ký Renter"
                          style={{ maxHeight: "72px", maxWidth: "100%", objectFit: "contain" }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "8px",
                          padding: "12px",
                          textAlign: "center",
                          margin: "8px 0",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Brush Script MT', 'Dancing Script', cursive",
                            fontSize: "1.7rem",
                            color: "#1d4ed8",
                            fontStyle: "italic",
                          }}
                        >
                          {viewingContract.renter_signature?.signer_name || viewingContract.renter_id?.name}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                      <div>
                        Người ký:{" "}
                        <strong style={{ color: "#fff" }}>
                          {viewingContract.renter_signature?.signer_name || viewingContract.renter_id?.name}
                        </strong>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "3px" }}>
                        Thời gian ký:{" "}
                        {viewingContract.renter_signature?.signed_at
                          ? new Date(viewingContract.renter_signature.signed_at).toLocaleString("vi-VN")
                          : "Đã hoàn tất"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#34d399", marginTop: "3px", fontFamily: "monospace" }}>
                        Mã chứng thư: {viewingContract.renter_signature?.certificate_code || `CERT-RENTER-${viewingContract.contract_code}`}
                      </div>
                    </div>
                  </>
                ) : viewingContract.status === "moderator_approved" ? (
                  <div
                    style={{
                      background: "rgba(249, 115, 22, 0.08)",
                      border: "1px dashed rgba(249, 115, 22, 0.3)",
                      borderRadius: "8px",
                      padding: "20px 14px",
                      textAlign: "center",
                      color: "#fdba74",
                      fontSize: "0.82rem",
                      margin: "8px 0",
                    }}
                  >
                    ⏳ Quản lý web đã phê duyệt hợp đồng.<br />
                    Đang chờ Người thuê (<strong>{viewingContract.renter_id?.name}</strong>) ký tên điện tử.
                  </div>
                ) : (
                  <div
                    style={{
                      background: "rgba(100, 116, 139, 0.08)",
                      border: "1px dashed rgba(100, 116, 139, 0.3)",
                      borderRadius: "8px",
                      padding: "20px 14px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "0.82rem",
                      margin: "8px 0",
                    }}
                  >
                    🔒 Chưa gửi Người thuê ký tên.<br />
                    (Cần Quản lý web kiểm duyệt nội dung trước)
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              {viewingContract.status === "draft" && (
                <button
                  type="button"
                  className="button button-primary"
                  style={{ width: "auto" }}
                  disabled={isSubmitting}
                  onClick={() => void handleSubmitApproval(viewingContract)}
                >
                  📤 Gửi Quản lý web duyệt ngay (UC_O14)
                </button>
              )}
              <button
                type="button"
                className="button button-quiet"
                style={{ width: "auto" }}
                onClick={() => setViewingContract(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Digital Signature for Contract (UC_O15) */}
      {signingContract && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "680px" }}>
            <div className="owner-modal-header">
              <h3>✍️ Ký chữ ký số điện tử cho Hợp đồng {signingContract.contract_code} (UC_O15)</h3>
              <button className="close-modal-btn" onClick={() => setSigningContract(null)}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem", marginTop: 0 }}>
              Ký chữ ký số điện tử để xác nhận các điều khoản hợp đồng cho thuê thiết bị{" "}
              <strong style={{ color: "#fff" }}>{signingContract.equipment_id?.title}</strong> đối với người thuê{" "}
              <strong style={{ color: "#fff" }}>{signingContract.renter_id?.name}</strong> theo Luật Giao dịch điện tử.
            </p>

            <DigitalSignaturePad
              initialSignerName={signingContract.owner_signature?.signer_name || user?.name || ""}
              initialSignature={signingContract.owner_signature}
              onSignatureChange={setSigningSignature}
              required
            />

            <div className="modal-actions" style={{ marginTop: "18px" }}>
              <button
                type="button"
                className="button button-quiet"
                style={{ width: "auto" }}
                onClick={() => setSigningContract(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="button button-primary"
                style={{ width: "auto" }}
                disabled={isSubmitting || !signingSignature}
                onClick={() => void handleConfirmEContract()}
              >
                {isSubmitting ? "Đang xử lý..." : "✅ Xác nhận & Lưu Chữ ký số (UC_O15)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
