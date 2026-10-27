import { useEffect, useState } from "react";
import { adminApi } from "../../services/adminApi";
import type {
  AdminKycSubmission,
  AdminKycStats,
} from "../../types/admin";

interface AdminKycTabProps {
  token: string;
  onStatsUpdate?: (stats: AdminKycStats) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function AdminKycTab({
  token,
  onStatsUpdate,
  onError,
  onSuccess,
}: AdminKycTabProps) {
  const [submissions, setSubmissions] = useState<AdminKycSubmission[]>([]);
  const [stats, setStats] = useState<AdminKycStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Modal state
  const [selectedSubmission, setSelectedSubmission] = useState<AdminKycSubmission | null>(null);
  const [reviewAction, setReviewAction] = useState<"verified" | "rejected">("verified");
  const [rejectionReason, setRejectionReason] = useState("");
  const [trustScoreBonus, setTrustScoreBonus] = useState(20);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const fetchKycSubmissions = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await adminApi.listKycSubmissions(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setSubmissions(res.submissions || []);
      setStats(res.stats);
      if (onStatsUpdate && res.stats) {
        onStatsUpdate(res.stats);
      }
    } catch (err: any) {
      onError(err.message || "Không thể tải danh sách hồ sơ xác thực KYC");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKycSubmissions();
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKycSubmissions();
  };

  const handleOpenReview = (submission: AdminKycSubmission) => {
    setSelectedSubmission(submission);
    setReviewAction(submission.kycStatus === "rejected" ? "rejected" : "verified");
    setRejectionReason(submission.kycDocument?.rejectionReason || "");
    setTrustScoreBonus(20);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission || !token) return;

    if (reviewAction === "rejected" && !rejectionReason.trim()) {
      onError("Vui lòng nhập lý do từ chối hồ sơ định danh KYC");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await adminApi.reviewKycSubmission(token, selectedSubmission._id, {
        status: reviewAction,
        rejectionReason: reviewAction === "rejected" ? rejectionReason.trim() : undefined,
        trustScoreBonus: reviewAction === "verified" ? trustScoreBonus : undefined,
      });

      onSuccess(res.message || "Đã cập nhật trạng thái hồ sơ KYC thành công");
      setSelectedSubmission(null);
      fetchKycSubmissions();
    } catch (err: any) {
      onError(err.message || "Lỗi xử lý duyệt hồ sơ KYC");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderKycBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="status-badge status-pending">Chờ xác thực</span>;
      case "verified":
        return <span className="status-badge status-approved">Đã xác thực ✓</span>;
      case "rejected":
        return <span className="status-badge" style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>Bị từ chối</span>;
      case "unverified":
        return <span className="status-badge" style={{ background: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" }}>Chưa gửi hồ sơ</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const quickRejectReasons = [
    "Ảnh giấy tờ tùy thân bị mờ, lóa sáng hoặc mất góc",
    "Số CCCD nhập trên hệ thống không khớp với ảnh chụp",
    "Ảnh chân dung cầm CCCD không rõ khuôn mặt hoặc nghi vấn cắt ghép",
    "Giấy tờ tùy thân đã hết hạn sử dụng",
  ];

  return (
    <div style={{ marginTop: "20px" }}>
      {/* KPI Badges */}
      <div className="ticket-kpi-grid">
        <div
          className={`ticket-kpi-card ${statusFilter === "pending" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("pending")}
          title="Bấm để lọc hồ sơ chờ duyệt"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Chờ xét duyệt (UC_A06)</span>
            <span className="ticket-kpi-badge badge-open">CHỜ DUYỆT</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#f97316" }}>
            {stats?.pending ?? 0}
          </div>
          <div className="ticket-kpi-sub">Hồ sơ CCCD đang đợi Admin kiểm tra</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "verified" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("verified")}
          title="Bấm để lọc hồ sơ đã xác thực"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Đã xác thực</span>
            <span className="ticket-kpi-badge badge-resolved">ĐÃ DUYỆT</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#10b981" }}>
            {stats?.verified ?? 0}
          </div>
          <div className="ticket-kpi-sub">Được mở khóa thuê máy giá trị cao</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "rejected" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("rejected")}
          title="Bấm để lọc hồ sơ bị từ chối"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Bị từ chối</span>
            <span className="ticket-kpi-badge badge-closed">TỪ CHỐI</span>
          </div>
          <div className="ticket-kpi-value" style={{ color: "#dc2626" }}>
            {stats?.rejected ?? 0}
          </div>
          <div className="ticket-kpi-sub">Yêu cầu người dùng chụp lại ảnh</div>
        </div>

        <div
          className={`ticket-kpi-card ${statusFilter === "all" ? "is-active" : ""}`}
          onClick={() => setStatusFilter("all")}
          title="Bấm để xem tất cả hồ sơ"
        >
          <div className="ticket-kpi-header">
            <span className="ticket-kpi-label" style={{ color: "var(--muted)" }}>Tổng hồ sơ</span>
            <span className="ticket-kpi-badge badge-all">TẤT CẢ</span>
          </div>
          <div className="ticket-kpi-value">
            {stats?.total_active ?? submissions.length}
          </div>
          <div className="ticket-kpi-sub">Khách thuê nộp định danh cá nhân</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="ticket-filter-bar" style={{ marginTop: "20px" }}>
        <form onSubmit={handleSearchSubmit} className="ticket-search-form" style={{ flex: 1 }}>
          <input
            type="text"
            className="input ticket-search-input"
            placeholder="🔍 Tìm theo họ tên, email, số CCCD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="button button-secondary">
            Tìm kiếm
          </button>
        </form>

        <div className="ticket-filter-group">
          <select
            className="input"
            style={{ width: "auto" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Chờ xác thực</option>
            <option value="verified">Đã xác thực</option>
            <option value="rejected">Bị từ chối</option>
            <option value="unverified">Chưa gửi hồ sơ</option>
            <option value="all">Tất cả trạng thái</option>
          </select>

          <button
            type="button"
            className="button button-quiet"
            onClick={fetchKycSubmissions}
            title="Làm mới danh sách"
          >
            🔄 Tải lại
          </button>
        </div>
      </div>

      {/* KYC Submissions Table */}
      <div className="admin-table-container" style={{ marginTop: "16px" }}>
        {isLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            ⏳ Đang tải danh sách hồ sơ xác thực danh tính...
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Không có hồ sơ xác thực nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách thuê (Renter)</th>
                <th>Số CCCD/CMND</th>
                <th>Ảnh tài liệu</th>
                <th>Điểm uy tín</th>
                <th>Trạng thái KYC</th>
                <th>Thời điểm nộp</th>
                <th>Ghi chú / Phê duyệt</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{item.email}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      SĐT: {item.phone || "Chưa cập nhật"}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: "0.95rem" }}>
                      {item.kycDocument?.idNumber || "—"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {item.kycDocument?.idCardFront && (
                        <img
                          src={item.kycDocument.idCardFront}
                          alt="Mặt trước"
                          title="Bấm để xem ảnh mặt trước"
                          onClick={() => setEnlargedImage(item.kycDocument!.idCardFront!)}
                          style={{
                            width: "36px",
                            height: "26px",
                            objectFit: "cover",
                            borderRadius: "3px",
                            cursor: "zoom-in",
                            border: "1px solid var(--border)",
                          }}
                        />
                      )}
                      {item.kycDocument?.idCardBack && (
                        <img
                          src={item.kycDocument.idCardBack}
                          alt="Mặt sau"
                          title="Bấm để xem ảnh mặt sau"
                          onClick={() => setEnlargedImage(item.kycDocument!.idCardBack!)}
                          style={{
                            width: "36px",
                            height: "26px",
                            objectFit: "cover",
                            borderRadius: "3px",
                            cursor: "zoom-in",
                            border: "1px solid var(--border)",
                          }}
                        />
                      )}
                      {item.kycDocument?.selfiePhoto && (
                        <img
                          src={item.kycDocument.selfiePhoto}
                          alt="Selfie"
                          title="Bấm để xem ảnh selfie"
                          onClick={() => setEnlargedImage(item.kycDocument!.selfiePhoto!)}
                          style={{
                            width: "36px",
                            height: "26px",
                            objectFit: "cover",
                            borderRadius: "3px",
                            cursor: "zoom-in",
                            border: "1px solid var(--border)",
                          }}
                        />
                      )}
                      {!item.kycDocument?.idCardFront && !item.kycDocument?.idCardBack && (
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Chưa tải</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color: (item.trust_score || 0) >= 100 ? "#16a34a" : "#f97316",
                      }}
                    >
                      ★ {item.trust_score ?? 100}
                    </span>
                  </td>
                  <td>{renderKycBadge(item.kycStatus)}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {formatDate(item.kycDocument?.submittedAt || item.createdAt)}
                  </td>
                  <td>
                    {item.kycStatus === "verified" ? (
                      <div style={{ fontSize: "0.8rem", color: "#16a34a" }}>
                        Duyệt lúc: {formatDate(item.kycDocument?.verifiedAt)}
                      </div>
                    ) : item.kycStatus === "rejected" ? (
                      <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                        Lý do: {item.kycDocument?.rejectionReason || "Không đạt"}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Chờ thẩm định</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                      onClick={() => handleOpenReview(item)}
                    >
                      {item.kycStatus === "pending" ? "🔍 Xét duyệt" : "👁️ Xem hồ sơ"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="ticket-modal-overlay" onClick={() => !isSubmittingReview && setSelectedSubmission(null)}>
          <div
            className="ticket-modal"
            style={{ maxWidth: "780px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleReviewSubmit}>
              <div className="ticket-modal-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                    🆔 Thẩm định hồ sơ xác thực danh tính (KYC)
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                    Người dùng: <strong>{selectedSubmission.name}</strong> ({selectedSubmission.email})
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => !isSubmittingReview && setSelectedSubmission(null)}
                >
                  ✕
                </button>
              </div>

              <div className="ticket-modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                {/* ID Number and basic info */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--card-bg, #f8fafc)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    marginBottom: "16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Số CCCD / Định danh khai báo:</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "monospace", color: "var(--primary)" }}>
                      {selectedSubmission.kycDocument?.idNumber || "Chưa nhập số CCCD"}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Điểm uy tín hiện tại:</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#16a34a" }}>
                      ★ {selectedSubmission.trust_score ?? 100}
                    </div>
                  </div>
                </div>

                {/* 3 Document Previews */}
                <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>
                  📷 Ảnh tài liệu đối chiếu (Bấm vào ảnh để phóng to kiểm tra chi tiết):
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "8px",
                      textAlign: "center",
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                      1. Mặt trước CCCD
                    </span>
                    {selectedSubmission.kycDocument?.idCardFront ? (
                      <img
                        src={selectedSubmission.kycDocument.idCardFront}
                        alt="Mặt trước CCCD"
                        onClick={() => setEnlargedImage(selectedSubmission.kycDocument!.idCardFront!)}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          cursor: "zoom-in",
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : (
                      <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        Không có ảnh
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "8px",
                      textAlign: "center",
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                      2. Mặt sau CCCD
                    </span>
                    {selectedSubmission.kycDocument?.idCardBack ? (
                      <img
                        src={selectedSubmission.kycDocument.idCardBack}
                        alt="Mặt sau CCCD"
                        onClick={() => setEnlargedImage(selectedSubmission.kycDocument!.idCardBack!)}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          cursor: "zoom-in",
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : (
                      <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        Không có ảnh
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "8px",
                      textAlign: "center",
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                      3. Ảnh Selfie cầm CCCD
                    </span>
                    {selectedSubmission.kycDocument?.selfiePhoto ? (
                      <img
                        src={selectedSubmission.kycDocument.selfiePhoto}
                        alt="Ảnh Selfie"
                        onClick={() => setEnlargedImage(selectedSubmission.kycDocument!.selfiePhoto!)}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          cursor: "zoom-in",
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : (
                      <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        Không có ảnh
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Action selection */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>
                    Quyết định phê duyệt:
                  </label>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="reviewAction"
                        value="verified"
                        checked={reviewAction === "verified"}
                        onChange={() => setReviewAction("verified")}
                      />
                      <span style={{ color: "#16a34a", fontWeight: 600 }}>
                        ✓ Phê duyệt (Verified)
                      </span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="reviewAction"
                        value="rejected"
                        checked={reviewAction === "rejected"}
                        onChange={() => setReviewAction("rejected")}
                      />
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>
                        ✗ Từ chối (Rejected)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conditional Fields */}
                {reviewAction === "verified" ? (
                  <div
                    style={{
                      padding: "12px",
                      background: "#f0fdf4",
                      borderRadius: "6px",
                      border: "1px solid #bbf7d0",
                      marginBottom: "16px",
                    }}
                  >
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#15803d" }}>
                      Cộng điểm uy tín cho khách thuê (+{trustScoreBonus} điểm):
                    </label>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      max={100}
                      value={trustScoreBonus}
                      onChange={(e) => setTrustScoreBonus(Number(e.target.value) || 0)}
                      style={{ width: "120px" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginTop: "4px" }}>
                      Khách sau khi xác thực danh tính sẽ được mở quyền đặt thuê các dòng máy giá trị lớn.
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "12px",
                      background: "#fef2f2",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                      marginBottom: "16px",
                    }}
                  >
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", color: "#991b1b" }}>
                      Lý do từ chối hồ sơ (Gửi thông báo tới người dùng):
                    </label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                      {quickRejectReasons.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="button button-quiet"
                          style={{ fontSize: "0.75rem", padding: "3px 6px" }}
                          onClick={() => setRejectionReason(preset)}
                        >
                          + {preset.slice(0, 30)}...
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Nhập lý do cụ thể để người dùng biết và khắc phục..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="ticket-modal-footer">
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={isSubmittingReview}
                  onClick={() => setSelectedSubmission(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`button ${reviewAction === "verified" ? "button-primary" : "button-danger"}`}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview
                    ? "Đang xử lý..."
                    : reviewAction === "verified"
                    ? "Xác nhận duyệt KYC"
                    : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged image preview lightbox */}
      {enlargedImage && (
        <div
          className="ticket-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setEnlargedImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={enlargedImage}
              alt="Ảnh phóng to"
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
              }}
            />
            <button
              type="button"
              className="button button-secondary"
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
              }}
              onClick={() => setEnlargedImage(null)}
            >
              ✕ Đóng ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
