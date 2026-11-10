import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import Brand from "../../components/Brand";
import Feedback from "../../components/Feedback";
import { ownerApi } from "../../services/ownerApi";
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

export default function OwnerPortal() {
  const { user, token, signOut } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    | "membership"
    | "overview"
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

  // Inter-tab selections
  const [requestForContract, setRequestForContract] = useState<RentalRequest | null>(null);
  const [contractForHandover, setContractForHandover] = useState<RentalContract | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const paymentReturn = searchParams.get("membership") === "return";

  useEffect(() => {
    if (paymentReturn) setActiveTab("membership");
  }, [paymentReturn]);

  useEffect(() => {
    if (token) {
      void loadAllData(true);
    }
  }, [token]);

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
          <Link to="/equipments" className="button button-quiet" style={{ fontSize: "0.85rem" }}>
            Chợ thiết bị 🔍
          </Link>
          <Link to="/profile" className="button button-secondary" style={{ fontSize: "0.85rem" }}>
            👤 {user?.name || "Hồ sơ"}
          </Link>
          <button
            className="button button-quiet"
            style={{ fontSize: "0.85rem" }}
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
