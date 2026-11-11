import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { ownerApi } from "../../services/ownerApi";
import type { OwnerMembershipOverview } from "../../types/owner";

interface Props {
  token: string;
  membership: OwnerMembershipOverview | null;
  setMembership: Dispatch<SetStateAction<OwnerMembershipOverview | null>>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function membershipStatus(status: string) {
  if (status === "active") return "Đang hoạt động";
  if (status === "pending_payment") return "Chờ thanh toán";
  if (status === "extended") return "Đã gia hạn";
  if (status === "expired") return "Đã hết hạn";
  return "Thanh toán thất bại";
}

export default function OwnerMembershipTab({
  token,
  membership,
  setMembership,
  onError,
  onSuccess,
}: Props) {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("orderCode");
  const paymentReturn = searchParams.get("membership") === "return";
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    if (!paymentReturn || !orderCode || !token) return;

    let cancelled = false;
    async function checkPayment() {
      setPaymentMessage("Đang xác nhận giao dịch với PayOS...");
      try {
        for (let attempt = 0; attempt < 15; attempt += 1) {
          const { order } = await ownerApi.getMembershipOrder(token, orderCode!);
          if (cancelled) return;

          if (order.status === "active" || order.status === "extended") {
            setMembership(await ownerApi.getMembership(token));
            setPaymentMessage("Thanh toán thành công. Membership đã được kích hoạt.");
            return;
          }
          if (order.status === "failed" || order.status === "expired") {
            setPaymentMessage("Giao dịch chưa hoàn tất. Bạn có thể chọn gói và thanh toán lại.");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (!cancelled) {
          setPaymentMessage("PayOS chưa gửi xác nhận. Hãy tải lại sau ít phút để cập nhật trạng thái.");
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentMessage(error instanceof Error ? error.message : "Không kiểm tra được trạng thái giao dịch.");
        }
      }
    }

    void checkPayment();
    return () => {
      cancelled = true;
    };
  }, [orderCode, paymentReturn, setMembership, token]);

  async function handleStartTrial() {
    setIsStartingTrial(true);
    try {
      const result = await ownerApi.startMembershipTrial(token);
      setMembership(await ownerApi.getMembership(token));
      onSuccess(result.message);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không thể kích hoạt gói dùng thử.");
    } finally {
      setIsStartingTrial(false);
    }
  }

  async function handleCheckout(plan: string) {
    setCheckoutPlan(plan);
    try {
      const result = await ownerApi.createMembershipCheckout(token, plan);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không thể tạo thanh toán PayOS.");
      setCheckoutPlan("");
    }
  }

  const current = membership?.current;
  const plans = membership?.plans.filter((plan) => plan.id !== "trial_7d") || [];

  return (
    <section className="owner-contracts-list">
      {paymentMessage && (
        <div className="owner-section-card" role="status">
          {paymentMessage}
        </div>
      )}

      <div className="owner-section-card">
        <h2 style={{ marginTop: 0 }}>Membership cho Người cho thuê</h2>
        <p style={{ color: "var(--muted)" }}>
          Cần có membership còn hạn để tạo bài đăng hoặc đưa thiết bị trở lại công khai.
          Khi gói hết hạn, các bài đăng đang công khai sẽ tự động được ẩn.
        </p>
        {current ? (
          <div style={{ borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", padding: 14 }}>
            <strong style={{ color: "#6ee7b7" }}>Membership đang hoạt động</strong>
            <div style={{ marginTop: 6, color: "#cbd5e1" }}>
              Hết hạn: {dateTime(current.expires_at)}
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 10, background: "rgba(245, 158, 11, 0.1)", padding: 14, color: "#fcd34d" }}>
            Chưa có membership còn hạn. Đăng ký gói để mở khóa đăng bài cho thuê.
          </div>
        )}
      </div>

      {!membership?.hasUsedTrial && (
        <article className="owner-section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: "0 0 6px", color: "#fff" }}>Dùng thử miễn phí 7 ngày</h3>
              <p style={{ margin: 0, color: "var(--muted)" }}>Mỗi Owner được kích hoạt một lần.</p>
            </div>
            <button
              type="button"
              className="button button-primary"
              disabled={isStartingTrial || Boolean(current)}
              onClick={() => void handleStartTrial()}
            >
              {isStartingTrial ? "Đang kích hoạt..." : current ? "Đang có membership" : "Kích hoạt dùng thử"}
            </button>
          </div>
        </article>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {plans.map((plan) => (
          <article key={plan.id} className="owner-section-card">
            <h3 style={{ marginTop: 0, color: "#fff" }}>{plan.name}</h3>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--orange)" }}>
              {plan.amount.toLocaleString("vi-VN")} đ
            </div>
            <p style={{ color: "var(--muted)" }}>
              Có hiệu lực nối tiếp sau membership còn hạn hiện tại.
            </p>
            <button
              type="button"
              className="button button-primary"
              disabled={checkoutPlan !== ""}
              onClick={() => void handleCheckout(plan.id)}
            >
              {checkoutPlan === plan.id ? "Đang chuyển tới PayOS..." : "Chọn gói"}
            </button>
          </article>
        ))}
      </div>

      <div className="owner-section-card">
        <h3 style={{ marginTop: 0, color: "#fff" }}>Lịch sử membership</h3>
        {!membership?.orders.length ? (
          <p style={{ color: "var(--muted)" }}>Chưa có giao dịch membership.</p>
        ) : (
          <div className="owner-table-wrapper">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Gói</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Thời hạn</th>
                  <th>Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody>
                {membership.orders.map((order) => (
                  <tr key={order._id}>
                    <td>{membership.plans.find((plan) => plan.id === order.plan)?.name || order.plan}</td>
                    <td>{order.amount.toLocaleString("vi-VN")} đ</td>
                    <td>{membershipStatus(order.status)}</td>
                    <td>{dateTime(order.started_at)} — {dateTime(order.expires_at)}</td>
                    <td>{dateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
