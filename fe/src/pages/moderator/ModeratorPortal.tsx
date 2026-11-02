import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import Feedback from "../../components/Feedback";
import { moderatorApi } from "../../services/moderatorApi";
import type {
  ContractTemplate,
  ModeratorContract,
  ModeratorEquipment,
  ModeratorHandoverRecord,
  ModeratorPaymentRental,
  ModeratorRentalRequest,
  ModeratorStatusRequest,
} from "../../services/moderatorApi";

type Tab =
  | "payments"
  | "requests"
  | "contracts"
  | "equipment"
  | "handover"
  | "status"
  | "templates"
  | "support";

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function getContractIssues(contract: ModeratorContract) {
  const issues: string[] = [];
  if (!contract.contract_code?.trim()) issues.push("Thiếu mã hợp đồng.");
  if (!contract.title?.trim()) issues.push("Thiếu tiêu đề hợp đồng.");
  if (!contract.owner_id) issues.push("Thiếu thông tin Owner.");
  if (!contract.renter_id) issues.push("Thiếu thông tin Renter.");
  if (!contract.equipment_id) issues.push("Thiếu thông tin thiết bị.");
  if (!contract.terms_content?.trim()) issues.push("Thiếu điều khoản hợp đồng.");
  if (!Number.isFinite(contract.rental_price) || contract.rental_price < 0) issues.push("Giá thuê không hợp lệ.");
  if (!Number.isFinite(contract.deposit_amount) || contract.deposit_amount < 0) issues.push("Tiền cọc không hợp lệ.");
  const start = new Date(contract.start_date).getTime();
  const end = new Date(contract.end_date).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    issues.push("Thời gian thuê thiếu hoặc không hợp lệ.");
  }
  return issues;
}

function templateFieldsToText(fields: ContractTemplate["fields"]) {
  return fields.map((field) => `${field.key}|${field.label}|${field.required ? "required" : "optional"}`).join("\n");
}

function parseTemplateFields(value: string): ContractTemplate["fields"] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, label, requirement] = line.split("|").map((part) => part.trim());
      return { key, label, required: requirement !== "optional" };
    });
}

export default function ModeratorPortal() {
  const { user, token, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("payments");
  const [payments, setPayments] = useState<ModeratorPaymentRental[]>([]);
  const [rentalRequests, setRentalRequests] = useState<ModeratorRentalRequest[]>([]);
  const [contracts, setContracts] = useState<ModeratorContract[]>([]);
  const [equipments, setEquipments] = useState<ModeratorEquipment[]>([]);
  const [records, setRecords] = useState<ModeratorHandoverRecord[]>([]);
  const [statusRequests, setStatusRequests] = useState<ModeratorStatusRequest[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [forwardNotes, setForwardNotes] = useState<Record<string, string>>({});
  const [contractReasons, setContractReasons] = useState<Record<string, string>>({});
  const [recordNotes, setRecordNotes] = useState<Record<string, string>>({});
  const [requestNotes, setRequestNotes] = useState<Record<string, string>>({});
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [templateEditing, setTemplateEditing] = useState<ContractTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateTerms, setTemplateTerms] = useState("");
  const [templateFields, setTemplateFields] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Kỹ thuật hệ thống");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketRelatedId, setTicketRelatedId] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [paymentData, reqData, contractData, equipmentData, recordData, statusData, templateData] =
        await Promise.all([
          moderatorApi.getPayments(token),
          moderatorApi.getRentalRequests(token),
          moderatorApi.getContracts(token),
          moderatorApi.getEquipments(token),
          moderatorApi.getHandoverRecords(token),
          moderatorApi.getStatusRequests(token),
          moderatorApi.getTemplates(token),
        ]);
      setPayments(paymentData.payments || []);
      setRentalRequests(reqData.rentalRequests || []);
      setContracts(contractData.contracts);
      setEquipments(equipmentData.equipments);
      setRecords(recordData.records);
      setStatusRequests(statusData.requests);
      setTemplates(templateData.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu kiểm duyệt.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function performAction(id: string, action: () => Promise<unknown>, message: string) {
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      const result = await action();
      const notificationWarning =
        typeof result === "object" && result !== null && "notificationWarning" in result
          ? result.notificationWarning
          : "";
      setSuccess(notificationWarning ? `${message} ${notificationWarning}` : message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hoàn tất thao tác.");
    } finally {
      setBusyId("");
    }
  }

  async function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const fields = parseTemplateFields(templateFields);
    setBusyId("template");
    setError("");
    setSuccess("");
    try {
      const data = { name: templateName.trim(), terms_content: templateTerms.trim(), fields };
      const result = templateEditing
        ? await moderatorApi.createTemplateVersion(token, templateEditing._id, data)
        : await moderatorApi.createTemplate(token, data);
      setSuccess(result.message);
      setTemplateEditing(null);
      setTemplateName("");
      setTemplateTerms("");
      setTemplateFields("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu mẫu hợp đồng.");
    } finally {
      setBusyId("");
    }
  }

  async function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusyId("ticket");
    setError("");
    setSuccess("");
    try {
      const result = await moderatorApi.submitSupportTicket(token, {
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        related_record_id: ticketRelatedId.trim() || undefined,
      });
      setSuccess(`${result.message} Mã ticket: ${result.ticket.ticket_code}`);
      setTicketSubject("");
      setTicketMessage("");
      setTicketRelatedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu hỗ trợ.");
    } finally {
      setBusyId("");
    }
  }

  const pendingPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          String(p.status || "").toUpperCase() === "PAYMENT_VERIFYING" ||
          p.payment?.paymentStatus === "verifying"
      ),
    [payments]
  );

  const pendingForwardRequests = useMemo(
    () => rentalRequests.filter((r) => r.status === "pending_moderator"),
    [rentalRequests]
  );

  const pendingContracts = useMemo(
    () => contracts.filter((contract) => contract.status === "pending_approval"),
    [contracts]
  );

  const visibleEquipments = useMemo(() => {
    const query = equipmentSearch.trim().toLocaleLowerCase("vi");
    if (!query) return equipments;
    return equipments.filter((equipment) =>
      [equipment.title, equipment.category, equipment.serial_number, equipment.owner_id?.name]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("vi").includes(query))
    );
  }, [equipments, equipmentSearch]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    {
      id: "payments",
      label: "💳 Xác nhận Thanh toán QR",
      badge: pendingPayments.length,
    },
    {
      id: "requests",
      label: "📬 Yêu cầu thuê từ Renter",
      badge: pendingForwardRequests.length,
    },
    {
      id: "contracts",
      label: "📜 Duyệt Hợp đồng",
      badge: pendingContracts.length,
    },
    { id: "equipment", label: "📷 Thiết bị" },
    { id: "handover", label: "🤝 Bàn giao / hoàn trả" },
    { id: "status", label: "🔄 Yêu cầu trạng thái" },
    { id: "templates", label: "📄 Mẫu hợp đồng" },
    { id: "support", label: "🛟 Gửi yêu cầu hỗ trợ" },
  ];

  return (
    <div className="owner-portal-layout">
      <header className="owner-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Brand compact />
          <span className="owner-badge">RENTAL MODERATOR • KIỂM DUYỆT HỢP ĐỒNG & XÁC NHẬN THANH TOÁN QR</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/equipments" className="button button-quiet">🔍 Chợ thiết bị</Link>
          {(user?.role || "").toLowerCase() === "systemadmin" && (
            <Link to="/admin" className="button button-secondary">⚙️ Quản trị Admin</Link>
          )}
          <Link to="/profile" className="button button-secondary">👤 {user?.name || "Tài khoản"}</Link>
          <button className="button button-quiet" onClick={() => void signOut()}>Đăng xuất ↗</button>
        </div>
      </header>

      <main className="owner-container">
        <div className="admin-topbar" style={{ margin: "0 0 18px" }}>
          <div>
            <span className="form-kicker">RENTAL MODERATOR • KIỂM DUYỆT & ĐỐI CHIẾU THANH TOÁN QR</span>
            <h1 className="admin-page-title">Điều phối Thuê thiết bị, Hợp đồng & Xác nhận Thanh toán QR</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              Quy trình chuẩn:{" "}
              <strong style={{ color: "#fb923c" }}>1. Owner duyệt yêu cầu thuê</strong> ➔{" "}
              <strong style={{ color: "#38bdf8" }}>2. Người thuê ký hợp đồng điện tử</strong> ➔{" "}
              <strong style={{ color: "#a78bfa" }}>3. Người thuê quét mã QR chuyển khoản</strong> ➔{" "}
              <strong style={{ color: "#10b981" }}>4. Rental Moderator đối chiếu & xác nhận thanh toán</strong>.
            </p>
          </div>
          <button className="button button-secondary" onClick={() => void loadData()} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới dữ liệu ⟳"}
          </button>
        </div>

        <div className="moderator-stats">
          <div style={{ cursor: "pointer" }} onClick={() => setActiveTab("payments")}>
            <strong style={{ color: pendingPayments.length > 0 ? "#10b981" : undefined }}>
              {pendingPayments.length}
            </strong>
            <span>Thanh toán QR chờ xác nhận</span>
          </div>
          <div style={{ cursor: "pointer" }} onClick={() => setActiveTab("requests")}>
            <strong style={{ color: pendingForwardRequests.length > 0 ? "#fb923c" : undefined }}>
              {pendingForwardRequests.length}
            </strong>
            <span>Yêu cầu thuê chờ gửi Owner</span>
          </div>
          <div style={{ cursor: "pointer" }} onClick={() => setActiveTab("contracts")}>
            <strong style={{ color: pendingContracts.length > 0 ? "#38bdf8" : undefined }}>
              {pendingContracts.length}
            </strong>
            <span>Hợp đồng chờ duyệt</span>
          </div>
          <div style={{ cursor: "pointer" }} onClick={() => setActiveTab("handover")}>
            <strong>
              {records.filter((record) => !record.moderator_review || record.moderator_review.status === "pending").length}
            </strong>
            <span>Biên bản chờ xác minh</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Feedback message={error} />
          <Feedback message={success} type="success" />
        </div>

        <nav className="owner-tabs-nav" aria-label="Chức năng kiểm duyệt">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`owner-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="tab-badge-alert" style={{ marginLeft: 8 }}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {loading && <div className="owner-section-card">Đang tải dữ liệu...</div>}

        {/* TAB MỚI: XÁC NHẬN THANH TOÁN QR CỦA NGƯỜI THUÊ */}
        {!loading && activeTab === "payments" && (
          <section className="moderator-list">
            <div
              className="owner-section-card"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                borderLeft: "4px solid #10b981",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>
                  🏦 Tài khoản nhận thanh toán QR của hệ thống (VietQR MB Bank)
                </h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>
                  Chủ TK: <strong>NGUYEN KHAC QUANG KHANH</strong> • Số TK: <strong>111105056666</strong> (MB Bank).
                  Vui lòng đối chiếu đúng số tiền và nội dung chuyển khoản trước khi bấm Xác nhận.
                </p>
              </div>
              <img
                src="/qr-payment.jpg"
                alt="VietQR MB Bank"
                style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)" }}
              />
            </div>

            {payments.length === 0 && (
              <div className="owner-section-card">
                Chưa có giao dịch chuyển khoản QR nào từ Người thuê cần đối chiếu.
              </div>
            )}

            {payments.map((item) => {
              const upperStatus = String(item.status || "").toUpperCase();
              const isVerifying =
                upperStatus === "PAYMENT_VERIFYING" || item.payment?.paymentStatus === "verifying";
              const isRejected =
                upperStatus === "PAYMENT_REJECTED" || item.payment?.paymentStatus === "rejected";

              return (
                <article className="owner-section-card moderator-card" key={item._id}>
                  <div className="moderator-card-heading">
                    <div>
                      <span className="contract-code-tag">#{item.rentalCode}</span>
                      <h2>{item.equipment?.title || "Thiết bị thuê"}</h2>
                    </div>
                    <span
                      className={`status-badge ${
                        isVerifying
                          ? "status-pending_approval"
                          : isRejected
                          ? "status-rejected"
                          : "status-signed"
                      }`}
                    >
                      {isVerifying
                        ? "⏳ Chờ Rental Moderator xác nhận thanh toán QR"
                        : isRejected
                        ? "❌ Đã từ chối thanh toán (Chờ Renter gửi lại)"
                        : "✅ Đã xác nhận nhận đủ tiền QR"}
                    </span>
                  </div>

                  <div className="moderator-detail-grid">
                    <p>
                      <b>Người thuê (Renter):</b> {item.renter?.name || "—"} ({item.renter?.email || "—"}) • SĐT:{" "}
                      {item.renter?.phone || "—"}
                    </p>
                    <p>
                      <b>Chủ thiết bị (Owner):</b> {item.owner?.name || "—"} ({item.owner?.email || "—"})
                    </p>
                    <p>
                      <b>Thời gian thuê:</b> {dateTime(item.startDate)} — {dateTime(item.endDate)} ({item.totalDays} ngày)
                    </p>
                    <p>
                      <b>Hợp đồng điện tử:</b>{" "}
                      {item.contract?.signedAt ? (
                        <strong style={{ color: "#10b981" }}>
                          ✍️ Đã ký bởi {item.contract.renterSignature || item.contract.digitalSignature} (
                          {dateTime(item.contract.signedAt)})
                        </strong>
                      ) : (
                        "Đã xác nhận"
                      )}
                    </p>
                    <p>
                      <b>Tổng tiền cần nhận:</b>{" "}
                      <strong style={{ color: "#fb923c", fontSize: "1.05rem" }}>
                        {(item.totalAmount || 0).toLocaleString("vi-VN")} đ
                      </strong>{" "}
                      (Phí thuê: {(item.rentalFee || 0).toLocaleString("vi-VN")} đ • Không cần cọc)
                    </p>
                    <p>
                      <b>Người chuyển khoản khai báo:</b>{" "}
                      <strong style={{ color: "#38bdf8" }}>{item.payment?.senderName || "—"}</strong>
                    </p>
                    <p>
                      <b>Mã giao dịch / FT:</b>{" "}
                      <code>{item.payment?.transactionId || "—"}</code>
                    </p>
                    <p>
                      <b>Nội dung chuyển khoản:</b>{" "}
                      <code>{item.payment?.transferNote || `${item.rentalCode} THANH TOAN`}</code>
                    </p>
                    <p>
                      <b>Thời điểm gửi xác nhận:</b>{" "}
                      {dateTime(item.payment?.submittedAt || item.updatedAt)}
                    </p>
                    {item.payment?.verifiedBy && (
                      <p>
                        <b>Xử lý bởi:</b> {item.payment.verifiedBy.name} ({dateTime(item.payment.verifiedAt)})
                      </p>
                    )}
                  </div>

                  {item.payment?.proofImage && (
                    <div style={{ margin: "12px 0" }}>
                      <p style={{ margin: "0 0 6px", fontWeight: 600 }}>📸 Ảnh biên lai chuyển khoản do Renter đính kèm:</p>
                      <a href={item.payment.proofImage} target="_blank" rel="noreferrer">
                        <img
                          src={item.payment.proofImage}
                          alt={`Biên lai ${item.rentalCode}`}
                          style={{
                            maxWidth: 260,
                            maxHeight: 280,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.16)",
                            objectFit: "contain",
                            background: "#0f1624",
                          }}
                        />
                      </a>
                    </div>
                  )}

                  {item.payment?.moderatorNote && (
                    <p
                      className={isRejected ? "moderator-warning" : ""}
                      style={!isRejected ? { margin: "8px 0", color: "#10b981" } : undefined}
                    >
                      <b>Ghi chú đối chiếu của Rental Moderator:</b> {item.payment.moderatorNote}
                    </p>
                  )}

                  {isVerifying && (
                    <div className="moderator-actions" style={{ marginTop: 14 }}>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Ghi chú xác nhận sao kê (hoặc nhập lý do bắt buộc nếu từ chối thanh toán để Renter kiểm tra lại)..."
                        value={paymentNotes[item._id] || ""}
                        onChange={(e) =>
                          setPaymentNotes((prev) => ({ ...prev, [item._id]: e.target.value }))
                        }
                      />
                      <button
                        className="button button-primary"
                        disabled={busyId === item._id}
                        onClick={() =>
                          void performAction(
                            item._id,
                            () =>
                              moderatorApi.verifyPayment(
                                token!,
                                item._id,
                                "approve",
                                paymentNotes[item._id]
                              ),
                            `Đã xác nhận thanh toán QR thành công cho đơn #${item.rentalCode}!`
                          )
                        }
                      >
                        ✅ Xác nhận đã nhận tiền QR
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={busyId === item._id || !paymentNotes[item._id]?.trim()}
                        onClick={() =>
                          void performAction(
                            item._id,
                            () =>
                              moderatorApi.verifyPayment(
                                token!,
                                item._id,
                                "reject",
                                paymentNotes[item._id]
                              ),
                            `Đã từ chối thanh toán đơn #${item.rentalCode} và thông báo cho Người thuê.`
                          )
                        }
                      >
                        ✕ Từ chối (Chưa nhận được / Sai số tiền)
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {/* TAB 1: YÊU CẦU THUÊ TỪ RENTER -> QUẢN LÝ WEB GỬI CHO OWNER DUYỆT */}
        {!loading && activeTab === "requests" && (
          <section className="moderator-list">
            {rentalRequests.length === 0 && (
              <div className="owner-section-card">Chưa có yêu cầu thuê nào từ Người thuê.</div>
            )}
            {rentalRequests.map((req) => (
              <article className="owner-section-card moderator-card" key={req._id}>
                <div className="moderator-card-heading">
                  <div>
                    <span className="contract-code-tag">{req.request_code}</span>
                    <h2>Thuê: {req.equipment_id?.title || "Thiết bị"}</h2>
                  </div>
                  <span className={`status-badge status-${req.status}`}>
                    {req.status === "pending_moderator"
                      ? "⏳ Bước 1: Mới nhận từ Renter (Chờ gửi cho Owner)"
                      : req.status === "pending"
                      ? "📤 Bước 2: Đã gửi cho Owner (Chờ Owner duyệt)"
                      : req.status === "approved"
                      ? "✅ Bước 3: Owner đã duyệt (Chờ Owner lập HĐ)"
                      : req.status === "contract_created"
                      ? "📜 Đã lập Hợp đồng (Xem tại tab Hợp đồng)"
                      : req.status === "moderator_rejected"
                      ? "❌ Quản lý web từ chối"
                      : req.status === "rejected"
                      ? "❌ Owner từ chối"
                      : req.status}
                  </span>
                </div>

                <div className="moderator-detail-grid">
                  <p>
                    <b>Người thuê (Renter):</b> {req.renter_name} ({req.renter_email || req.renter_id?.email || "—"}) • SĐT:{" "}
                    {req.renter_phone || "—"}
                  </p>
                  <p>
                    <b>Chủ thiết bị (Owner):</b> {req.owner_id?.name} ({req.owner_id?.email})
                  </p>
                  <p>
                    <b>Thiết bị:</b> {req.equipment_id?.title} • {req.equipment_id?.brand} {req.equipment_id?.model_name}
                  </p>
                  <p>
                    <b>Thời gian thuê:</b> {dateTime(req.start_date)} — {dateTime(req.end_date)} ({req.duration_days} ngày)
                  </p>
                  <p>
                    <b>Tiền thuê / Tiền cọc:</b>{" "}
                    <strong style={{ color: "#10b981" }}>{req.rental_fee.toLocaleString("vi-VN")} đ</strong> /{" "}
                    <span style={{ color: "#10b981" }}>0 đ (Miễn cọc)</span>
                  </p>
                  <p>
                    <b>Ngày gửi yêu cầu:</b> {dateTime(req.createdAt)}
                  </p>
                </div>

                {req.renter_note && (
                  <p style={{ margin: "8px 0" }}>
                    <b>Ghi chú từ Người thuê:</b> {req.renter_note}
                  </p>
                )}

                {req.moderator_note && (
                  <p style={{ margin: "8px 0", color: "#38bdf8" }}>
                    <b>Ghi chú điều phối của Quản lý web:</b> {req.moderator_note}
                  </p>
                )}

                {req.rejection_reason && (
                  <p className="moderator-warning">
                    <b>Lý do từ chối:</b> {req.rejection_reason}
                  </p>
                )}

                {req.status === "pending_moderator" && (
                  <div className="moderator-actions" style={{ marginTop: 14 }}>
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Ghi chú đính kèm khi chuyển cho Owner (hoặc lý do bắt buộc nếu từ chối yêu cầu)..."
                      value={forwardNotes[req._id] || ""}
                      onChange={(e) =>
                        setForwardNotes((prev) => ({ ...prev, [req._id]: e.target.value }))
                      }
                    />
                    <button
                      className="button button-primary"
                      disabled={busyId === req._id}
                      onClick={() =>
                        void performAction(
                          req._id,
                          () =>
                            moderatorApi.forwardRentalRequest(
                              token!,
                              req._id,
                              "forward",
                              forwardNotes[req._id]
                            ),
                          `Đã gửi yêu cầu thuê ${req.request_code} sang cho Owner (${req.owner_id?.name}) duyệt!`
                        )
                      }
                    >
                      📤 Gửi yêu cầu cho Owner duyệt
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={busyId === req._id || !forwardNotes[req._id]?.trim()}
                      onClick={() =>
                        void performAction(
                          req._id,
                          () =>
                            moderatorApi.forwardRentalRequest(
                              token!,
                              req._id,
                              "reject",
                              forwardNotes[req._id]
                            ),
                          `Đã từ chối yêu cầu thuê ${req.request_code}.`
                        )
                      }
                    >
                      ✕ Từ chối yêu cầu
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* TAB 2: DUYỆT HỢP ĐỒNG TỪ OWNER & GỬI CHO NGƯỜI THUÊ KÝ TÊN */}
        {!loading && activeTab === "contracts" && (
          <section className="moderator-list">
            {contracts.length === 0 && <div className="owner-section-card">Chưa có hồ sơ hợp đồng.</div>}
            {contracts.map((contract) => {
              const issues = getContractIssues(contract);
              return (
                <article className="owner-section-card moderator-card" key={contract._id}>
                  {issues.length > 0 && (
                    <div className="moderator-warning">
                      <strong>Cần kiểm tra:</strong> {issues.join(" ")}
                    </div>
                  )}
                  <div className="moderator-card-heading">
                    <div>
                      <span className="contract-code-tag">{contract.contract_code}</span>
                      <h2>{contract.title}</h2>
                    </div>
                    <span className={`status-badge status-${contract.status}`}>
                      {contract.status === "pending_approval"
                        ? "⏳ Owner vừa gửi lên — Chờ Quản lý web duyệt & gửi Renter ký"
                        : contract.status === "moderator_approved"
                        ? "📨 Đã duyệt & gửi cho Người thuê (Chờ Renter ký tên)"
                        : contract.status === "signed"
                        ? "✍️ Người thuê đã ký tên hoàn tất"
                        : contract.status === "moderator_rejected"
                        ? "❌ Đã trả về cho Owner sửa lại"
                        : contract.status}
                    </span>
                  </div>
                  <div className="moderator-detail-grid">
                    <p><b>Owner (Bên A):</b> {contract.owner_id?.name} ({contract.owner_id?.email})</p>
                    <p><b>Người thuê (Bên B):</b> {contract.renter_id?.name} ({contract.renter_id?.email})</p>
                    <p><b>Thiết bị:</b> {contract.equipment_id?.title} • {contract.equipment_id?.brand} {contract.equipment_id?.model_name}</p>
                    <p><b>Số serial / tình trạng:</b> {contract.equipment_id?.serial_number || "—"} / {contract.equipment_id?.condition || "—"}</p>
                    <p><b>Thời gian thuê:</b> {dateTime(contract.start_date)} — {dateTime(contract.end_date)}</p>
                    <p><b>Giá thuê / tiền cọc:</b> {contract.rental_price.toLocaleString("vi-VN")} đ / <span style={{ color: "#10b981" }}>0 đ (Miễn cọc)</span></p>
                    <p><b>Phiên bản hợp đồng:</b> v{contract.version} • gửi lúc {dateTime(contract.createdAt)}</p>
                    <p>
                      <b>Trạng thái chữ ký:</b>{" "}
                      Owner: {contract.owner_signature?.signed ? "✅ Đã xác nhận" : "Chưa ký"} •{" "}
                      Người thuê:{" "}
                      {contract.renter_signature?.signed ? (
                        <strong style={{ color: "#10b981" }}>✅ Đã ký tên ({dateTime(contract.renter_signature.signed_at)})</strong>
                      ) : contract.status === "moderator_approved" ? (
                        <strong style={{ color: "#fb923c" }}>⏳ Đang chờ Người thuê ký tên</strong>
                      ) : (
                        "Chưa gửi Renter"
                      )}
                    </p>
                  </div>
                  {contract.special_conditions && <p><b>Điều khoản bổ sung:</b> {contract.special_conditions}</p>}
                  {contract.request_id?.renter_note && <p><b>Ghi chú yêu cầu thuê:</b> {contract.request_id.renter_note}</p>}
                  <details className="moderator-document">
                    <summary>Xem toàn văn điều khoản hợp đồng chuẩn</summary>
                    <pre>{contract.terms_content}</pre>
                  </details>
                  {contract.moderator_feedback && (
                    <p className="moderator-warning"><b>Lý do từ chối:</b> {contract.moderator_feedback}</p>
                  )}
                  {contract.moderation_history && contract.moderation_history.length > 0 && (
                    <details className="moderator-document">
                      <summary>Lịch sử kiểm duyệt ({contract.moderation_history.length})</summary>
                      {contract.moderation_history.map((entry, index) => (
                        <p key={`${entry.created_at}-${index}`}>
                          {entry.action} • v{entry.version} • {entry.moderator_id?.name || "Quản lý web"} • {dateTime(entry.created_at)}{" "}
                          {entry.reason && `• ${entry.reason}`}
                        </p>
                      ))}
                    </details>
                  )}
                  {contract.status === "pending_approval" && (
                    <div className="moderator-actions">
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Bắt buộc nhập lý do nếu từ chối yêu cầu Owner chỉnh sửa lại"
                        value={contractReasons[contract._id] || ""}
                        onChange={(event) =>
                          setContractReasons((current) => ({ ...current, [contract._id]: event.target.value }))
                        }
                      />
                      <button
                        className="button button-primary"
                        disabled={busyId === contract._id || issues.length > 0}
                        onClick={() =>
                          void performAction(
                            contract._id,
                            () => moderatorApi.reviewContract(token!, contract._id, "approve"),
                            `Đã duyệt hợp đồng ${contract.contract_code} và gửi cho Người thuê (${contract.renter_id?.name}) ký tên!`
                          )
                        }
                      >
                        ✅ Duyệt HĐ & Gửi cho Người thuê ký tên
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={busyId === contract._id || !contractReasons[contract._id]?.trim()}
                        onClick={() =>
                          void performAction(
                            contract._id,
                            () =>
                              moderatorApi.reviewContract(
                                token!,
                                contract._id,
                                "reject",
                                contractReasons[contract._id]
                              ),
                            "Đã từ chối hồ sơ và gửi phản hồi cho Owner sửa lại."
                          )
                        }
                      >
                        ✕ Từ chối (Yêu cầu Owner sửa)
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!loading && activeTab === "equipment" && (
          <section className="moderator-list">
            <div className="moderator-search">
              <input
                className="input-field"
                value={equipmentSearch}
                onChange={(event) => setEquipmentSearch(event.target.value)}
                placeholder="Tìm theo tên, danh mục, serial hoặc Owner"
              />
              <span>{visibleEquipments.length} thiết bị</span>
            </div>
            {visibleEquipments.map((equipment) => (
              <article className="owner-section-card moderator-card" key={equipment._id}>
                <div className="moderator-card-heading">
                  <div>
                    <h2>{equipment.title}</h2>
                    <p>{equipment.category} • serial {equipment.serial_number || "—"}</p>
                  </div>
                  <span className={`status-badge status-${equipment.status}`}>{equipment.status}</span>
                </div>
                <p>
                  Owner: {equipment.owner_id?.name} ({equipment.owner_id?.email}) • Tình trạng: {equipment.condition || "—"} • Cập nhật:{" "}
                  {dateTime(equipment.updatedAt)}
                </p>
                <details className="moderator-document">
                  <summary>Lịch sử yêu cầu đổi trạng thái ({equipment.status_history.length})</summary>
                  {equipment.status_history.map((item) => (
                    <p key={item._id}>
                      {item.current_status} → {item.target_status} • {item.status} • {item.reason} • {dateTime(item.createdAt)}{" "}
                      {item.reviewed_by?.name && `• Xử lý bởi ${item.reviewed_by.name}`} {item.moderator_note && `• ${item.moderator_note}`}
                    </p>
                  ))}
                </details>
                <details className="moderator-document">
                  <summary>Hợp đồng liên quan ({equipment.contracts.length})</summary>
                  {equipment.contracts.map((contract) => (
                    <p key={contract._id}>
                      {contract.contract_code} • {contract.title} • {contract.status} • {dateTime(contract.start_date)}—
                      {dateTime(contract.end_date)}
                    </p>
                  ))}
                </details>
              </article>
            ))}
          </section>
        )}

        {!loading && activeTab === "handover" && (
          <section className="moderator-list">
            {records.length === 0 && <div className="owner-section-card">Chưa có biên bản bàn giao hoặc hoàn trả.</div>}
            {records.map((record) => {
              const state = record.moderator_review?.status || "pending";
              return (
                <article className="owner-section-card moderator-card" key={record._id}>
                  <div className="moderator-card-heading">
                    <div>
                      <h2>
                        {record.record_type === "handover" ? "Biên bản bàn giao" : "Biên bản hoàn trả"} •{" "}
                        {record.contract_id?.contract_code}
                      </h2>
                      <p>{record.equipment_id?.title} • {dateTime(record.record_date)}</p>
                    </div>
                    <span className={`status-badge status-${state}`}>{state}</span>
                  </div>
                  <div className="moderator-detail-grid">
                    <p><b>Tình trạng vật lý:</b> {record.physical_condition}</p>
                    <p><b>Hoạt động:</b> {record.working_status}</p>
                    <p><b>Owner / Renter xác nhận:</b> {record.owner_confirmed ? "Có" : "Chưa"} / {record.renter_confirmed ? "Có" : "Chưa"}</p>
                    <p>
                      <b>Phụ kiện:</b>{" "}
                      {record.accessories_checklist
                        .map((item) => `${item.checked ? "✓" : "✗"} ${item.item}${item.notes ? ` (${item.notes})` : ""}`)
                        .join(", ") || "—"}
                    </p>
                    <p>
                      <b>Thiếu / hư hỏng:</b> {record.missing_items?.join(", ") || "Không ghi nhận"} •{" "}
                      {record.damage_detected || "Không ghi nhận"}{" "}
                      {record.estimated_damage_cost ? `(${record.estimated_damage_cost.toLocaleString("vi-VN")} đ)` : ""}
                    </p>
                    <p><b>Ghi chú:</b> {record.notes || "—"}</p>
                  </div>
                  {record.evidence_photos.length > 0 && (
                    <div className="moderator-evidence">
                      {record.evidence_photos.map((src, index) => (
                        <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer">
                          Minh chứng {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {record.moderator_review?.note && (
                    <p className="moderator-warning">Ý kiến xử lý trước: {record.moderator_review.note}</p>
                  )}
                  {record.moderator_review_history && record.moderator_review_history.length > 0 && (
                    <details className="moderator-document">
                      <summary>Lịch sử xác minh ({record.moderator_review_history.length})</summary>
                      {record.moderator_review_history.map((entry, index) => (
                        <p key={`${entry.reviewed_at}-${index}`}>
                          {entry.status} • {entry.moderator_id?.name || "Moderator"} • {dateTime(entry.reviewed_at)}{" "}
                          {entry.note && `• ${entry.note}`}
                        </p>
                      ))}
                    </details>
                  )}
                  {state !== "verified" && (
                    <div className="moderator-actions">
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Lý do bắt buộc nếu yêu cầu bổ sung"
                        value={recordNotes[record._id] || ""}
                        onChange={(event) =>
                          setRecordNotes((current) => ({ ...current, [record._id]: event.target.value }))
                        }
                      />
                      <button
                        className="button button-primary"
                        disabled={busyId === record._id}
                        onClick={() =>
                          void performAction(
                            record._id,
                            () => moderatorApi.reviewHandoverRecord(token!, record._id, "verify", recordNotes[record._id]),
                            "Đã xác minh biên bản."
                          )
                        }
                      >
                        Xác minh
                      </button>
                      <button
                        className="button button-secondary"
                        disabled={busyId === record._id || !recordNotes[record._id]?.trim()}
                        onClick={() =>
                          void performAction(
                            record._id,
                            () =>
                              moderatorApi.reviewHandoverRecord(
                                token!,
                                record._id,
                                "request_changes",
                                recordNotes[record._id]
                              ),
                            "Đã yêu cầu bổ sung biên bản."
                          )
                        }
                      >
                        Yêu cầu bổ sung
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!loading && activeTab === "status" && (
          <section className="moderator-list">
            {statusRequests.map((request) => (
              <article className="owner-section-card moderator-card" key={request._id}>
                <div className="moderator-card-heading">
                  <div>
                    <h2>{request.equipment_id?.title}</h2>
                    <p>Owner: {request.owner_id?.name} ({request.owner_id?.email})</p>
                  </div>
                  <span className={`status-badge status-${request.status}`}>{request.status}</span>
                </div>
                <p>
                  <b>Trạng thái:</b> {request.current_status} → {request.target_status} • <b>Yêu cầu:</b> {request.reason}
                </p>
                <p>
                  <b>Tạo lúc:</b> {dateTime(request.createdAt)} {request.moderator_note && `• Ghi chú: ${request.moderator_note}`}
                </p>
                {request.evidence_photos.map((src, index) => (
                  <a className="moderator-evidence-link" key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer">
                    Minh chứng {index + 1}
                  </a>
                ))}
                {request.status === "pending" && (
                  <div className="moderator-actions">
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Ghi lý do nếu từ chối"
                      value={requestNotes[request._id] || ""}
                      onChange={(event) =>
                        setRequestNotes((current) => ({ ...current, [request._id]: event.target.value }))
                      }
                    />
                    <button
                      className="button button-primary"
                      disabled={busyId === request._id}
                      onClick={() =>
                        void performAction(
                          request._id,
                          () => moderatorApi.reviewStatusRequest(token!, request._id, "approve"),
                          "Đã duyệt yêu cầu và cập nhật trạng thái thiết bị."
                        )
                      }
                    >
                      Chấp thuận
                    </button>
                    <button
                      className="button button-secondary"
                      disabled={busyId === request._id || !requestNotes[request._id]?.trim()}
                      onClick={() =>
                        void performAction(
                          request._id,
                          () => moderatorApi.reviewStatusRequest(token!, request._id, "reject", requestNotes[request._id]),
                          "Đã từ chối yêu cầu."
                        )
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </article>
            ))}
            {statusRequests.length === 0 && <div className="owner-section-card">Chưa có yêu cầu đổi trạng thái thiết bị.</div>}
          </section>
        )}

        {!loading && activeTab === "templates" && (
          <section className="moderator-list">
            <form className="owner-section-card moderator-card moderator-form" onSubmit={(event) => void handleTemplateSubmit(event)}>
              <h2>{templateEditing ? `Tạo phiên bản mới từ ${templateEditing.name} v${templateEditing.version}` : "Tạo mẫu hợp đồng"}</h2>
              <label className="field-label">
                Tên mẫu
                <input className="input-field" value={templateName} onChange={(event) => setTemplateName(event.target.value)} required />
              </label>
              <label className="field-label">
                Điều khoản (có thể dùng placeholder{" "}
                {"{{owner_name}}, {{renter_name}}, {{equipment_title}}, {{start_date}}, {{end_date}}, {{rental_price}}, {{deposit_amount}}, {{contract_code}}"}
                )
                <textarea className="input-field" rows={9} value={templateTerms} onChange={(event) => setTemplateTerms(event.target.value)} required />
              </label>
              <label className="field-label">
                Trường điền tùy chỉnh — mỗi dòng: mã|nhãn|required hoặc optional
                <textarea
                  className="input-field"
                  rows={3}
                  value={templateFields}
                  onChange={(event) => setTemplateFields(event.target.value)}
                  placeholder={"delivery_address|Địa chỉ bàn giao|required"}
                />
              </label>
              <div className="moderator-actions">
                {templateEditing && (
                  <button type="button" className="button button-quiet" onClick={() => setTemplateEditing(null)}>
                    Hủy chỉnh sửa
                  </button>
                )}
                <button type="submit" className="button button-primary" disabled={busyId === "template"}>
                  {busyId === "template" ? "Đang lưu..." : templateEditing ? "Tạo phiên bản nháp mới" : "Tạo bản nháp"}
                </button>
              </div>
            </form>
            {templates.map((template) => (
              <article className="owner-section-card moderator-card" key={template._id}>
                <div className="moderator-card-heading">
                  <div>
                    <span className="contract-code-tag">{template.template_code}</span>
                    <h2>{template.name} • v{template.version}</h2>
                    <p>Người tạo: {template.created_by?.name || "—"} • {dateTime(template.createdAt)}</p>
                  </div>
                  <span className={`status-badge status-${template.status}`}>{template.status}</span>
                </div>
                <p>Trường: {template.fields.map((field) => `${field.label}${field.required ? " *" : ""}`).join(", ") || "Không có"}</p>
                <details className="moderator-document">
                  <summary>Xem nội dung mẫu</summary>
                  <pre>{template.terms_content}</pre>
                </details>
                <div className="moderator-actions">
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setTemplateEditing(template);
                      setTemplateName(template.name);
                      setTemplateTerms(template.terms_content);
                      setTemplateFields(templateFieldsToText(template.fields));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Tạo phiên bản mới
                  </button>
                  {template.status === "draft" && (
                    <button
                      className="button button-primary"
                      disabled={busyId === template._id}
                      onClick={() => void performAction(template._id, () => moderatorApi.publishTemplate(token!, template._id), "Đã công bố phiên bản mẫu.")}
                    >
                      Công bố
                    </button>
                  )}
                  {template.status === "published" && (
                    <button
                      className="button button-secondary"
                      disabled={busyId === template._id}
                      onClick={() => void performAction(template._id, () => moderatorApi.retireTemplate(token!, template._id), "Đã ngừng sử dụng phiên bản mẫu.")}
                    >
                      Ngừng sử dụng
                    </button>
                  )}
                </div>
              </article>
            ))}
            {templates.length === 0 && <div className="owner-section-card">Chưa có mẫu hợp đồng.</div>}
          </section>
        )}

        {!loading && activeTab === "support" && (
          <form className="owner-section-card moderator-form" onSubmit={(event) => void handleTicketSubmit(event)}>
            <h2>Gửi yêu cầu hỗ trợ</h2>
            <label className="field-label">
              Loại vấn đề
              <select className="input-field" value={ticketCategory} onChange={(event) => setTicketCategory(event.target.value)}>
                <option>Kỹ thuật hệ thống</option>
                <option>Hợp đồng &amp; Pháp lý</option>
                <option>Khác</option>
              </select>
            </label>
            <label className="field-label">
              Tiêu đề
              <input className="input-field" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} required maxLength={160} />
            </label>
            <label className="field-label">
              Mã hồ sơ liên quan (tùy chọn)
              <input className="input-field" value={ticketRelatedId} onChange={(event) => setTicketRelatedId(event.target.value)} placeholder="ID hồ sơ MongoDB" />
            </label>
            <label className="field-label">
              Mô tả
              <textarea className="input-field" rows={7} value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} required />
            </label>
            <button type="submit" className="button button-primary" disabled={busyId === "ticket"}>
              {busyId === "ticket" ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
