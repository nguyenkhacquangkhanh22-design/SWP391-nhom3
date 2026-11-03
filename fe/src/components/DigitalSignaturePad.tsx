import { useState, useRef, useEffect, useCallback } from "react";
import type { DigitalSignaturePayload, ContractSignature } from "../types/owner";

interface Props {
  initialSignerName?: string;
  initialSignature?: DigitalSignaturePayload | ContractSignature;
  onSignatureChange?: (sig: DigitalSignaturePayload | null) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function DigitalSignaturePad({
  initialSignerName = "",
  initialSignature,
  onSignatureChange,
  disabled = false,
  required = true,
}: Props) {
  const [tab, setTab] = useState<"drawn" | "typed">(
    (initialSignature?.signature_type as "drawn" | "typed") || "drawn"
  );
  const [signerName, setSignerName] = useState(
    initialSignature?.signer_name || initialSignerName || ""
  );
  const [fontChoice, setFontChoice] = useState<number>(0);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(Boolean(initialSignature?.signature_image));
  const [signatureImage, setSignatureImage] = useState<string>(
    initialSignature?.signature_image || ""
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const fontFamilies = [
    "'Brush Script MT', 'Dancing Script', cursive",
    "'Segoe Script', 'Great Vibes', cursive",
    "'Caveat', 'Lucida Handwriting', cursive",
  ];

  // Initialize or clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnStroke(false);
    setSignatureImage("");
  }, []);

  // Sync canvas image when initialSignature is provided
  useEffect(() => {
    if (initialSignature?.signature_image && canvasRef.current && tab === "drawn") {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
          setHasDrawnStroke(true);
        }
      };
      img.src = initialSignature.signature_image;
    }
  }, [initialSignature, tab]);

  // Set up drawing context
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    lastPoint.current = getCanvasCoords(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPoint.current) return;

    const currentPoint = getCanvasCoords(e);
    ctx.strokeStyle = "#1d4ed8"; // Classic legal blue ink
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
    setHasDrawnStroke(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture might already be released
      }
      setSignatureImage(canvas.toDataURL("image/png"));
    }
  };

  // Convert typed name to canvas image if typed
  const generateTypedSignatureImage = useCallback(
    (name: string, fontIndex: number): string => {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = 480;
      offCanvas.height = 160;
      const ctx = offCanvas.getContext("2d");
      if (!ctx) return "";

      ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.fillStyle = "#1d4ed8"; // Ink color
      ctx.font = `italic 38px ${fontFamilies[fontIndex]}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.trim() || "Chữ ký mẫu", 240, 80);

      return offCanvas.toDataURL("image/png");
    },
    []
  );

  // Notify parent of signature changes
  useEffect(() => {
    if (!onSignatureChange) return;

    const trimmedName = signerName.trim();
    if (!trimmedName || !declarationAccepted) {
      onSignatureChange(null);
      return;
    }

    if (tab === "drawn") {
      if (!hasDrawnStroke || !signatureImage) {
        onSignatureChange(null);
        return;
      }
      onSignatureChange({
        signer_name: trimmedName,
        signature_type: "drawn",
        signature_image: signatureImage,
        signature_note: `Chữ ký vẽ tay điện tử của ${trimmedName}`,
        declaration_accepted: declarationAccepted,
      });
    } else {
      const typedImg = generateTypedSignatureImage(trimmedName, fontChoice);
      onSignatureChange({
        signer_name: trimmedName,
        signature_type: "typed",
        signature_image: typedImg,
        signature_note: `Chữ ký số thư pháp điện tử của ${trimmedName}`,
        declaration_accepted: declarationAccepted,
      });
    }
  }, [
    tab,
    signerName,
    hasDrawnStroke,
    signatureImage,
    fontChoice,
    declarationAccepted,
    onSignatureChange,
    generateTypedSignatureImage,
  ]);

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        borderRadius: "14px",
        padding: "18px",
        marginTop: "16px",
      }}
    >
      {/* Title & Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.3rem" }}>✍️</span>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 700,
                color: "#f8fafc",
              }}
            >
              Chữ ký số của Chủ thiết bị (Bên A - Owner)
            </h4>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Xác thực pháp lý hợp đồng điện tử theo Luật Giao dịch điện tử 2023
            </div>
          </div>
        </div>

        <span
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            color: "#34d399",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "0.76rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>🛡️</span> SmartEquip e-Sign Verified
        </span>
      </div>

      {/* Signer Name Input */}
      <div style={{ marginBottom: "14px" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          Họ và tên người ký (Đại diện Bên A) {required && <span style={{ color: "#f87171" }}>*</span>}
        </label>
        <input
          type="text"
          className="input-field"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Nhập đầy đủ Họ và tên của bạn..."
          disabled={disabled}
          style={{
            background: "#090d16",
            border: "1px solid #334155",
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "#fff",
          }}
        />
      </div>

      {/* Tabs: Draw vs Type */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("drawn")}
          disabled={disabled}
          style={{
            background: tab === "drawn" ? "#0284c7" : "transparent",
            color: tab === "drawn" ? "#fff" : "#94a3b8",
            border: "none",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ✍️ Vẽ chữ ký tay (Canvas)
        </button>
        <button
          type="button"
          onClick={() => setTab("typed")}
          disabled={disabled}
          style={{
            background: tab === "typed" ? "#0284c7" : "transparent",
            color: tab === "typed" ? "#fff" : "#94a3b8",
            border: "none",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ⌨️ Ký bằng phông chữ nghệ thuật
        </button>
      </div>

      {/* DRAWN CANVAS MODE */}
      {tab === "drawn" ? (
        <div>
          <div
            style={{
              position: "relative",
              background: "#ffffff",
              borderRadius: "10px",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            <canvas
              ref={canvasRef}
              width={560}
              height={170}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                display: "block",
                width: "100%",
                height: "170px",
                touchAction: "none",
                cursor: disabled ? "not-allowed" : "crosshair",
              }}
            />

            {/* Baseline Guide line */}
            <div
              style={{
                position: "absolute",
                bottom: "35px",
                left: "24px",
                right: "24px",
                borderBottom: "1px dashed #cbd5e1",
                pointerEvents: "none",
              }}
            />

            {!hasDrawnStroke && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  fontSize: "0.86rem",
                  fontStyle: "italic",
                  pointerEvents: "none",
                }}
              >
                🖊️ Dùng chuột hoặc chạm tay vào đây để ký tên...
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Nét ký mực xanh chuẩn pháp lý • Tự động mã hóa thành hình ảnh chữ ký số
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              disabled={disabled || !hasDrawnStroke}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: !hasDrawnStroke || disabled ? "not-allowed" : "pointer",
              }}
            >
              🧹 Xóa nét vẽ để ký lại
            </button>
          </div>
        </div>
      ) : (
        /* TYPED CALLIGRAPHY MODE */
        <div>
          <div style={{ marginBottom: "10px" }}>
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 600 }}>
              Chọn kiểu chữ ký nghệ thuật:
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "8px",
                marginTop: "6px",
              }}
            >
              {fontFamilies.map((font, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFontChoice(idx)}
                  disabled={disabled}
                  style={{
                    background: fontChoice === idx ? "#0f233f" : "#090d16",
                    border: `1px solid ${fontChoice === idx ? "#38bdf8" : "#334155"}`,
                    borderRadius: "8px",
                    padding: "8px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontFamily: font,
                      fontSize: "1.1rem",
                      color: fontChoice === idx ? "#38bdf8" : "#94a3b8",
                      fontStyle: "italic",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {signerName || "Chữ ký mẫu"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                    Kiểu {idx + 1}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "24px 20px",
              textAlign: "center",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
              minHeight: "110px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: fontFamilies[fontChoice],
                fontSize: "2.1rem",
                color: "#1d4ed8",
                fontStyle: "italic",
                letterSpacing: "0.5px",
              }}
            >
              {signerName || "Nguyễn Văn Owner"}
            </div>
            <div
              style={{
                borderTop: "1px dashed #cbd5e1",
                width: "220px",
                marginTop: "10px",
                paddingTop: "4px",
                fontSize: "0.72rem",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Đại diện Bên cho thuê (Bên A)
            </div>
          </div>
        </div>
      )}

      {/* Legal Declaration Checkbox */}
      <div
        style={{
          marginTop: "14px",
          padding: "12px 14px",
          background: "rgba(30, 41, 59, 0.7)",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          borderRadius: "8px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "0.82rem",
            color: "#e2e8f0",
            cursor: "pointer",
            lineHeight: 1.5,
          }}
        >
          <input
            type="checkbox"
            checked={declarationAccepted}
            onChange={(e) => setDeclarationAccepted(e.target.checked)}
            disabled={disabled}
            style={{
              width: "18px",
              height: "18px",
              marginTop: "2px",
              accentColor: "#0284c7",
              cursor: "pointer",
            }}
          />
          <span>
            <strong style={{ color: "#38bdf8" }}>Cam kết trách nhiệm pháp lý:</strong> Bằng việc ký
            tên điện tử này, tôi xác nhận các thông tin thiết bị và điều khoản cho thuê nêu trên là
            chính xác. Chữ ký số này có đầy đủ giá trị pháp lý ràng buộc nghĩa vụ thực hiện hợp đồng
            theo quy định của pháp luật về giao dịch điện tử.
          </span>
        </label>
      </div>

      {/* Status reminder */}
      <div
        style={{
          marginTop: "10px",
          fontSize: "0.76rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {!signerName.trim() ? (
          <span style={{ color: "#f87171" }}>⚠️ Vui lòng nhập Họ và tên người ký.</span>
        ) : tab === "drawn" && !hasDrawnStroke ? (
          <span style={{ color: "#f87171" }}>⚠️ Vui lòng vẽ nét chữ ký vào khung trên.</span>
        ) : !declarationAccepted ? (
          <span style={{ color: "#fb923c" }}>⚠️ Vui lòng tích chọn cam kết trách nhiệm pháp lý.</span>
        ) : (
          <span style={{ color: "#34d399", fontWeight: 600 }}>
            ✅ Chữ ký số đã hợp lệ và sẵn sàng đính kèm vào Hợp đồng.
          </span>
        )}
      </div>
    </div>
  );
}

