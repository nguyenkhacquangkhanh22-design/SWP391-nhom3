import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import Feedback from "../../components/Feedback";
import { ownerApi } from "../../services/ownerApi";
import { authApi } from "../../services/authApi";
import { getSocket } from "../../services/socket";
import type { UserNotification } from "../../types/auth";
import type {
  Equipment,
  RentalRequest,
  RentalContract,
  OwnerStats,
  OwnerMembershipOverview,
} from "../../types/owner";

import OwnerOverviewTab from "./OwnerOverviewTab";
import OwnerEquipmentsTab from "./OwnerEquipmentsTab";
import OwnerRequestsTab from "./OwnerRequestsTab";
import OwnerContractsTab from "./OwnerContractsTab";
import OwnerHandoverTab from "./OwnerHandoverTab";
import OwnerSettlementTab from "./OwnerSettlementTab";
import OwnerDisputesTab from "./OwnerDisputesTab";
import OwnerSupportTab from "./OwnerSupportTab";
import OwnerMembershipTab from "./OwnerMembershipTab";
import OwnerWallet from "../../components/owner/OwnerWallet";

export default function OwnerPortal() {
  const { user, token, signOut } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    | "membership"
    | "overview"
    | "wallet"
    | "equipments"
    | "requests"
    | "contracts"
    | "handover"
    | "settlement"
    | "disputes"
    | "support"
  >("overview");

  // State data
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<RentalRequest[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [membership, setMembership] = useState<OwnerMembershipOverview | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Inter-tab selections
  const [requestForContract, setRequestForContract] = useState<RentalRequest | null>(null);
  const [contractForHandover, setContractForHandover] = useState<RentalContract | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<{
    renterName: string;
    equipmentTitle: string;
    rentalCode: string;
    totalAmount?: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const paymentReturn = searchParams.get("membership") === "return";

  useEffect(() => {
    if (paymentReturn) setActiveTab("membership");
  }, [paymentReturn]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await authApi.getNotifications(token);
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch { }
  };

  useEffect(() => {
    if (token) {
      void loadAllData(true);
      void fetchNotifications();
    }
  }, [token]);

  function playNewOrderBell() {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => { });
      }

      const now = ctx.currentTime;
      // 4 nốt chuông ngân vang vui tươi báo đơn mới (C5, E5, G5, C6)
      const pitches = [523.25, 659.25, 783.99, 1046.5];
      pitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.13);
        gain.gain.setValueAtTime(0, now + idx * 0.13);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.13 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.13 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.13);
        osc.stop(now + idx * 0.13 + 0.65);
      });
    } catch (e) {
      console.warn("Autoplay audio blocked:", e);
    }
  }

  useEffect(() => {
    const socket = getSocket();
    const handleLivePayment = () => {
      void fetchNotifications();
      void loadAllData(false);
    };

    const handleNewRental = (data: any) => {
      playNewOrderBell();
      if (data && (data.renterName || data.equipmentTitle || data.rentalCode)) {
        setNewOrderAlert({
          renterName: data.renterName || "Khách thuê SmartEquip",
          equipmentTitle: data.equipmentTitle || "Thiết bị",
          rentalCode: data.rentalCode || "",
          totalAmount: data.totalAmount,
        });
      }
      void fetchNotifications();
      void loadAllData(false);
    };

    const handleRentalReturned = (data: any) => {
      const currentUserId = (user as any)?._id || (user as any)?.id;
      if (data?.ownerId && currentUserId && String(data.ownerId) !== String(currentUserId)) {
        return;
      }
      playNewOrderBell();
      setSuccess(`📦 Khách thuê vừa gửi yêu cầu trả thiết bị #${data?.rentalCode || ""}! Vui lòng kiểm tra và nghiệm thu.`);
      void fetchNotifications();
      void loadAllData(false);
    };

    socket.on("payment:approved", handleLivePayment);
    socket.on("payment:submitted", handleLivePayment);
    socket.on("payment:success_owner", handleLivePayment);
    socket.on("rental:created", handleNewRental);
    socket.on("notification:new_rental", handleNewRental);
    socket.on("rental:approved", handleLivePayment);
    socket.on("rental:returned", handleRentalReturned);

    return () => {
      socket.off("payment:approved", handleLivePayment);
      socket.off("payment:submitted", handleLivePayment);
      socket.off("payment:success_owner", handleLivePayment);
      socket.off("rental:created", handleNewRental);
      socket.off("notification:new_rental", handleNewRental);
      socket.off("rental:approved", handleLivePayment);
      socket.off("rental:returned", handleRentalReturned);
    };
  }, [token]);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read_at);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    try {
      await authApi.markNotificationRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch { }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    const unread = notifications.filter((n) => !n.read_at);
    for (const n of unread) {
      try {
        await authApi.markNotificationRead(token, n._id);
      } catch { }
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  async function loadAllData(showSpinner = false) {
    if (!token) return;
    if (showSpinner) setIsLoading(true);
    try {
      const [overviewData, equipmentsData, requestsData, contractsData, membershipData] =
        await Promise.all([
          ownerApi.getOverview(token).catch(() => ({ stats: null, recentRequests: [] })),
          ownerApi.getEquipments(token).catch(() => ({ equipments: [] })),
          ownerApi.getRentalRequests(token).catch(() => ({ requests: [] })),
          ownerApi.getContracts(token).catch(() => ({ contracts: [] })),
          ownerApi.getMembership(token).catch((err) => {
            setError(err instanceof Error ? err.message : "Không thể tải trạng thái membership.");
            return null;
          }),
        ]);

      setStats(overviewData.stats);
      setRecentRequests(overviewData.recentRequests || []);
      setEquipments(equipmentsData.equipments || []);
      setRequests(requestsData.requests || []);
      setContracts(contractsData.contracts || []);
      setMembership(membershipData);
      if (!membershipData?.current) {
        setActiveTab((currentTab) => currentTab === "overview" ? "membership" : currentTab);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }

  function handleTabChange(tab: typeof activeTab) {
    if (tab !== "contracts") {
      setRequestForContract(null);
    }
    setActiveTab(tab);
    setError("");
    setSuccess("");
  }

  function handleOpenHandover(con: RentalContract) {
    setContractForHandover(con);
    handleTabChange("handover");
  }

  const approvedRequests = requests.filter((r) => r.status === "approved");

  return (
    <div className="owner-portal-layout">
      {/* Top Navbar */}
      <header className="owner-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Brand compact />
          <span className="owner-badge">CỔNG NGƯỜI CHO THUÊ • OWNER</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Nút chuông thông báo Realtime cho Owner */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="button button-quiet"
              style={{
                position: "relative",
                padding: "6px 12px",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              title="Thông báo đơn thuê & Tiền về ví"
            >
              🔔
              {unreadNotifs.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: "bold",
                    borderRadius: "999px",
                    padding: "1px 6px",
                    lineHeight: "14px",
                    border: "2px solid #0b101b",
                  }}
                >
                  {unreadNotifs.length > 9 ? "9+" : unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "380px",
                  maxHeight: "460px",
                  overflowY: "auto",
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  boxShadow:
                    "0 20px 35px -5px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.05)",
                  zIndex: 99999,
                  padding: "0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid #1f2937",
                    background: "#0f172a",
                  }}
                >
                  <strong style={{ fontSize: "0.92rem", color: "#f8fafc" }}>
                    🔔 Thông báo Owner ({unreadNotifs.length} mới)
                  </strong>
                  {unreadNotifs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllRead()}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#38bdf8",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Đã đọc tất cả
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "28px 16px",
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      Chưa có thông báo nào.
                    </div>
                  ) : (
                    notifications.slice(0, 30).map((n) => {
                      const isUnread = !n.read_at;
                      return (
                        <div
                          key={n._id}
                          onClick={() => {
                            if (isUnread) void handleMarkRead(n._id);
                            if (
                              n.title.includes("Ví") ||
                              n.title.includes("tiền") ||
                              n.message.includes("chuyển")
                            ) {
                              handleTabChange("wallet");
                            } else if (n.title.includes("Hợp đồng")) {
                              handleTabChange("contracts");
                            }
                            setShowNotifDropdown(false);
                          }}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #1e293b",
                            background: isUnread
                              ? "rgba(56, 189, 248, 0.08)"
                              : "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "8px",
                            }}
                          >
                            {isUnread && (
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "50%",
                                  background: "#38bdf8",
                                  marginTop: "6px",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.86rem",
                                  fontWeight: isUnread ? 700 : 500,
                                  color: isUnread ? "#f8fafc" : "#cbd5e1",
                                  marginBottom: "4px",
                                }}
                              >
                                {n.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--muted)",
                                  lineHeight: 1.45,
                                  marginBottom: "4px",
                                }}
                              >
                                {n.message}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#64748b",
                                }}
                              >
                                {new Date(n.createdAt).toLocaleString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/equipments"
            className="button button-quiet"
            style={{
              fontSize: "0.85rem",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "7px 14px",
            }}
          >
            Chợ thiết bị 🔍
          </Link>
          <Link
            to="/profile"
            className="button button-secondary"
            style={{
              fontSize: "0.85rem",
              borderRadius: "10px",
              padding: "7px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤</span>
            <span style={{ fontWeight: 600 }}>{user?.name || "Hồ sơ"}</span>
          </Link>
          <button
            className="button button-quiet"
            style={{
              fontSize: "0.85rem",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "7px 14px",
            }}
            onClick={() => void signOut()}
          >
            Đăng xuất ↗
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="owner-container">
        {/* Navigation Tabs Bar */}
        <div className="owner-tabs-nav">
          <button
            className={`owner-tab-btn ${activeTab === "membership" ? "active" : ""}`}
            onClick={() => handleTabChange("membership")}
          >
            💳 Membership {!membership?.current && <span className="tab-badge-alert" style={{ marginLeft: 8 }}>Cần đăng ký</span>}
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => handleTabChange("overview")}
          >
            📊 Tổng quan
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "wallet" ? "active" : ""}`}
            onClick={() => handleTabChange("wallet")}
          >
            💳 Ví & Rút tiền
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "equipments" ? "active" : ""}`}
            onClick={() => handleTabChange("equipments")}
          >
            📦 Thiết bị ({equipments.length})
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => handleTabChange("requests")}
          >
            📬 Yêu cầu thuê
            {stats && stats.pendingRequests > 0 && (
              <span className="badge-count">{stats.pendingRequests}</span>
            )}
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "contracts" ? "active" : ""}`}
            onClick={() => handleTabChange("contracts")}
          >
            📝 Hợp đồng thuê ({contracts.length})
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "handover" ? "active" : ""}`}
            onClick={() => handleTabChange("handover")}
          >
            🤝 Bàn giao & Kiểm tra
            {requests.filter((r) => ["returned", "return_requested"].includes(String(r.status || "").toLowerCase())).length > 0 && (
              <span
                className="badge-count"
                style={{ background: "#9333ea", marginLeft: "6px" }}
                title="Có đơn hoàn trả thiết bị cần đối chiếu & nghiệm thu"
              >
                {requests.filter((r) => ["returned", "return_requested"].includes(String(r.status || "").toLowerCase())).length} trả
              </span>
            )}
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "settlement" ? "active" : ""}`}
            onClick={() => handleTabChange("settlement")}
          >
            💰 Quyết toán & Doanh thu
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "disputes" ? "active" : ""}`}
            onClick={() => handleTabChange("disputes")}
          >
            ⚖️ Khiếu nại
          </button>
          <button
            className={`owner-tab-btn ${activeTab === "support" ? "active" : ""}`}
            onClick={() => handleTabChange("support")}
          >
            🎫 Hỗ trợ
          </button>
        </div>

        {/* Global Feedback Banners */}
        {error && <Feedback message={error} />}
        {success && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              borderRadius: "10px",
              color: "#6ee7b7",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              style={{ background: "none", border: "none", color: "#6ee7b7", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Realtime New Order Sound & Banner Alert */}
        {newOrderAlert && (
          <div
            style={{
              background: "linear-gradient(90deg, #1e3a8a 0%, #065f46 100%)",
              border: "1px solid #34d399",
              borderRadius: "12px",
              padding: "14px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 6px 24px rgba(16, 185, 129, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.8rem" }}>🔔</span>
              <div>
                <strong style={{ color: "#fff", fontSize: "0.98rem", display: "block" }}>
                  BẠN VỪA CÓ ĐƠN THUÊ MỚI {newOrderAlert.rentalCode ? `#${newOrderAlert.rentalCode}` : ""}!
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#a7f3d0", marginTop: "2px" }}>
                  Khách thuê <strong>{newOrderAlert.renterName}</strong> vừa đặt thuê "
                  <strong>{newOrderAlert.equipmentTitle}</strong>"
                  {newOrderAlert.totalAmount ? ` (${newOrderAlert.totalAmount.toLocaleString("vi-VN")} đ)` : ""}.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                className="button button-primary"
                style={{
                  width: "auto",
                  minHeight: "38px",
                  padding: "0 16px",
                  fontSize: "0.84rem",
                  background: "#10b981",
                  color: "#fff",
                  fontWeight: "bold",
                }}
                onClick={() => {
                  setActiveTab("requests");
                  setNewOrderAlert(null);
                }}
              >
                👉 Xem & Duyệt đơn ngay
              </button>
              <button
                type="button"
                className="button button-quiet"
                style={{ width: "auto", minHeight: "38px", padding: "0 12px", color: "#cbd5e1" }}
                onClick={() => setNewOrderAlert(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tab Content Display */}
        {isLoading ? (
          <div className="app-loading" style={{ margin: "60px auto" }}>
            Đang tải dữ liệu cổng Người cho thuê...
          </div>
        ) : (
          <>
            {activeTab === "membership" && (
              <OwnerMembershipTab
                token={token || ""}
                membership={membership}
                setMembership={setMembership}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}

            {activeTab === "overview" && (
              <OwnerOverviewTab
                stats={stats}
                recentRequests={recentRequests}
                onNavigateTab={(tab) => handleTabChange(tab as any)}
                onSelectRequest={(req) => { setRequestForContract(req); handleTabChange("contracts"); }}
              />
            )}

            {activeTab === "wallet" && (
              <OwnerWallet />
            )}

            {activeTab === "equipments" && (
              <OwnerEquipmentsTab
                equipments={equipments}
                token={token || ""}
                membershipActive={Boolean(membership?.current)}
                onMembershipRequired={() => handleTabChange("membership")}
                onRefresh={() => void loadAllData(false)}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}

            {activeTab === "requests" && (
              <OwnerRequestsTab
                requests={requests}
                token={token || ""}
                onRefresh={() => void loadAllData(false)}
                onError={setError}
                onSuccess={setSuccess}
                onCreateContract={(req) => {
                  setRequestForContract(req);
                  setActiveTab("contracts");
                }}
                onSwitchToHandoverTab={() => handleTabChange("handover")}
              />
            )}

            {activeTab === "contracts" && (
              <OwnerContractsTab
                contracts={contracts}
                approvedRequests={approvedRequests}
                token={token || ""}
                onRefresh={() => void loadAllData(false)}
                onError={setError}
                onSuccess={setSuccess}
                initialSelectedRequest={requestForContract}
                onOpenHandoverTab={handleOpenHandover}
              />
            )}

            {activeTab === "handover" && (
              <OwnerHandoverTab
                contracts={contracts}
                token={token || ""}
                onError={setError}
                onSuccess={setSuccess}
                selectedContract={contractForHandover}
                onRefreshContracts={() => void loadAllData(false)}
                requests={requests}
              />
            )}

            {activeTab === "settlement" && (
              <OwnerSettlementTab
                token={token || ""}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}

            {activeTab === "disputes" && (
              <OwnerDisputesTab
                contracts={contracts}
                token={token || ""}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}

            {activeTab === "support" && (
              <OwnerSupportTab
                token={token || ""}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
