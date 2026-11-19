export default function Feedback({
  message,
  type = "error",
  onClose,
}: {
  message: string;
  type?: "error" | "success";
  onClose?: () => void;
}) {
  if (!message) return null;
  return (
    <div
      className={`feedback feedback-${type}`}
      role="status"
      aria-live="polite"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1 }}>
        <span aria-hidden="true">{type === "success" ? "✓" : "!"}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            fontSize: "1rem",
            opacity: 0.7,
            padding: "2px 6px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
