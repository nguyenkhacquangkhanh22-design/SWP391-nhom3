import { Link } from "react-router-dom";

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand${compact ? " brand-compact" : ""}`} to="/">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="m16 3.5 11 6.25v12.5L16 28.5 5 22.25V9.75L16 3.5Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="m5.5 10 10.5 6 10.5-6M16 16v12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span className="brand-name">SMARTEQUIP</span>
    </Link>
  );
}
