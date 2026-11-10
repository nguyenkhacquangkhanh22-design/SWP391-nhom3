const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");
const { getIO } = require("../config/socket");

async function getConversation(req, res) {
  const currentUserId = req.user._id;
  const { otherUserId, rentalId } = req.query;

  // Thu thập tất cả các ID liên quan (Rental._id, RentalContract._id, RentalRequest._id)
  let allRentalIds = [];
  if (rentalId) {
    allRentalIds.push(rentalId);
    try {
      const Rental = require("../models/Rental");
      const RentalContract = require("../models/RentalContract");
      const RentalRequest = require("../models/RentalRequest");

      if (mongoose.isValidObjectId(rentalId)) {
        const rentalDoc = await Rental.findById(rentalId).lean();
        if (rentalDoc) {
          allRentalIds.push(rentalDoc._id.toString());
          if (rentalDoc.contract?.contractNumber) {
            const rc = await RentalContract.findOne({ contract_code: rentalDoc.contract.contractNumber }).lean();
            if (rc) allRentalIds.push(rc._id.toString());
          }
          if (rentalDoc.rentalCode) {
            const rq = await RentalRequest.findOne({ request_code: rentalDoc.rentalCode }).lean();
            if (rq) allRentalIds.push(rq._id.toString());
          }
        } else {
          // rentalId có thể là RentalContract ID
          const rc = await RentalContract.findById(rentalId).lean();
          if (rc) {
            allRentalIds.push(rc._id.toString());
            const [rDoc, rq] = await Promise.all([
              Rental.findOne({
                $or: [
                  { "contract.contractNumber": rc.contract_code },
                  { renter: rc.renter_id, equipment: rc.equipment_id },
                ],
              }).lean(),
              rc.request_id ? RentalRequest.findById(rc.request_id).lean() : null,
            ]);
            if (rDoc) allRentalIds.push(rDoc._id.toString());
            if (rq) allRentalIds.push(rq._id.toString());
          } else {
            // rentalId có thể là RentalRequest ID
            const rq = await RentalRequest.findById(rentalId).lean();
            if (rq) {
              allRentalIds.push(rq._id.toString());
              const [rDoc, rcDoc] = await Promise.all([
                Rental.findOne({
                  $or: [
                    { rentalCode: rq.request_code },
                    { renter: rq.renter_id, equipment: rq.equipment_id },
                  ],
                }).lean(),
                RentalContract.findOne({ request_id: rq._id }).lean(),
              ]);
              if (rDoc) allRentalIds.push(rDoc._id.toString());
              if (rcDoc) allRentalIds.push(rcDoc._id.toString());
            }
          }
        }
      }
    } catch (e) {
      console.warn("Resolve rental IDs error:", e.message);
    }
  }

  // Lọc trùng ID
  allRentalIds = Array.from(new Set(allRentalIds.filter(Boolean)));

  let query = {};
  if (otherUserId) {
    const userPairFilter = {
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    };

    if (allRentalIds.length > 0) {
      query = {
        $or: [
          userPairFilter,
          { rental_id: { $in: allRentalIds } },
        ],
      };
    } else {
      query = userPairFilter;
    }
  } else if (allRentalIds.length > 0) {
    query = { rental_id: { $in: allRentalIds } };
  } else {
    query = {
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    };
  }

  // Tự động kiểm tra: Nếu đơn thuê đã APPROVED mà chưa có hợp đồng trong chat, tự động tạo ngay để khách coi
  if (allRentalIds.length > 0) {
    try {
      const hasContract = await ChatMessage.exists({
        rental_id: { $in: allRentalIds },
        message_type: "contract",
      });

      if (!hasContract) {
        const Rental = require("../models/Rental");
        const rental = await Rental.findOne({ _id: { $in: allRentalIds } }).populate("equipment owner renter");
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
        }
      }
    } catch (autoErr) {
      console.warn("Auto populate contract in getConversation error:", autoErr.message);
    }
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

  let receiver = null;
  if (mongoose.isValidObjectId(receiverId)) {
    receiver = await User.findById(receiverId);
  }
  if (!receiver) {
    receiver = await User.findOne({ $or: [{ User_Id: receiverId }, { email: receiverId }] });
  }
  if (!receiver) {
    throw new AppError(404, "Không tìm thấy người nhận tin nhắn");
  }

  const targetReceiverId = receiver._id;

  // Giải quyết rentalId về Rental document ID nếu có thể
  let effectiveRentalId = undefined;
  if (rentalId && mongoose.isValidObjectId(rentalId)) {
    try {
      const Rental = require("../models/Rental");
      const exists = await Rental.exists({ _id: rentalId });
      if (exists) {
        effectiveRentalId = rentalId;
      } else {
        const RentalContract = require("../models/RentalContract");
        const rc = await RentalContract.findById(rentalId).lean();
        if (rc) {
          const matchingRental = await Rental.findOne({
            $or: [
              { "contract.contractNumber": rc.contract_code },
              { renter: rc.renter_id, equipment: rc.equipment_id },
            ],
          }).lean();
          if (matchingRental) effectiveRentalId = matchingRental._id;
          else effectiveRentalId = rentalId;
        } else {
          effectiveRentalId = rentalId;
        }
      }
    } catch (e) {
      effectiveRentalId = rentalId;
    }
  }

  const newChat = new ChatMessage({
    sender: currentUserId,
    receiver: targetReceiverId,
    rental_id: effectiveRentalId,
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
      io.to(`user:${targetReceiverId}`).emit("chat:new_message", populated);
      io.to(`user:${currentUserId}`).emit("chat:new_message", populated);
      if (rentalId) {
        io.to(`rental:${rentalId}`).emit("chat:new_message", populated);
      }
      if (effectiveRentalId && String(effectiveRentalId) !== String(rentalId)) {
        io.to(`rental:${effectiveRentalId}`).emit("chat:new_message", populated);
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
        user_id: targetReceiverId,
        title: `💬 Tin nhắn mới từ ${senderName}`,
        message: `${previewText}`,
        related_record_id: effectiveRentalId || newChat._id,
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

