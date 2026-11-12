import { useRef, useEffect, useState, useCallback } from "react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  lineWidth?: number;
}

export default function SignaturePad({
  onChange,
  width = 500,
  height = 180,
  className = "",
  strokeColor = "#1d4ed8", // Chữ ký mực xanh bút bi chuẩn pháp lý
  lineWidth = 2.5,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const hasStrokeRef = useRef(false);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  }, [strokeColor, lineWidth]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Nền trắng tinh khiết chuẩn tài liệu hợp đồng A4
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Đường kẻ chấm định vị chữ ký màu xám nhạt tinh tế
    ctx.beginPath();
    ctx.strokeStyle = "rgba(203, 213, 225, 0.9)"; // slate-300
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(20, canvas.height - 35);
    ctx.lineTo(canvas.width - 20, canvas.height - 35);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    hasStrokeRef.current = true;
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    hasStrokeRef.current = true;
    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = (e?: React.SyntheticEvent) => {
    if (e && e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && (hasStrokeRef.current || hasSignature)) {
      setHasSignature(true);
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    initCanvas();
    hasStrokeRef.current = false;
    setHasSignature(false);
    setIsDrawing(false);
    onChange(null);
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Khung nền trắng chuẩn giấy ký A4 với viền tinh tế */}
      <div className="relative w-full border-2 border-slate-300 hover:border-blue-500/80 transition-colors rounded-xl overflow-hidden bg-white shadow-md group">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair block bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Floating placeholder label if not signed yet */}
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
            <span className="text-xl">✍️</span>
            <span className="font-semibold text-slate-600">Dùng chuột hoặc ngón tay để vẽ chữ ký của bạn tại đây (Mực xanh)</span>
            <span className="text-[11px] text-slate-400">Nền trắng chuẩn tài liệu pháp lý • Tự động mã hóa nhúng vào hợp đồng</span>
          </div>
        )}

        {/* Clear Button */}
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-600 text-[11px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 z-10"
          >
            <span>🗑️</span>
            <span>Ký lại</span>
          </button>
        )}
      </div>

      <div className="w-full flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          Ký bằng tay (Handwritten Digital Signature - Mực xanh trên nền trắng)
        </span>
        {hasSignature && (
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            ✓ Đã ghi nhận chữ ký tay
          </span>
        )}
      </div>
    </div>
  );
}

