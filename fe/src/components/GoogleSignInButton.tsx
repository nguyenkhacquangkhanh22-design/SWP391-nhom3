import { useEffect, useRef, useState } from "react";
import type { GoogleCredentialResponse } from "../types/auth";

const GOOGLE_SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let active = true;
    const renderButton = () => {
      if (!active || !buttonRef.current || !window.google?.accounts.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => {
          void onCredential(response.credential).catch((error: unknown) => {
            onError(
              error instanceof Error ? error.message : "Đăng nhập Google thất bại.",
            );
          });
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: Math.max(260, Math.min(360, buttonRef.current.clientWidth)),
      });
      setReady(true);
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_URL}"]`,
    );
    if (window.google?.accounts.id) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener("load", renderButton, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      script.onerror = () => onError("Không tải được dịch vụ đăng nhập Google.");
      document.head.appendChild(script);
    }

    return () => {
      active = false;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return (
      <p className="google-note">
        Thêm <code>VITE_GOOGLE_CLIENT_ID</code> vào file <code>fe/.env</code> để
        bật đăng nhập Google.
      </p>
    );
  }

  return (
    <div className={`google-button-wrap${ready ? " is-ready" : ""}`}>
      {!ready && <span className="google-loading">Đang tải Google...</span>}
      <div ref={buttonRef} />
    </div>
  );
}
