import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from "react";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
}

/**
 * Nén và đọc file ảnh sang Base64 chuẩn bị nộp KYC
 */
async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn một file hình ảnh hợp lệ (JPG, PNG, WEBP)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lỗi khi đọc file ảnh."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Không thể xử lý hình ảnh này."));
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUploadField({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  hint,
  placeholder = "https://.../photo.jpg",
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value && !value.startsWith("data:") ? value : "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);

  // Đồng bộ urlDraft khi value thay đổi từ ngoài
  useEffect(() => {
    if (value && !value.startsWith("data:")) {
      setUrlDraft(value);
    } else if (!value) {
      setUrlDraft("");
    }
    setImageLoadError(false);
  }, [value]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setImageLoadError(false);
    setIsProcessing(true);
    try {
      const dataUrl = await processImageFile(file);
      onChange(dataUrl);
      setShowUrlInput(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi tải ảnh lên.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleApplyUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      setErrorMsg("Vui lòng nhập đường dẫn liên kết ảnh.");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:")) {
      setErrorMsg("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setErrorMsg("");
    setImageLoadError(false);
    onChange(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyUrl();
    }
  }

  function handleClear() {
    onChange("");
    setUrlDraft("");
    setErrorMsg("");
    setImageLoadError(false);
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-semibold text-slate-300 flex items-center gap-1">
          {label}
          {required ? (
            <span className="text-rose-400 font-bold flex items-center gap-0.5">
              * <span className="text-[11px] font-medium text-rose-400">(Bắt buộc)</span>
            </span>
          ) : (
            <span className="text-[11px] font-normal text-slate-500">(Tùy chọn)</span>
          )}
        </label>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
        className="hidden"
      />

      {/* Error message */}
      {errorMsg && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg("")} className="text-rose-300 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Khi ĐÃ có ảnh được chọn hoặc nhập thành công */}
      {value ? (
        <div className="border border-[#2a3852] bg-[#131b2c] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative group shrink-0">
            {imageLoadError ? (
              <div className="w-24 h-20 sm:w-28 sm:h-20 rounded-lg border border-rose-500/40 bg-rose-950/20 flex flex-col items-center justify-center p-1 text-center">
                <span className="text-base">⚠️</span>
                <span className="text-[9px] text-rose-400 mt-1 leading-tight">Link ảnh lỗi</span>
              </div>
            ) : (
              <img
                src={value}
                alt={label}
                onError={() => setImageLoadError(true)}
                className="w-24 h-20 sm:w-28 sm:h-20 object-cover rounded-lg border border-[#303f5c] bg-[#0c1322] shadow"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5 text-left w-full sm:w-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                imageLoadError
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {imageLoadError ? "✕ Lỗi hiển thị" : "✓ Đã tải ảnh lên"}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={value}>
                {value.startsWith("data:") ? "Ảnh tải từ máy tính" : value}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="px-2.5 py-1 bg-[#1e2a42] hover:bg-[#283858] disabled:opacity-50 text-slate-200 border border-[#354668] rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
              >
                <span>📷</span> Chọn ảnh khác
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={disabled}
                className="px-2.5 py-1 bg-[#1e2a42] hover:bg-[#283858] disabled:opacity-50 text-slate-300 border border-[#354668] rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
              >
                <span>🔗</span> Đổi link URL
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={disabled || isProcessing}
                className="px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600/20 disabled:opacity-50 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
              >
                <span>🗑️</span> Xóa
              </button>
            </div>

            {showUrlInput && (
              <div className="pt-2 flex gap-1.5">
                <input
                  type="url"
                  placeholder={placeholder}
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  className="flex-1 bg-[#1b253b] border border-[#2d3a54] rounded-lg px-2.5 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={disabled}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-[11px] transition-all whitespace-nowrap"
                >
                  Áp dụng
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Khi CHƯA có ảnh */
        <div className="space-y-2">
          {/* Ô icon máy ảnh để click chọn file từ máy */}
          <div
            onClick={() => {
              if (!disabled && !isProcessing) {
                fileInputRef.current?.click();
              }
            }}
            className={`group border-2 border-dashed rounded-xl py-4 px-4 text-center cursor-pointer transition-all ${
              disabled
                ? "border-[#202a3c] bg-[#101724] opacity-60 cursor-not-allowed"
                : "border-[#2b3a54] hover:border-orange-500/60 bg-[#141d2e] hover:bg-[#182338]"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#1b253b] group-hover:bg-orange-500/20 text-orange-400 border border-[#2e3d5a] group-hover:border-orange-500/40 flex items-center justify-center transition-all group-hover:scale-105 shadow-sm">
                {isProcessing ? (
                  <span className="text-xl animate-spin">⏳</span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 group-hover:text-orange-400 transition-colors">
                  {isProcessing ? "Đang xử lý ảnh..." : "Bấm vào để chọn ảnh từ thiết bị"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hỗ trợ JPG, PNG, WEBP (tự động tối ưu dung lượng)
                </p>
              </div>
            </div>
          </div>

          {/* Nút bấm chuyển đổi dán link ảnh */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] text-slate-400 hover:text-orange-400 underline underline-offset-2 transition-colors"
            >
              {showUrlInput ? "Ẩn nhập link ảnh" : "Hoặc dán liên kết ảnh (URL)"}
            </button>
          </div>

          {/* Ô nhập liên kết URL với nút Áp dụng để người dùng nhập hoàn tất */}
          {showUrlInput && (
            <div className="p-2.5 rounded-xl bg-[#121926] border border-[#232e42] space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder={placeholder}
                  value={urlDraft}
                  onChange={(e) => {
                    setUrlDraft(e.target.value);
                    setErrorMsg("");
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  className="flex-1 bg-[#1b253b] border border-[#2d3a54] rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={disabled || !urlDraft.trim()}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-all whitespace-nowrap shadow shadow-orange-600/20"
                >
                  Áp dụng
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Nhập hoặc dán URL ảnh đầy đủ rồi bấm <strong>Áp dụng</strong> (hoặc nhấn Enter) để xem trước
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
