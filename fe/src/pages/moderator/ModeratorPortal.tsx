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
  ModeratorStatusRequest,
} from "../../services/moderatorApi";

type Tab = "contracts" | "equipment" | "handover" | "status" | "templates" | "support";

const tabs: { id: Tab; label: string }[] = [
  { id: "contracts", label: "Hồ sơ hợp đồng" },
  { id: "equipment", label: "Thiết bị" },
  { id: "handover", label: "Bàn giao / hoàn trả" },
  { id: "status", label: "Yêu cầu trạng thái" },
  { id: "templates", label: "Mẫu hợp đồng" },
  { id: "support", label: "Gửi yêu cầu hỗ trợ" },
];

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
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [key, label, requirement] = line.split("|").map((part) => part.trim());
    return { key, label, required: requirement !== "optional" };
  });
}

export default function ModeratorPortal() {
  const { user, token, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("contracts");
  const [contracts, setContracts] = useState<ModeratorContract[]>([]);
  const [equipments, setEquipments] = useState<ModeratorEquipment[]>([]);
  const [records, setRecords] = useState<ModeratorHandoverRecord[]>([]);
  const [statusRequests, setStatusRequests] = useState<ModeratorStatusRequest[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      const [contractData, equipmentData, recordData, statusData, templateData] = await Promise.all([
        moderatorApi.getContracts(token),
        moderatorApi.getEquipments(token),
        moderatorApi.getHandoverRecords(token),
        moderatorApi.getStatusRequests(token),
        moderatorApi.getTemplates(token),
      ]);
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
      const notificationWarning = typeof result === "object" && result !== null && "notificationWarning" in result
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

  return (
    <div className="owner-portal-layout">
      <header className="owner-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Brand compact />
          <span className="owner-badge">KHÔNG GIAN RENTAL MODERATOR</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/profile" className="button button-secondary">👤 {user?.name || "Tài khoản"}</Link>
          <button className="button button-quiet" onClick={() => void signOut()}>Đăng xuất ↗</button>
        </div>
      </header>
      <main className="owner-container">
        <div className="admin-topbar" style={{ margin: "0 0 20px" }}>
          <div>
            <span className="form-kicker">KIỂM DUYỆT VÀ GIÁM SÁT</span>
            <h1 className="admin-page-title">Rental Moderator</h1>
          </div>
          <button className="button button-secondary" onClick={() => void loadData()} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới dữ liệu ⟳"}
          </button>
        </div>
        <div className="moderator-stats">
          <div><strong>{pendingContracts.length}</strong><span>Hợp đồng chờ duyệt</span></div>
          <div><strong>{statusRequests.filter((request) => request.status === "pending").length}</strong><span>Yêu cầu trạng thái chờ xử lý</span></div>
          <div><strong>{records.filter((record) => !record.moderator_review || record.moderator_review.status === "pending").length}</strong><span>Biên bản chờ xác minh</span></div>
          <div><strong>{equipments.length}</strong><span>Thiết bị theo dõi</span></div>
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
            </button>
          ))}
        </nav>
        {loading && <div className="owner-section-card">Đang tải dữ liệu...</div>}
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
                  <div><span className="contract-code-tag">{contract.contract_code}</span><h2>{contract.title}</h2></div>
                  <span className={`status-badge status-${contract.status}`}>{contract.status}</span>
                </div>
                <div className="moderator-detail-grid">
                  <p><b>Owner:</b> {contract.owner_id?.name} ({contract.owner_id?.email})</p>
                  <p><b>Renter:</b> {contract.renter_id?.name} ({contract.renter_id?.email})</p>
                  <p><b>Thiết bị:</b> {contract.equipment_id?.title} • {contract.equipment_id?.brand} {contract.equipment_id?.model_name}</p>
                  <p><b>Số serial / tình trạng:</b> {contract.equipment_id?.serial_number || "—"} / {contract.equipment_id?.condition || "—"}</p>
                  <p><b>Thời gian thuê:</b> {dateTime(contract.start_date)} — {dateTime(contract.end_date)}</p>
                  <p><b>Giá thuê / tiền cọc:</b> {contract.rental_price.toLocaleString("vi-VN")} đ / {contract.deposit_amount.toLocaleString("vi-VN")} đ</p>
                  <p><b>Phiên bản hợp đồng:</b> v{contract.version} • gửi lúc {dateTime(contract.createdAt)}</p>
                  <p><b>Phụ kiện:</b> {contract.equipment_id?.accessories?.join(", ") || "Không khai báo"}</p>
                </div>
                {contract.special_conditions && <p><b>Điều khoản bổ sung:</b> {contract.special_conditions}</p>}
                {contract.request_id?.renter_note && <p><b>Ghi chú yêu cầu thuê:</b> {contract.request_id.renter_note}</p>}
                <details className="moderator-document">
                  <summary>Xem toàn văn điều khoản hợp đồng</summary>
                  <pre>{contract.terms_content}</pre>
                </details>
                {contract.moderator_feedback && <p className="moderator-warning"><b>Lý do từ chối:</b> {contract.moderator_feedback}</p>}
                {contract.moderation_history && contract.moderation_history.length > 0 && (
                  <details className="moderator-document">
                    <summary>Lịch sử kiểm duyệt ({contract.moderation_history.length})</summary>
                    {contract.moderation_history.map((entry, index) => (
                      <p key={`${entry.created_at}-${index}`}>{entry.action} • v{entry.version} • {entry.moderator_id?.name || "Moderator"} • {dateTime(entry.created_at)} {entry.reason && `• ${entry.reason}`}</p>
                    ))}
                  </details>
                )}
                {contract.status === "pending_approval" && (
                  <div className="moderator-actions">
                    <textarea
                      className="input-field"
                      rows={2}
                      placeholder="Bắt buộc nhập lý do nếu từ chối"
                      value={contractReasons[contract._id] || ""}
                      onChange={(event) => setContractReasons((current) => ({ ...current, [contract._id]: event.target.value }))}
                    />
                    <button
                      className="button button-primary"
                      disabled={busyId === contract._id || issues.length > 0}
                      onClick={() => void performAction(contract._id, () => moderatorApi.reviewContract(token!, contract._id, "approve"), "Đã phê duyệt hồ sơ và ghi nhận phiên bản hợp đồng.")}
                    >Phê duyệt</button>
                    <button
                      className="button button-secondary"
                      disabled={busyId === contract._id || !contractReasons[contract._id]?.trim()}
                      onClick={() => void performAction(contract._id, () => moderatorApi.reviewContract(token!, contract._id, "reject", contractReasons[contract._id]), "Đã từ chối hồ sơ và lưu lý do.")}
                    >Từ chối</button>
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
              <input className="input-field" value={equipmentSearch} onChange={(event) => setEquipmentSearch(event.target.value)} placeholder="Tìm theo tên, danh mục, serial hoặc Owner" />
              <span>{visibleEquipments.length} thiết bị</span>
            </div>
            {visibleEquipments.map((equipment) => (
              <article className="owner-section-card moderator-card" key={equipment._id}>
                <div className="moderator-card-heading">
                  <div><h2>{equipment.title}</h2><p>{equipment.category} • serial {equipment.serial_number || "—"}</p></div>
                  <span className={`status-badge status-${equipment.status}`}>{equipment.status}</span>
                </div>
                <p>Owner: {equipment.owner_id?.name} ({equipment.owner_id?.email}) • Tình trạng: {equipment.condition || "—"} • Cập nhật: {dateTime(equipment.updatedAt)}</p>
                <details className="moderator-document"><summary>Lịch sử yêu cầu đổi trạng thái ({equipment.status_history.length})</summary>
                  {equipment.status_history.map((item) => <p key={item._id}>                  {item.current_status} → {item.target_status} • {item.status} • {item.reason} • {dateTime(item.createdAt)} {item.reviewed_by?.name && `• Xử lý bởi ${item.reviewed_by.name}`} {item.moderator_note && `• ${item.moderator_note}`}</p>)}
                </details>
                <details className="moderator-document"><summary>Hợp đồng liên quan ({equipment.contracts.length})</summary>
                  {equipment.contracts.map((contract) => <p key={contract._id}>{contract.contract_code} • {contract.title} • {contract.status} • {dateTime(contract.start_date)}—{dateTime(contract.end_date)}</p>)}
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
              return <article className="owner-section-card moderator-card" key={record._id}>
                <div className="moderator-card-heading">
                  <div><h2>{record.record_type === "handover" ? "Biên bản bàn giao" : "Biên bản hoàn trả"} • {record.contract_id?.contract_code}</h2><p>{record.equipment_id?.title} • {dateTime(record.record_date)}</p></div>
                  <span className={`status-badge status-${state}`}>{state}</span>
                </div>
                <div className="moderator-detail-grid">
                  <p><b>Tình trạng vật lý:</b> {record.physical_condition}</p><p><b>Hoạt động:</b> {record.working_status}</p>
                  <p><b>Owner / Renter xác nhận:</b> {record.owner_confirmed ? "Có" : "Chưa"} / {record.renter_confirmed ? "Có" : "Chưa"}</p>
                  <p><b>Phụ kiện:</b> {record.accessories_checklist.map((item) => `${item.checked ? "✓" : "✗"} ${item.item}${item.notes ? ` (${item.notes})` : ""}`).join(", ") || "—"}</p>
                  <p><b>Thiếu / hư hỏng:</b> {record.missing_items?.join(", ") || "Không ghi nhận"} • {record.damage_detected || "Không ghi nhận"} {record.estimated_damage_cost ? `(${record.estimated_damage_cost.toLocaleString("vi-VN")} đ)` : ""}</p>
                  <p><b>Ghi chú:</b> {record.notes || "—"}</p>
                </div>
                {record.evidence_photos.length > 0 && <div className="moderator-evidence">{record.evidence_photos.map((src, index) => <a key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer">Minh chứng {index + 1}</a>)}</div>}
                {record.moderator_review?.note && <p className="moderator-warning">Ý kiến xử lý trước: {record.moderator_review.note}</p>}
                {record.moderator_review_history && record.moderator_review_history.length > 0 && <details className="moderator-document"><summary>Lịch sử xác minh ({record.moderator_review_history.length})</summary>{record.moderator_review_history.map((entry, index) => <p key={`${entry.reviewed_at}-${index}`}>{entry.status} • {entry.moderator_id?.name || "Moderator"} • {dateTime(entry.reviewed_at)} {entry.note && `• ${entry.note}`}</p>)}</details>}
                {state !== "verified" && <div className="moderator-actions">
                  <textarea className="input-field" rows={2} placeholder="Lý do bắt buộc nếu yêu cầu bổ sung" value={recordNotes[record._id] || ""} onChange={(event) => setRecordNotes((current) => ({ ...current, [record._id]: event.target.value }))} />
                  <button className="button button-primary" disabled={busyId === record._id} onClick={() => void performAction(record._id, () => moderatorApi.reviewHandoverRecord(token!, record._id, "verify", recordNotes[record._id]), "Đã xác minh biên bản.")}>Xác minh</button>
                  <button className="button button-secondary" disabled={busyId === record._id || !recordNotes[record._id]?.trim()} onClick={() => void performAction(record._id, () => moderatorApi.reviewHandoverRecord(token!, record._id, "request_changes", recordNotes[record._id]), "Đã yêu cầu bổ sung biên bản.")}>Yêu cầu bổ sung</button>
                </div>}
              </article>;
            })}
          </section>
        )}
        {!loading && activeTab === "status" && (
          <section className="moderator-list">
            {statusRequests.map((request) => <article className="owner-section-card moderator-card" key={request._id}>
              <div className="moderator-card-heading"><div><h2>{request.equipment_id?.title}</h2><p>Owner: {request.owner_id?.name} ({request.owner_id?.email})</p></div><span className={`status-badge status-${request.status}`}>{request.status}</span></div>
              <p><b>Trạng thái:</b> {request.current_status} → {request.target_status} • <b>Yêu cầu:</b> {request.reason}</p>
              <p><b>Tạo lúc:</b> {dateTime(request.createdAt)} {request.moderator_note && `• Ghi chú: ${request.moderator_note}`}</p>
              {request.evidence_photos.map((src, index) => <a className="moderator-evidence-link" key={`${src}-${index}`} href={src} target="_blank" rel="noreferrer">Minh chứng {index + 1}</a>)}
              {request.status === "pending" && <div className="moderator-actions">
                <textarea className="input-field" rows={2} placeholder="Ghi lý do nếu từ chối" value={requestNotes[request._id] || ""} onChange={(event) => setRequestNotes((current) => ({ ...current, [request._id]: event.target.value }))} />
                <button className="button button-primary" disabled={busyId === request._id} onClick={() => void performAction(request._id, () => moderatorApi.reviewStatusRequest(token!, request._id, "approve"), "Đã duyệt yêu cầu và cập nhật trạng thái thiết bị.")}>Chấp thuận</button>
                <button className="button button-secondary" disabled={busyId === request._id || !requestNotes[request._id]?.trim()} onClick={() => void performAction(request._id, () => moderatorApi.reviewStatusRequest(token!, request._id, "reject", requestNotes[request._id]), "Đã từ chối yêu cầu.")}>Từ chối</button>
              </div>}
            </article>)}
            {statusRequests.length === 0 && <div className="owner-section-card">Chưa có yêu cầu đổi trạng thái thiết bị.</div>}
          </section>
        )}
        {!loading && activeTab === "templates" && (
          <section className="moderator-list">
            <form className="owner-section-card moderator-card moderator-form" onSubmit={(event) => void handleTemplateSubmit(event)}>
              <h2>{templateEditing ? `Tạo phiên bản mới từ ${templateEditing.name} v${templateEditing.version}` : "Tạo mẫu hợp đồng"}</h2>
              <label className="field-label">Tên mẫu<input className="input-field" value={templateName} onChange={(event) => setTemplateName(event.target.value)} required /></label>
              <label className="field-label">Điều khoản (có thể dùng placeholder {"{{owner_name}}, {{renter_name}}, {{equipment_title}}, {{start_date}}, {{end_date}}, {{rental_price}}, {{deposit_amount}}, {{contract_code}}"})<textarea className="input-field" rows={9} value={templateTerms} onChange={(event) => setTemplateTerms(event.target.value)} required /></label>
              <label className="field-label">Trường điền tùy chỉnh — mỗi dòng: mã|nhãn|required hoặc optional<textarea className="input-field" rows={3} value={templateFields} onChange={(event) => setTemplateFields(event.target.value)} placeholder={"delivery_address|Địa chỉ bàn giao|required"} /></label>
              <div className="moderator-actions">
                {templateEditing && <button type="button" className="button button-quiet" onClick={() => setTemplateEditing(null)}>Hủy chỉnh sửa</button>}
                <button type="submit" className="button button-primary" disabled={busyId === "template"}>{busyId === "template" ? "Đang lưu..." : templateEditing ? "Tạo phiên bản nháp mới" : "Tạo bản nháp"}</button>
              </div>
            </form>
            {templates.map((template) => <article className="owner-section-card moderator-card" key={template._id}>
              <div className="moderator-card-heading"><div><span className="contract-code-tag">{template.template_code}</span><h2>{template.name} • v{template.version}</h2><p>Người tạo: {template.created_by?.name || "—"} • {dateTime(template.createdAt)}</p></div><span className={`status-badge status-${template.status}`}>{template.status}</span></div>
              <p>Trường: {template.fields.map((field) => `${field.label}${field.required ? " *" : ""}`).join(", ") || "Không có"}</p>
              <details className="moderator-document"><summary>Xem nội dung mẫu</summary><pre>{template.terms_content}</pre></details>
              <div className="moderator-actions">
                <button className="button button-secondary" onClick={() => { setTemplateEditing(template); setTemplateName(template.name); setTemplateTerms(template.terms_content); setTemplateFields(templateFieldsToText(template.fields)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Tạo phiên bản mới</button>
                {template.status === "draft" && <button className="button button-primary" disabled={busyId === template._id} onClick={() => void performAction(template._id, () => moderatorApi.publishTemplate(token!, template._id), "Đã công bố phiên bản mẫu.")}>Công bố</button>}
                {template.status === "published" && <button className="button button-secondary" disabled={busyId === template._id} onClick={() => void performAction(template._id, () => moderatorApi.retireTemplate(token!, template._id), "Đã ngừng sử dụng phiên bản mẫu.")}>Ngừng sử dụng</button>}
              </div>
            </article>)}
            {templates.length === 0 && <div className="owner-section-card">Chưa có mẫu hợp đồng.</div>}
          </section>
        )}
        {!loading && activeTab === "support" && (
          <form className="owner-section-card moderator-form" onSubmit={(event) => void handleTicketSubmit(event)}>
            <h2>Gửi yêu cầu hỗ trợ</h2>
            <label className="field-label">Loại vấn đề<select className="input-field" value={ticketCategory} onChange={(event) => setTicketCategory(event.target.value)}><option>Kỹ thuật hệ thống</option><option>Hợp đồng &amp; Pháp lý</option><option>Khác</option></select></label>
            <label className="field-label">Tiêu đề<input className="input-field" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} required maxLength={160} /></label>
            <label className="field-label">Mã hồ sơ liên quan (tùy chọn)<input className="input-field" value={ticketRelatedId} onChange={(event) => setTicketRelatedId(event.target.value)} placeholder="ID hồ sơ MongoDB" /></label>
            <label className="field-label">Mô tả<textarea className="input-field" rows={7} value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} required /></label>
            <button type="submit" className="button button-primary" disabled={busyId === "ticket"}>{busyId === "ticket" ? "Đang gửi..." : "Gửi yêu cầu"}</button>
          </form>
        )}
      </main>
    </div>
  );
}
