import { useState, useEffect } from "react";
import type { SupportTicket } from "../../types/owner";
import { ownerApi } from "../../services/ownerApi";
import { getSocket } from "../../services/socket";

interface Props {
  token: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function OwnerSupportTab({ token, onError, onSuccess }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // Form states
  const [category, setCategory] = useState("Kỹ thuật hệ thống");
  const [priority, setPriority] = useState("medium");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [token]);

  // Realtime Socket.IO Listeners for Owner
  useEffect(() => {
    const socket = getSocket();

    const handleTicketReplied = (data: { ticketId: string; ticket: SupportTicket; senderRole: string }) => {
      if (!data?.ticket) return;
      setTickets((prev) =>
        prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
      );
      setSelectedTicket((cur) => {
        if (cur && cur._id === data.ticket._id) {
          return data.ticket;
        }
        return cur;
      });
      if (data.senderRole === "systemadmin") {
        onSuccess("🔔 Quản trị viên vừa phản hồi yêu cầu hỗ trợ của bạn!");
      }
    };

    const handleTicketStatusUpdated = (data: { ticketId: string; status: string; ticket: SupportTicket }) => {
      if (!data?.ticket) return;
      setTickets((prev) =>
        prev.map((t) => (t._id === data.ticket._id ? data.ticket : t))
      );
      setSelectedTicket((cur) => {
        if (cur && cur._id === data.ticket._id) {
          return data.ticket;
        }
        return cur;
      });
      onSuccess(`🔔 Yêu cầu #${data.ticket.ticket_code} đã cập nhật trạng thái: "${data.status.toUpperCase()}".`);
    };

    socket.on("ticket:replied", handleTicketReplied);
    socket.on("ticket:status_updated", handleTicketStatusUpdated);

    return () => {
      socket.off("ticket:replied", handleTicketReplied);
      socket.off("ticket:status_updated", handleTicketStatusUpdated);
    };
  }, []);

  async function loadTickets() {
    try {
      const data = await ownerApi.getSupportTickets(token);
      setTickets(data.tickets);
      if (selectedTicket) {
        const found = data.tickets.find((t) => t._id === selectedTicket._id);
        if (found) setSelectedTicket(found);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // UC_O18: Submit Support Ticket
  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    onError("");
    onSuccess("");
    try {
      await ownerApi.submitSupportTicket(token, {
        category,
        priority,
        subject,
        message,
      });
      onSuccess("Đã gửi yêu cầu hỗ trợ (UC_O18) thành công.");
      setShowCreateModal(false);
      setSubject("");
      setMessage("");
      loadTickets();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      await ownerApi.replySupportTicket(token, selectedTicket._id, replyMessage.trim());
      setReplyMessage("");
      loadTickets();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gửi phản hồi thất bại.");
    }
  }

  return (
    <div className="owner-tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#fff" }}>
            🎫 Yêu cầu Hỗ trợ kỹ thuật & Nghiệp vụ (UC_O18)
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Gửi yêu cầu hỗ trợ kỹ thuật, hợp đồng, giải ngân tiền cọc và theo dõi kết quả xử lý từ Quản trị viên.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Gửi yêu cầu hỗ trợ (UC_O18) 💬
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedTicket ? "1fr 1fr" : "1fr", gap: "20px" }}>
        {/* Tickets List */}
        <div className="owner-section-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Danh mục</th>
                  <th>Tiêu đề</th>
                  <th>Mức ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                      Chưa có yêu cầu hỗ trợ nào.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t._id}
                      style={{
                        background: selectedTicket?._id === t._id ? "rgba(249, 115, 22, 0.1)" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedTicket(t)}
                    >
                      <td>
                        <strong style={{ color: "#fff" }}>{t.ticket_code}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td>{t.category}</td>
                      <td>
                        <strong style={{ color: "#fff" }}>{t.subject}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.message}
                        </div>
                      </td>
                      <td>
                        <span className={`priority-badge priority-${t.priority}`}>
                          {t.priority === "high" ? "Cao" : t.priority === "medium" ? "Bình thường" : "Thấp"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>
                          {t.status === "open"
                            ? "Đang mở"
                            : t.status === "in_progress"
                            ? "Đang xử lý"
                            : t.status === "resolved"
                            ? "Đã xong"
                            : "Đã đóng"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button button-secondary"
                          style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(t);
                          }}
                        >
                          Chi tiết ({t.replies?.length || 0})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Ticket Thread */}
        {selectedTicket && (
          <div className="owner-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <span className="contract-code-tag">{selectedTicket.ticket_code}</span>
                <h3 style={{ margin: "6px 0 2px", color: "#fff", fontSize: "1.1rem" }}>
                  {selectedTicket.subject}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Danh mục: {selectedTicket.category} • Ngày gửi: {new Date(selectedTicket.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
              <button
                className="close-modal-btn"
                style={{ position: "static" }}
                onClick={() => setSelectedTicket(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#111827", padding: "14px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--orange)", fontWeight: 600, marginBottom: "4px" }}>
                Nội dung yêu cầu ban đầu:
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                {selectedTicket.message}
              </p>
            </div>

            {/* Conversation replies */}
            <div style={{ maxHeight: "240px", overflowY: "auto", display: "grid", gap: "10px", marginBottom: "16px" }}>
              {selectedTicket.replies?.map((rep, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: rep.sender_role === "owner" ? "#1a2235" : "#1e3a5f",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--muted)", marginBottom: "4px" }}>
                    <strong style={{ color: "#fff" }}>
                      {rep.sender_name} ({rep.sender_role})
                    </strong>
                    <span>{new Date(rep.created_at).toLocaleTimeString("vi-VN")}</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>{rep.message}</div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} style={{ display: "flex", gap: "8px" }}>
              <input
                className="input-field"
                type="text"
                placeholder="Nhập nội dung phản hồi tiếp theo..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                required
              />
              <button type="submit" className="button button-primary" style={{ whiteSpace: "nowrap" }}>
                Gửi ➔
              </button>
            </form>
          </div>
        )}
      </div>

      {/* MODAL: Submit Support Ticket (UC_O18) */}
      {showCreateModal && (
        <div className="owner-modal-overlay">
          <div className="owner-modal-card" style={{ maxWidth: "540px" }}>
            <div className="owner-modal-header">
              <h3>💬 Gửi yêu cầu hỗ trợ mới (UC_O18)</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTicket}>
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label className="field-label">Phân loại hỗ trợ</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Kỹ thuật hệ thống">Kỹ thuật hệ thống</option>
                    <option value="Quyết toán & Tiền cọc">Quyết toán & Tiền cọc</option>
                    <option value="Hợp đồng & Pháp lý">Hợp đồng & Pháp lý</option>
                    <option value="Xác minh danh tính">Xác minh danh tính</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Mức độ ưu tiên</label>
                  <select
                    className="input-field"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Thấp (Tư vấn chung)</option>
                    <option value="medium">Bình thường (Cần giải đáp trong 24h)</option>
                    <option value="high">Cao (Sự cố giao dịch, hợp đồng khẩn)</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Tiêu đề yêu cầu *</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Ví dụ: Cần hỗ trợ tra soát khoản giải ngân hợp đồng HD-2026-..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Nội dung chi tiết *</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Nêu rõ vấn đề bạn đang gặp phải kèm mã hợp đồng hoặc mã giao dịch..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang gửi..." : "Gửi phiếu hỗ trợ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
