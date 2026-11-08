const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");
const { getIO } = require("../config/socket");

async function getConversation(req, res) {
  const currentUserId = req.user._id;
  const { otherUserId, rentalId } = req.query;

  const query = {};

  if (rentalId) {
    query.rental_id = rentalId;

    // Tự động kiểm tra: Nếu đơn thuê đã APPROVED mà chưa có hợp đồng trong chat, tự động tạo ngay để khách coi
    try {
      const hasContract = await ChatMessage.exists({
        rental_id: rentalId,
        message_type: "contract",
      });

      if (!hasContract) {
        const Rental = require("../models/Rental");
        const rental = await Rental.findById(rentalId).populate("equipment owner renter");
        const upperStatus = String(rental?.status || "").toUpperCase();
        if (
          rental &&
          (upperStatus === "APPROVED" ||
            upperStatus === "CONTRACT_SIGNED" ||
            upperStatus === "PAYMENT_PENDING" ||
            upperStatus === "PAID") &&
          rental.owner &&
          rental.renter
        ) {
          const ownerId = rental.owner._id || rental.owner;
          const renterId = rental.renter._id || rental.renter;
          const contractNumber =
            rental.contract?.contractNumber || `HD-${rental.rentalCode}`;
          const equipmentTitle = rental.equipment?.title || "Thiết bị điện tử";
          const totalAmount = rental.totalAmount || rental.rentalFee || 0;

          await ChatMessage.create({
            sender: ownerId,
            receiver: renterId,
            rental_id: rental._id,
            message: `Đã gửi bản hợp đồng điện tử #${contractNumber}`,
            message_type: "contract",
            contract_data: {
              contract_number: contractNumber,
              rental_code: rental.rentalCode,
              equipment_title: equipmentTitle,
              rental_id: rental._id,
              total_amount: totalAmount,
              status: rental.status,
              is_signed: Boolean(
                rental.contract?.termsAccepted ||
                  rental.contract?.signedAt ||
                  rental.contract?.digitalSignature
              ),
            },
          });

          await ChatMessage.create({
            sender: ownerId,
            receiver: renterId,
            rental_id: rental._id,
            message: `Chào bạn! Tôi đã kiểm tra và phê duyệt yêu cầu thuê #${rental.rentalCode}. Hợp đồng dự thảo đã được gửi ở trên, bạn hãy xem qua điều khoản và bấm "Đồng ý ký HĐ" khi thống nhất nhé!`,
            message_type: "text",
          });
        }
      }
    } catch (autoErr) {
      console.warn("Auto populate contract in getConversation error:", autoErr.message);
    }
  } else if (otherUserId) {
    query.$or = [
      { sender: currentUserId, receiver: otherUserId },
      { sender: otherUserId, receiver: currentUserId },
    ];
  } else {
    // If neither is passed, find all conversations where user is sender or receiver
    query.$or = [{ sender: currentUserId }, { receiver: currentUserId }];
  }

  const messages = await ChatMessage.find(query)
    .populate("sender", "name email role avatarUrl")
    .populate("receiver", "name email role avatarUrl")
    .populate("rental_id", "rentalCode status contract totalAmount equipment")
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  res.json({
    success: true,
    data: messages,
  });
}

async function uploadChatImage(req, res) {
  if (!req.file) {
    throw new AppError(400, "Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP)");
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: imageUrl,
    filename: req.file.filename,
  });
}

async function sendMessage(req, res) {
  const currentUserId = req.user._id;
  const { receiverId, rentalId, message, messageType = "text", fileUrl, imageUrl, contractData } = req.body;

  if (!receiverId) {
    throw new AppError(400, "Receiver ID is required");
  }

  const effectiveFileUrl = fileUrl || imageUrl || "";

  if (messageType === "text" && (!message || !message.trim())) {
    throw new AppError(400, "Message cannot be empty");
  }

  if (messageType === "image" && !effectiveFileUrl && (!message || !message.trim())) {
    throw new AppError(400, "Vui lòng đính kèm hình ảnh để gửi");
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new AppError(404, "Receiver not found");
  }

  const newChat = new ChatMessage({
    sender: currentUserId,
    receiver: receiverId,
    rental_id: rentalId || undefined,
    message: message ? message.trim() : (messageType === "image" ? "[Hình ảnh]" : ""),
    message_type: messageType,
    file_url: effectiveFileUrl || (message && (message.startsWith("/uploads/") || message.startsWith("data:image")) ? message : ""),
    contract_data: contractData || undefined,
  });

  await newChat.save();

  const populated = await ChatMessage.findById(newChat._id)
    .populate("sender", "name email role avatarUrl")
    .populate("receiver", "name email role avatarUrl")
    .populate("rental_id", "rentalCode status contract totalAmount equipment")
    .lean();

  // Socket.IO real-time emission
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${receiverId}`).emit("chat:new_message", populated);
      if (rentalId) {
        io.to(`rental:${rentalId}`).emit("chat:new_message", populated);
      }
    }
  } catch (socketErr) {
    // Non-blocking
  }

  // Create lightweight in-app notification for receiver
  try {
    if (UserNotification) {
      const senderName = req.user.name || "Người dùng";
      const previewText = messageType === "contract"
        ? `Đã gửi bản hợp đồng điện tử`
        : messageType === "image"
        ? `📷 Đã gửi một hình ảnh${message && message !== "[Hình ảnh]" ? `: ${message.slice(0, 40)}` : ""}`
        : message.slice(0, 80);

      await UserNotification.create({
        user_id: receiverId,
        title: `💬 Tin nhắn mới từ ${senderName}`,
        message: `${previewText}`,
        related_record_id: rentalId || newChat._id,
      });
    }
  } catch (notifyErr) {
    // Non-blocking
  }

  res.status(201).json({
    success: true,
    data: populated,
  });
}

async function markAsRead(req, res) {
  const currentUserId = req.user._id;
  const { senderId, rentalId } = req.body;

  const query = { receiver: currentUserId, is_read: false };
  if (senderId) query.sender = senderId;
  if (rentalId) query.rental_id = rentalId;

  await ChatMessage.updateMany(query, { $set: { is_read: true } });

  res.json({
    success: true,
    message: "Marked as read",
  });
}

module.exports = {
  getConversation,
  sendMessage,
  uploadChatImage,
  markAsRead,
};

