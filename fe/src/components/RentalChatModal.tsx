import { useEffect, useState, useRef } from "react";
import { useAuth } from "../app/AuthProvider";
import { smartEquipApi } from "../services/smartEquipApi";
import type { ChatMessage, Rental } from "../types/smartequip";
import ContractPdfModal from "./ContractPdfModal";
import OwnerEditContractModal from "./OwnerEditContractModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental;
  token?: string;
  currentUserId?: string;
  partnerUser?: {
    _id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
  };
  onViewContract?: (rental: Rental) => void;
}

export default function RentalChatModal({
  isOpen,
  onClose,
  rental,
  token: propToken,
  currentUserId: propCurrentUserId,
  partnerUser: propPartnerUser,
  onViewContract,
}: Props) {
  const auth = useAuth();
  const token = propToken || auth.token || "";
  const currentUserId = propCurrentUserId || (auth.user as any)?._id || (auth.user as any)?.id || "";

  // Quản lý trạng thái đơn thuê cục bộ để cập nhật tức thời khi Owner chỉnh sửa điều khoản
  const [currentRental, setCurrentRental] = useState<Rental>(rental);

  useEffect(() => {
    setCurrentRental(rental);
  }, [rental]);

  // Kiểm tra vai trò Owner
  const isOwnerCurrent =
    String(currentUserId) === String(typeof currentRental.owner === "object" ? currentRental.owner?._id : currentRental.owner) ||
    String(auth.user?.role).toLowerCase() === "owner";

  const partnerUser = propPartnerUser || (isOwnerCurrent
    ? {
        _id: typeof currentRental.renter === "object" ? currentRental.renter?._id : (currentRental.renter as any),
        name: typeof currentRental.renter === "object" ? currentRental.renter?.name : "Khách thuê",
        avatarUrl: typeof currentRental.renter === "object" ? currentRental.renter?.avatarUrl : undefined,
        role: "renter",
      }
    : {
        _id: typeof currentRental.owner === "object" ? currentRental.owner?._id : (currentRental.owner as any),
        name: typeof currentRental.owner === "object" ? currentRental.owner?.name : "Chủ máy",
        avatarUrl: typeof currentRental.owner === "object" ? currentRental.owner?.avatarUrl : undefined,
        role: "owner",
      });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);

  // Gửi ảnh cho 2 phía (Renter & Owner)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await smartEquipApi.getChatMessages(token, {
        rentalId: currentRental._id,
        otherUserId: partnerUser._id,
      });
      setMessages(res.data || []);
      // Mark as read
      smartEquipApi.markChatAsRead(token, {
        senderId: partnerUser._id,
        rentalId: currentRental._id,
      }).catch(() => {});
    } catch (err) {
      console.warn("Fetch chat error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentRental._id, partnerUser._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP...)");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Kích thước ảnh tối đa 15MB");
      return;
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelect(file);
          break;
        }
      }
    }
  };

  const handleCancelImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImageFile) || sending) return;

    const textToSend = inputText.trim();
    const imageFileToSend = selectedImageFile;

    setInputText("");
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSending(true);

    try {
      let uploadedFileUrl: string | undefined = undefined;
      let msgType: "text" | "image" = "text";

      if (imageFileToSend) {
        msgType = "image";
        const uploadRes = await smartEquipApi.uploadChatImage(token, imageFileToSend);
        uploadedFileUrl = uploadRes.url;
      }

      const res = await smartEquipApi.sendChatMessage(token, {
        receiverId: partnerUser._id,
        rentalId: currentRental._id,
        message: textToSend || (msgType === "image" ? "[Hình ảnh]" : ""),
        messageType: msgType,
        fileUrl: uploadedFileUrl,
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSendContract = async () => {
    if (sending) return;
    setSending(true);

    const contractNumber = currentRental.contract?.contractNumber || `HD-${currentRental.rentalCode}`;
    const equipmentTitle = currentRental.equipment?.title || "Thiết bị điện tử";
    const totalAmount = currentRental.totalAmount || currentRental.rentalFee;
    const isSigned = Boolean(currentRental.contract?.termsAccepted || currentRental.contract?.signedAt || currentRental.contract?.digitalSignature);

    try {
      const res = await smartEquipApi.sendChatMessage(token, {
        receiverId: partnerUser._id,
        rentalId: currentRental._id,
        message: `Đã gửi bản hợp đồng điện tử #${contractNumber}`,
        messageType: "contract",
        contractData: {
          contract_number: contractNumber,
          rental_code: currentRental.rentalCode,
          equipment_title: equipmentTitle,
          rental_id: currentRental._id,
          total_amount: totalAmount,
          status: currentRental.status,
          is_signed: isSigned,
        },
      });
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      console.error("Send contract error:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const partnerRoleLabel = partnerUser.role === "owner" ? "Chủ thiết bị (Owner)" : "Khách thuê (Renter)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121927] border border-[#24354f] w-full max-w-xl h-[640px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header - Gọn gàng, đã bỏ nút Sửa HĐ dư thừa */}
        <div className="px-5 py-3.5 bg-[#172235] border-b border-[#24354f] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {partnerUser.avatarUrl ? (
                <img
                  src={partnerUser.avatarUrl}
                  alt={partnerUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-orange-500/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-orange-600/30 border border-orange-500/50 flex items-center justify-center text-orange-400 font-bold text-sm">
                  {partnerUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#172235] rounded-full"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm leading-tight truncate">{partnerUser.name}</h3>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                  {partnerRoleLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                <span>Đơn: <strong className="text-amber-300 font-mono">#{currentRental.rentalCode}</strong></span>
                <span>•</span>
                <span className="truncate">{currentRental.equipment?.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e2c44] transition-all shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d1422]">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              <span className="animate-spin mr-2">⏳</span> Đang tải cuộc trò chuyện...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
              <span className="text-3xl">💬</span>
              <p className="text-xs text-slate-300 font-semibold">Chưa có tin nhắn nào</p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Bạn và đối tác có thể trao đổi tình trạng máy, gửi ảnh thiết bị bằng biểu tượng 📷, hoặc bấm <strong>"Gửi bản hợp đồng"</strong> để thảo luận điều khoản.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = typeof msg.sender === "object" ? msg.sender?._id : msg.sender;
              const isMine = String(senderId) === String(currentUserId);

              return (
                <div
                  key={msg._id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {isMine ? "Bạn" : partnerUser.name} •{" "}
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {msg.message_type === "contract" && msg.contract_data ? (
                    /* Contract Card Component inside Chat */
                    <div className="max-w-sm w-full p-3.5 bg-gradient-to-br from-[#162238] to-[#0f1828] border-2 border-orange-500/50 rounded-2xl shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-[#253754]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">📄</span>
                          <strong className="text-white text-xs uppercase tracking-wide">
                            Hợp Đồng Thuê Thiết Bị
                          </strong>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          msg.contract_data.status === "PAID" || msg.contract_data.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : msg.contract_data.is_signed
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}>
                          {msg.contract_data.status === "PAID" || msg.contract_data.status === "ACTIVE"
                            ? "✓ Đã nhận tiền"
                            : msg.contract_data.is_signed
                            ? "✓ Đã ký tay điện tử"
                            : "Chờ ký / Dự thảo"}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <div className="text-slate-300 font-medium">
                          Số HĐ: <strong className="text-orange-400 font-mono">{msg.contract_data.contract_number}</strong>
                        </div>
                        <div className="text-slate-300 font-medium truncate">
                          Máy: <strong className="text-white">{msg.contract_data.equipment_title}</strong>
                        </div>
                        <div className="text-slate-300 font-medium">
                          Tổng tiền thuê:{" "}
                          <strong className="text-emerald-400">
                            {(msg.contract_data.total_amount || 0).toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#253754] flex gap-2">
                        {/* Nút Xem Hợp Đồng: Mở ContractPdfModal trực tiếp với z-[9999] */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewContract) {
                              onViewContract(currentRental);
                            }
                            setShowPdfModal(true);
                          }}
                          className="flex-1 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <span>📄</span>
                          <span>Xem hợp đồng</span>
                        </button>
                      </div>
                    </div>
                  ) : msg.message_type === "image" || msg.file_url ? (
                    /* Image message bubble for Both Renter & Owner */
                    <div
                      className={`p-2 rounded-2xl max-w-xs sm:max-w-sm shadow-md overflow-hidden ${
                        isMine
                          ? "bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-br-none"
                          : "bg-[#1c273b] border border-[#2b3c59] text-slate-100 rounded-bl-none"
                      }`}
                    >
                      <div className="relative group overflow-hidden rounded-xl bg-black/30 flex items-center justify-center">
                        <img
                          src={msg.file_url || msg.message}
                          alt="Ảnh đính kèm"
                          onClick={() => setPreviewZoomImage(msg.file_url || msg.message)}
                          className="max-h-60 max-w-full w-auto object-contain rounded-xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                          loading="lazy"
                        />
                        <div
                          onClick={() => setPreviewZoomImage(msg.file_url || msg.message)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1.5"
                        >
                          <span>🔍</span>
                          <span>Xem ảnh lớn</span>
                        </div>
                      </div>
                      {msg.message && msg.message !== "[Hình ảnh]" && (
                        <p className="px-1.5 pt-2 pb-0.5 text-xs text-white leading-relaxed break-words font-medium">
                          {msg.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Normal text message */
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-sm leading-relaxed shadow-sm break-words ${
                        isMine
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none"
                          : "bg-[#1c273b] border border-[#2b3c59] text-slate-100 rounded-bl-none"
                      }`}
                    >
                      {msg.message}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Toolbar - Đã bỏ nút Sửa điều khoản HĐ dư thừa */}
        <div className="px-4 py-2 bg-[#141d2d] border-t border-[#212f45] flex items-center justify-between text-xs gap-2">
          {isOwnerCurrent ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Thao tác Chủ máy:</span>
              <button
                type="button"
                onClick={handleSendContract}
                disabled={sending}
                className="px-2.5 py-1 bg-gradient-to-r from-orange-600/30 to-amber-600/30 hover:from-orange-600/50 hover:to-amber-600/50 border border-orange-500/50 text-orange-300 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <span>📄</span>
                <span>Gửi hợp đồng vào chat</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300">
              <span>💬</span>
              <span>Renter có quyền xem hợp đồng và gửi ảnh thiết bị / tin nhắn cho Owner.</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400 shrink-0">Tự động đồng bộ tin nhắn</span>
        </div>

        {/* Image Attachment Preview Banner if selected */}
        {imagePreviewUrl && (
          <div className="px-4 py-2 bg-[#0e1625] border-t border-[#23334d] flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={imagePreviewUrl}
                alt="Xem trước ảnh"
                className="w-10 h-10 object-cover rounded-lg border border-orange-500/50 shrink-0"
              />
              <div className="min-w-0 text-xs">
                <span className="font-semibold text-slate-200 block truncate">
                  {selectedImageFile?.name || "Ảnh đã đính kèm"}
                </span>
                <span className="text-[10px] text-emerald-400">
                  {selectedImageFile ? `${(selectedImageFile.size / 1024).toFixed(0)} KB • Sẵn sàng gửi` : "Ảnh từ clipboard"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelImage}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-950/30 transition-all flex items-center gap-1 shrink-0"
            >
              <span>✕</span>
              <span>Hủy ảnh</span>
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#172235] border-t border-[#24354f] flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* Nút gửi ảnh cho 2 phía (Renter & Owner) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="p-2 bg-[#1b263b] hover:bg-[#253552] text-slate-300 hover:text-orange-400 rounded-xl transition-all border border-[#2b3c59] flex items-center justify-center shrink-0"
            title="Đính kèm ảnh thiết bị / biên lai"
          >
            <span className="text-base">📷</span>
          </button>

          <input
            type="text"
            placeholder={
              selectedImageFile
                ? "Nhập lời nhắn hoặc ghi chú kèm ảnh..."
                : "Nhập tin nhắn..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            disabled={sending}
            className="flex-1 bg-[#0f1624] border border-[#2b3c59] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImageFile) || sending}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
          >
            {sending ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin text-[10px]">⏳</span>
                <span>Gửi...</span>
              </span>
            ) : (
              <>
                <span>Gửi</span>
                <span>➔</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal Xem Hợp đồng PDF - Mở trực tiếp với z-[9999] */}
      {showPdfModal && (
        <ContractPdfModal
          rental={currentRental}
          isOpen={showPdfModal}
          isOwner={isOwnerCurrent}
          onEditContract={() => {
            setShowPdfModal(false);
            setShowEditContractModal(true);
          }}
          onClose={() => setShowPdfModal(false)}
        />
      )}

      {/* Modal Chỉnh Sửa Điều Khoản & Biểu Phí Hợp Đồng Cho Owner */}
      {showEditContractModal && (
        <OwnerEditContractModal
          rental={currentRental}
          token={token}
          isOpen={showEditContractModal}
          onClose={() => setShowEditContractModal(false)}
          onSuccess={(updated) => {
            setCurrentRental(updated);
            setShowEditContractModal(false);
            void fetchMessages(true);
          }}
        />
      )}

      {/* Lightbox xem ảnh lớn khi click vào ảnh trong chat */}
      {previewZoomImage && (
        <div
          className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewZoomImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl border border-slate-700"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewZoomImage}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-1.5 bg-[#1e2a3f] hover:bg-[#283854] text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 transition-all flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Mở ảnh gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewZoomImage(null)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
