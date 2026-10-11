export default function Feedback({
  message,
  type = "error",
}: {
  message: string;
  type?: "error" | "success";
}) {
  if (!message) return null;
  return (
    <div className={`feedback feedback-${type}`} role="status" aria-live="polite">
      <span aria-hidden="true">{type === "success" ? "✓" : "!"}</span>
      {message}
    </div>
  );
}
