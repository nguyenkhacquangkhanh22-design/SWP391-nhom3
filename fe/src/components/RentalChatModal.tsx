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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await smartEquipApi.sendChatMessage(token, {
        receiverId: partnerUser._id,
        rentalId: currentRental._id,
        message: textToSend,
        messageType: "text",
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
        {/* Header */}
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
            {/* Nút Xem HĐ: Sửa lỗi ngắt hàng 2 dòng thành 1 dòng gọn gàng */}
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="px-3 py-1.5 bg-[#1e2c44] hover:bg-[#283b5c] text-orange-400 hover:text-orange-300 text-xs font-semibold rounded-lg border border-[#2c4063] transition-all flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
              title="Xem hợp đồng điện tử"
            >
              <span>📄</span>
              <span>Xem HĐ</span>
            </button>

            {/* Quyền Chủ máy: Nút chỉnh sửa hợp đồng trực tiếp */}
            {isOwnerCurrent && (
              <button
                type="button"
                onClick={() => setShowEditContractModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg border border-blue-400/40 transition-all flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
                title="Chỉnh sửa điều khoản & biểu phí hợp đồng theo thỏa thuận"
              >
                <span>✏️</span>
                <span>Sửa HĐ</span>
              </button>
            )}

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
                Bạn và đối tác có thể trao đổi về tình trạng máy, thời gian nhận trả, hoặc nhấn <strong>"Gửi bản hợp đồng"</strong> bên dưới để thảo luận các điều khoản.
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
                        {/* Nút Xem Hợp Đồng PDF: Mở ContractPdfModal trực tiếp với z-[9999] */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewContract) {
                              onViewContract(currentRental);
                            }
                            setShowPdfModal(true);
                          }}
                          className="flex-1 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1"
                        >
                          <span>🔍</span>
                          <span>Xem Hợp Đồng PDF</span>
                        </button>

                        {/* Chủ máy có nút sửa hợp đồng nhanh ngay trên thẻ */}
                        {isOwnerCurrent && (
                          <button
                            type="button"
                            onClick={() => setShowEditContractModal(true)}
                            className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 shrink-0"
                            title="Sửa điều khoản cho hợp đồng này"
                          >
                            <span>✏️</span>
                            <span>Sửa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Normal text message */
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-sm leading-relaxed shadow-sm ${
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

        {/* Quick Toolbar */}
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
              <button
                type="button"
                onClick={() => setShowEditContractModal(true)}
                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>✏️</span>
                <span>Sửa điều khoản HĐ</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300">
              <span>💬</span>
              <span>Renter có quyền xem hợp đồng. Nếu bạn không đồng ý điều khoản nào, hãy gõ tin nhắn để Owner chỉnh sửa.</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400 shrink-0">Tự động đồng bộ tin nhắn</span>
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#172235] border-t border-[#24354f] flex items-center gap-2">
          <input
            type="text"
            placeholder={isOwnerCurrent ? "Nhập tin nhắn trao đổi hoặc phản hồi điều khoản với khách..." : "Nhắn tin phản hồi hoặc đề xuất sửa điều khoản với Chủ máy..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 bg-[#0f1624] border border-[#2b3c59] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
          >
            <span>Gửi</span>
            <span>➔</span>
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
    </div>
  );
}
