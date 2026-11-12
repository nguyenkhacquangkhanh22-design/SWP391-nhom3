const Rental = require("../models/Rental");
const AppError = require("../utils/AppError");

/**
 * Khởi tạo instance PayOS với fallback hỗ trợ cả @payos/node v1 và v2
 */
function getPayOS() {
  const PayOSModule = require("@payos/node");
  const PayOS = PayOSModule.PayOS || PayOSModule.default || PayOSModule;

  const clientId =
    process.env.PAYOS_CLIENT_ID || "4cbd12f3-30af-42d3-b8bc-b1f91c2c6197";
  const apiKey =
    process.env.PAYOS_API_KEY || "618a8071-fbc7-4c08-935e-ce0a30d68086";
  const checksumKey =
    process.env.PAYOS_CHECKSUM_KEY ||
    "524799ac41dd5279c9aebeb3b2ad3af3a6f05a88f29a373c80a0862011970609";

  try {
    return new PayOS({ clientId, apiKey, checksumKey });
  } catch (_err) {
    return new PayOS(clientId, apiKey, checksumKey);
  }
}

const paymentController = {
  /**
   * API 1: POST /api/payments/create-payment-link
   * Nhận vào: rentalId, amount, description
   * Gọi PayOS tạo link thanh toán VietQR động
   * Trả về: checkoutUrl, orderCode, paymentLinkId
   */
  async createPaymentLink(req, res) {
    const { rentalId, amount, description } = req.body;

    if (!rentalId) {
      throw new AppError(400, "Vui lòng cung cấp rentalId");
    }

    const mongoose = require("mongoose");
    let rental = null;
    if (mongoose.isValidObjectId(rentalId)) {
      rental = await Rental.findById(rentalId).populate("equipment", "title");
    }
    if (!rental) {
      rental = await Rental.findOne({
        $or: [
          { rentalCode: rentalId },
          { "contract.contractNumber": rentalId },
        ],
      }).populate("equipment", "title");
    }
    if (!rental) {
      const RentalContract = require("../models/RentalContract");
      let rc = null;
      if (mongoose.isValidObjectId(rentalId)) {
        rc = await RentalContract.findById(rentalId).lean();
      }
      if (!rc) {
        rc = await RentalContract.findOne({ contract_code: rentalId }).lean();
      }
      if (rc) {
        rental = await Rental.findOne({
          $or: [
            { "contract.contractNumber": rc.contract_code },
            { renter: rc.renter_id, equipment: rc.equipment_id },
          ],
        }).populate("equipment", "title");
      }
    }

    if (!rental) {
      throw new AppError(404, "Không tìm thấy thông tin đơn thuê");
    }

    const isExtension = Boolean(req.body.isExtension || req.body.type === "extension");
    let payAmount;
    if (isExtension && rental.extensionRequest?.status === "APPROVED") {
      payAmount = Math.round(Number(rental.extensionRequest.extraFee) || Number(amount) || 0);
    } else {
      payAmount = Math.round(
        Number(amount) || rental.totalAmount || rental.rentalFee || 0
      );
    }

    // Làm tròn số tiền đến hàng nghìn để tránh lỗi các ngân hàng (Napas 247) từ chối chuyển khoản tiền lẻ
    if (payAmount > 0 && payAmount % 1000 !== 0) {
      payAmount = Math.ceil(payAmount / 1000) * 1000;
    }
    // Đảm bảo hạn mức tối thiểu 2.000 VNĐ theo chuẩn Napas
    if (payAmount > 0 && payAmount < 2000) {
      payAmount = 2000;
    }

    if (payAmount <= 0) {
      throw new AppError(400, "Số tiền thanh toán phải lớn hơn 0");
    }

    // PayOS yêu cầu orderCode là số nguyên dương an toàn (tối đa 15 chữ số)
    // Sử dụng 6 số cuối timestamp + 4 số ngẫu nhiên
    const orderCode = Number(
      String(Date.now()).slice(-6) + Math.floor(1000 + Math.random() * 9000)
    );

    // PayOS yêu cầu description tối đa 25 ký tự, không dấu, không ký tự đặc biệt
    const rawDesc = description || (isExtension ? `GH ${rental.rentalCode || "DON"}` : `TT ${rental.rentalCode || "SMARTEQUIP"}`);
    const cleanDescription = rawDesc
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .slice(0, 25);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl =
      process.env.PAYOS_RETURN_URL || `${frontendUrl}/payment/success`;
    const cancelUrl =
      process.env.PAYOS_CANCEL_URL || `${frontendUrl}/payment/cancel`;

    const paymentData = {
      orderCode,
      amount: payAmount,
      description: cleanDescription,
      returnUrl,
      cancelUrl,
      items: [
        {
          name: (isExtension ? `Gia han ${rental.equipment?.title || "thiet bi"}` : (rental.equipment?.title || "Thue thiet bi SmartEquip")).slice(
            0,
            50
          ),
          quantity: 1,
          price: payAmount,
        },
      ],
    };

    const payos = getPayOS();
    let paymentLinkRes;

    // Hỗ trợ cả 2 chuẩn API của @payos/node v1 (createPaymentLink) và v2 (paymentRequests.create)
    if (typeof payos.createPaymentLink === "function") {
      paymentLinkRes = await payos.createPaymentLink(paymentData);
    } else if (
      payos.paymentRequests &&
      typeof payos.paymentRequests.create === "function"
    ) {
      paymentLinkRes = await payos.paymentRequests.create(paymentData);
    } else {
      throw new AppError(500, "Không tìm thấy hàm tạo link thanh toán của PayOS");
    }

    // Lưu orderCode và checkoutUrl vào model Rental để đối soát khi Webhook gọi về
    if (isExtension && rental.extensionRequest?.status === "APPROVED") {
      rental.extensionRequest.payosOrderCode = orderCode;
    } else {
      rental.payment = rental.payment || {};
      rental.payment.orderCode = orderCode;
      rental.payment.paymentLinkId =
        paymentLinkRes.paymentLinkId || paymentLinkRes.id;
      rental.payment.checkoutUrl = paymentLinkRes.checkoutUrl;
      rental.payment.paymentMethod = "payos_vietqr";
      if (rental.contract?.moderatorStatus === "approved") {
        rental.contract.moderatorStatus = "moderator_approved";
      }
    }
    await rental.save();

    return res.status(200).json({
      success: true,
      message: "Tạo link thanh toán PayOS thành công",
      orderCode,
      checkoutUrl: paymentLinkRes.checkoutUrl,
      paymentLinkId: paymentLinkRes.paymentLinkId || paymentLinkRes.id,
      qrCode: paymentLinkRes.qrCode,
    });
  },

  /**
   * API 2: POST /api/payments/webhook
   * Đón webhook do PayOS gửi về (thông qua ngrok hoặc live domain)
   * Xác thực chữ ký verifyPaymentWebhookData
   * Tìm đơn hàng theo orderCode/description và cập nhật status = 'PAID'
   * Trả về json({ success: true }) theo chuẩn PayOS
   */
  async webhook(req, res) {
    const payos = getPayOS();
    let webhookData;

    try {
      // Hỗ trợ cả verifyPaymentWebhookData (v1) và webhooks.verify (v2)
      if (typeof payos.verifyPaymentWebhookData === "function") {
        webhookData = payos.verifyPaymentWebhookData(req.body);
      } else if (
        payos.webhooks &&
        typeof payos.webhooks.verify === "function"
      ) {
        webhookData = await payos.webhooks.verify(req.body);
      } else {
        webhookData = req.body?.data || req.body;
      }
    } catch (verifyErr) {
      console.error(
        "PayOS Webhook Signature Verification Failed:",
        verifyErr.message
      );
      return res.status(400).json({
        success: false,
        message: "Chữ ký webhook không hợp lệ (Signature verification failed)",
      });
    }

    if (!webhookData) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu webhook rỗng hoặc không hợp lệ",
      });
    }

    const orderCode = webhookData.orderCode;
    const description = webhookData.description || "";

    // Tìm đơn thuê tương ứng
    let rental = null;
    if (orderCode) {
      rental = await Rental.findOne({
        $or: [
          { "payment.orderCode": orderCode },
          { "extensionRequest.payosOrderCode": orderCode },
        ],
      });
    }

    if (!rental && description) {
      rental = await Rental.findOne({
        $or: [
          { rentalCode: description.trim() },
          { "contract.contractNumber": description.trim() },
        ],
      });

      if (!rental) {
        const match = description.match(/REQ[0-9A-Z-]+/i);
        if (match) {
          rental = await Rental.findOne({
            rentalCode: new RegExp(match[0], "i"),
          });
        }
      }
    }

    if (rental) {
      // Trường hợp: Thanh toán phụ phí gia hạn đơn thuê đã được Owner duyệt
      if (
        rental.extensionRequest &&
        rental.extensionRequest.payosOrderCode === Number(orderCode) &&
        rental.extensionRequest.status === "APPROVED"
      ) {
        rental.extensionRequest.status = "PAID";
        rental.extensionRequest.paidAt = new Date();

        const extraDays = rental.extensionRequest.extraDays;
        const extraFee = rental.extensionRequest.extraFee;
        const previousEndDate = rental.extensionRequest.currentEndDate || rental.endDate;
        const newEndDate = rental.extensionRequest.newEndDate;

        rental.endDate = newEndDate;
        rental.totalDays = (rental.totalDays || 0) + extraDays;
        rental.rentalFee = (rental.rentalFee || 0) + extraFee;
        rental.totalAmount = (rental.totalAmount || 0) + extraFee;

        if (!Array.isArray(rental.extensions)) {
          rental.extensions = [];
        }
        rental.extensions.push({
          extendedAt: new Date(),
          extraDays,
          extraFee,
          previousEndDate,
          newEndDate,
          note: rental.extensionRequest.note,
        });

        await rental.save();
        await rental.populate("equipment owner renter");

        const ownerId = rental.owner?._id || rental.owner;
        const renterId = rental.renter?._id || rental.renter;
        const renterName = rental.renter?.name || "Khách thuê";
        const equipmentTitle = rental.equipment?.title || "Thiết bị";

        try {
          const User = require("../models/User");
          const ownerUser = await User.findById(ownerId);
          if (ownerUser) {
            ownerUser.walletBalance = (ownerUser.walletBalance || 0) + extraFee;
            if (!Array.isArray(ownerUser.walletTransactions)) {
              ownerUser.walletTransactions = [];
            }
            ownerUser.walletTransactions.push({
              type: "rental_income",
              amount: extraFee,
              rentalId: rental._id,
              description: `Thu nhập gia hạn (${extraDays} ngày) đơn thuê #${rental.rentalCode}`,
              createdAt: new Date(),
            });
            await ownerUser.save();
          }
        } catch (wErr) {
          console.warn("Cộng ví owner gia hạn lỗi:", wErr?.message);
        }

        try {
          const UserNotification = require("../models/UserNotification");
          await UserNotification.create({
            user_id: ownerId,
            title: `💰 Khách đã thanh toán gia hạn #${rental.rentalCode}`,
            message: `Khách thuê ${renterName} đã quét mã VietQR PayOS chuyển thành công ${extraFee.toLocaleString("vi-VN")} đ phí gia hạn thêm ${extraDays} ngày cho thiết bị "${equipmentTitle}". Số dư ví của bạn đã được cộng tự động!`,
            related_record_id: rental._id,
          });
          await UserNotification.create({
            user_id: renterId,
            title: `🎉 Gia hạn đơn thuê thành công #${rental.rentalCode}`,
            message: `Thanh toán gia hạn thành công! Hạn trả máy mới của bạn là: ${rental.returnTime || "17:00"} ngày ${new Date(newEndDate).toLocaleDateString("vi-VN")}.`,
            related_record_id: rental._id,
          });
        } catch (nErr) {}

        try {
          const { getIO } = require("../config/socket");
          const io = getIO();
          io.emit("rental:extended", {
            rentalId: rental._id,
            rentalCode: rental.rentalCode,
            status: rental.status,
            newEndDate,
            extraDays,
            extraFee,
          });
        } catch (sErr) {}

        return res.status(200).json({ success: true, message: "Extension payment processed successfully" });
      }

      const isCancelled = String(rental.status).toUpperCase() === "CANCELLED";
      if (isCancelled) {
        // Đơn đã hủy mà khách vẫn chuyển tiền -> Chuyển sang chế độ hoàn tiền refund_pending
        rental.payment = rental.payment || {};
        rental.payment.isPaid = true;
        rental.payment.paidAt = new Date();
        rental.payment.paymentStatus = "refund_pending";
        rental.payment.amountPaid =
          webhookData.amount || rental.totalAmount || rental.rentalFee;
        rental.payment.transactionId =
          webhookData.reference ||
          webhookData.paymentLinkId ||
          String(orderCode);
        rental.cancellation = rental.cancellation || {
          reason: "Khách quét mã thanh toán sau khi đơn đã bị hủy",
          cancelledAt: new Date(),
        };
        rental.cancellation.refundInfo = rental.cancellation.refundInfo || {
          refundAmount: webhookData.amount || rental.totalAmount || rental.rentalFee,
          status: "pending",
          note: "Thanh toán tự động ghi nhận trên đơn đã hủy. Hệ thống xếp vào danh sách hoàn tiền.",
        };
        await rental.save();

        try {
          const { getIO } = require("../config/socket");
          const io = getIO();
          io.emit("payment:refund_pending", {
            rentalId: rental._id,
            rentalCode: rental.rentalCode,
            status: "CANCELLED",
            message: `Đơn thuê #${rental.rentalCode} đã bị hủy. Hệ thống đã tiếp nhận và đang xử lý hoàn tiền.`,
          });
        } catch (e) {}

        return res.status(200).json({ success: true, message: "Order cancelled, marked for refund" });
      }

      // Cập nhật trạng thái đơn thành 'PAID' theo đúng yêu cầu
      const wasAlreadyPaid = Boolean(rental.payment?.isPaid && rental.status === "PAID");
      rental.status = "PAID";
      rental.payment = rental.payment || {};
      rental.payment.isPaid = true;
      rental.payment.paidAt = new Date();
      rental.payment.paymentStatus = "paid";
      rental.payment.paymentMethod = "payos_vietqr";
      rental.payment.amountPaid =
        webhookData.amount || rental.totalAmount || rental.rentalFee;
      rental.payment.transactionId =
        webhookData.reference ||
        webhookData.paymentLinkId ||
        String(orderCode);
      await rental.save();

      // Nạp đầy đủ thông tin thiết bị, chủ máy, người thuê
      await rental.populate("equipment owner renter");

      const ownerId = rental.owner?._id || rental.owner;
      const renterId = rental.renter?._id || rental.renter;
      const renterName = rental.renter?.name || "Khách thuê";
      const equipmentTitle = rental.equipment?.title || "Thiết bị";
      const paidAmount =
        Number(rental.payment.amountPaid) ||
        Number(rental.totalAmount) ||
        Number(rental.rentalFee) ||
        0;

      // Cộng tiền vào walletBalance của Owner (Ví trung gian)
      if (!wasAlreadyPaid && ownerId) {
        try {
          const User = require("../models/User");
          if (paidAmount > 0) {
            const ownerUser = await User.findById(ownerId);
            const balanceBefore = ownerUser ? (ownerUser.walletBalance || 0) : 0;
            const updatedOwner = await User.findByIdAndUpdate(
              ownerId,
              { $inc: { walletBalance: paidAmount } },
              { new: true }
            );
            const balanceAfter = updatedOwner ? updatedOwner.walletBalance : balanceBefore + paidAmount;

            // Ghi nhận lịch sử biến động số dư (UC_OWNER_08)
            try {
              const walletTransactionService = require("../services/walletTransactionService");
              await walletTransactionService.recordTransaction({
                ownerId,
                type: "RENTAL_INCOME",
                direction: "IN",
                amount: paidAmount,
                balanceBefore,
                balanceAfter,
                referenceId: rental._id,
                referenceModel: "Rental",
                referenceCode: rental.rentalCode || `#${rental._id.toString().slice(-6)}`,
                description: `Nhận thanh toán tiền thuê từ đơn #${rental.rentalCode} (${equipmentTitle})`,
                status: "SUCCESS",
                metadata: {
                  renterName,
                  equipmentTitle,
                  rentalCode: rental.rentalCode,
                },
              });
            } catch (txnErr) {
              console.warn("Ghi nhận biến động số dư ví thất bại:", txnErr.message);
            }
          }
        } catch (walletErr) {
          console.warn("Cộng tiền ví trung gian cho Owner thất bại:", walletErr.message);
        }

        // Tạo thông báo lưu trữ trong DB cho Owner
        try {
          const UserNotification = require("../models/UserNotification");
          await UserNotification.create({
            user_id: ownerId,
            title: `💰 Tiền đã về ví! Khách chuyển tiền đơn #${rental.rentalCode}`,
            message: `Khách thuê ${renterName} đã quét mã VietQR chuyển thành công ${paidAmount.toLocaleString("vi-VN")} đ cho thiết bị "${equipmentTitle}". Số dư ví của bạn đã được cộng tự động!`,
            related_record_id: rental._id,
          });

          if (renterId) {
            await UserNotification.create({
              user_id: renterId,
              title: `✅ Thanh toán VietQR thành công đơn #${rental.rentalCode}`,
              message: `Hệ thống đã nhận được ${paidAmount.toLocaleString("vi-VN")} đ cho thiết bị "${equipmentTitle}". Bạn đã sẵn sàng nhận bàn giao thiết bị!`,
              related_record_id: rental._id,
            });
          }
        } catch (notifErr) {
          console.warn("Tạo thông báo thanh toán thất bại:", notifErr.message);
        }
      }

      // Bắn Socket.IO realtime để client Renter & Owner nhận thông báo tức thì
      try {
        const { getIO } = require("../config/socket");
        const io = getIO();
        const toastData = {
          rentalId: rental._id,
          rentalCode: rental.rentalCode,
          equipmentTitle,
          renterName,
          amount: paidAmount,
          ownerId: String(ownerId || ""),
          renterId: String(renterId || ""),
          orderCode,
          status: "PAID",
          title: "💰 TIỀN ĐÃ VỀ VÍ! KHÁCH CHUYỂN TIỀN THÀNH CÔNG",
          message: `Khách thuê ${renterName} vừa thanh toán thành công ${paidAmount.toLocaleString("vi-VN")} đ cho đơn #${rental.rentalCode} ("${equipmentTitle}")!`,
          link: "/owner",
          createdAt: new Date(),
        };
        io.emit("payment:approved", toastData);
        io.emit("payment:success_owner", toastData);
      } catch (socketErr) {
        console.warn("Socket emit error on webhook:", socketErr?.message);
      }

      // Gửi Email thông báo thanh toán thành công
      try {
        const populatedRental = await Rental.findById(rental._id).populate("renter equipment");
        if (populatedRental?.renter?.email) {
          const { sendRentalEmailNotification } = require("../utils/sendEmailNotification");
          sendRentalEmailNotification({
            to: populatedRental.renter.email,
            subject: `✅ Xác nhận thanh toán thành công đơn thuê #${rental.rentalCode} - SmartEquip`,
            htmlText: `
              <h2>Thanh toán thành công!</h2>
              <p>Xin chào <b>${populatedRental.renter.name}</b>,</p>
              <p>Hệ thống SmartEquip đã nhận đủ số tiền <b>${(rental.payment.amountPaid || rental.totalAmount).toLocaleString("vi-VN")} đ</b> cho đơn thuê <b>#${rental.rentalCode}</b>.</p>
              <p><b>Thiết bị:</b> ${populatedRental.equipment?.title || "Thiết bị điện tử"}</p>
              <p><b>Thời gian thuê:</b> Từ ngày ${new Date(rental.startDate).toLocaleDateString("vi-VN")} đến ngày ${new Date(rental.endDate).toLocaleDateString("vi-VN")}</p>
              <p>Chủ máy đang chuẩn bị thiết bị để bàn giao đúng hẹn cho bạn.</p>
              <br/>
              <p>Trân trọng,<br/>Đội ngũ SmartEquip</p>
            `,
          }).catch(() => {});
        }
      } catch (emailErr) {}
    } else {
      // Kiểm tra xem có phải đơn thanh toán gói thành viên Owner Membership không
      try {
        const ownerMembershipService = require("../services/ownerMembershipService");
        const membershipOrder = await ownerMembershipService.activatePaidOrder(orderCode, {
          transaction_ref: webhookData.reference || String(orderCode),
          payos_response: webhookData,
        });
        if (membershipOrder) {
          console.log(`PayOS Webhook: Đã kích hoạt gói cước hội viên cho orderCode ${orderCode}`);
          return res.status(200).json({ success: true, type: "membership" });
        }
      } catch (memErr) {
        console.warn("PayOS Webhook: activate membership order error:", memErr.message);
      }

      console.warn(
        `PayOS Webhook: Không tìm thấy đơn thuê cho orderCode: ${orderCode}, description: ${description}`
      );
    }

    // Trả về response đúng chuẩn yêu cầu của PayOS
    return res.status(200).json({ success: true });
  },

  /**
   * API 3: GET /api/payments/verify/:orderCode
   * Tra cứu trạng thái thanh toán trực tiếp từ PayOS SDK và tự động duyệt đơn sang 'PAID'
   * Giúp tự động cập nhật ngay cả khi không dùng ngrok/webhook trên localhost
   */
  async verifyPayment(req, res) {
    const { orderCode } = req.params;
    if (!orderCode) {
      throw new AppError(400, "Vui lòng cung cấp orderCode");
    }

    const payos = getPayOS();
    let paymentInfo;

    try {
      if (
        payos.paymentRequests &&
        typeof payos.paymentRequests.get === "function"
      ) {
        paymentInfo = await payos.paymentRequests.get(Number(orderCode));
      } else if (typeof payos.getPaymentLinkInformation === "function") {
        paymentInfo = await payos.getPaymentLinkInformation(Number(orderCode));
      } else {
        throw new Error("Không tìm thấy hàm tra cứu PayOS");
      }
    } catch (err) {
      console.error("Lỗi tra cứu PayOS:", err.message);
      return res.status(400).json({
        success: false,
        message: `Lỗi tra cứu PayOS: ${err.message}`,
      });
    }

    if (!paymentInfo) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin đơn hàng trên PayOS",
      });
    }

    let rental = await Rental.findOne({
      $or: [
        { "payment.orderCode": Number(orderCode) },
        { "extensionRequest.payosOrderCode": Number(orderCode) },
      ],
    });

    if (!rental && paymentInfo.id) {
      rental = await Rental.findOne({
        "payment.paymentLinkId": paymentInfo.id,
      });
    }

    if (rental && paymentInfo.status === "PAID") {
      // Trường hợp: Thanh toán phụ phí gia hạn
      if (
        rental.extensionRequest &&
        rental.extensionRequest.payosOrderCode === Number(orderCode) &&
        rental.extensionRequest.status !== "PAID"
      ) {
        rental.extensionRequest.status = "PAID";
        rental.extensionRequest.paidAt = new Date();

        const extraDays = rental.extensionRequest.extraDays;
        const extraFee = rental.extensionRequest.extraFee;
        const previousEndDate = rental.extensionRequest.currentEndDate || rental.endDate;
        const newEndDate = rental.extensionRequest.newEndDate;

        rental.endDate = newEndDate;
        rental.totalDays = (rental.totalDays || 0) + extraDays;
        rental.rentalFee = (rental.rentalFee || 0) + extraFee;
        rental.totalAmount = (rental.totalAmount || 0) + extraFee;

        if (!Array.isArray(rental.extensions)) {
          rental.extensions = [];
        }
        rental.extensions.push({
          extendedAt: new Date(),
          extraDays,
          extraFee,
          previousEndDate,
          newEndDate,
          note: rental.extensionRequest.note,
        });

        await rental.save();
        await rental.populate("equipment owner renter");

        const ownerId = rental.owner?._id || rental.owner;
        const renterId = rental.renter?._id || rental.renter;

        try {
          const User = require("../models/User");
          const ownerUser = await User.findById(ownerId);
          if (ownerUser) {
            ownerUser.walletBalance = (ownerUser.walletBalance || 0) + extraFee;
            if (!Array.isArray(ownerUser.walletTransactions)) {
              ownerUser.walletTransactions = [];
            }
            ownerUser.walletTransactions.push({
              type: "rental_income",
              amount: extraFee,
              rentalId: rental._id,
              description: `Thu nhập gia hạn (${extraDays} ngày) đơn thuê #${rental.rentalCode}`,
              createdAt: new Date(),
            });
            await ownerUser.save();
          }
        } catch (wErr) {}

        try {
          const { getIO } = require("../config/socket");
          const io = getIO();
          io.emit("rental:extended", {
            rentalId: rental._id,
            rentalCode: rental.rentalCode,
            status: rental.status,
            newEndDate,
            extraDays,
            extraFee,
          });
        } catch (sErr) {}

        return res.status(200).json({
          success: true,
          data: paymentInfo,
          rentalStatus: rental.status,
          message: `Thanh toán gia hạn thành công! Hạn trả máy mới: ${rental.returnTime || "17:00"} ngày ${new Date(newEndDate).toLocaleDateString("vi-VN")}.`,
        });
      }
      const isCancelled = String(rental.status).toUpperCase() === "CANCELLED";
      if (isCancelled) {
        rental.payment = rental.payment || {};
        rental.payment.isPaid = true;
        rental.payment.paidAt = rental.payment.paidAt || new Date();
        rental.payment.paymentStatus = "refund_pending";
        rental.payment.amountPaid =
          paymentInfo.amountPaid || paymentInfo.amount || rental.totalAmount;
        rental.cancellation = rental.cancellation || {
          reason: "Khách quét mã thanh toán sau khi đơn đã bị hủy",
          cancelledAt: new Date(),
        };
        rental.cancellation.refundInfo = rental.cancellation.refundInfo || {
          refundAmount: paymentInfo.amountPaid || paymentInfo.amount || rental.totalAmount,
          status: "pending",
          note: "Thanh toán tự động ghi nhận trên đơn đã hủy. Hệ thống xếp vào danh sách hoàn tiền.",
        };
        await rental.save();
        return res.status(200).json({
          success: true,
          data: paymentInfo,
          rentalStatus: "CANCELLED",
          message: "Đơn thuê đã bị hủy. Khoản thanh toán đã được chuyển sang chế độ hoàn tiền.",
        });
      }

      const wasAlreadyPaid = Boolean(rental.payment?.isPaid && rental.status === "PAID");
      rental.status = "PAID";
      rental.payment = rental.payment || {};
      rental.payment.isPaid = true;
      rental.payment.paidAt = rental.payment.paidAt || new Date();
      rental.payment.paymentStatus = "paid";
      rental.payment.paymentMethod = "payos_vietqr";
      rental.payment.amountPaid =
        paymentInfo.amountPaid || paymentInfo.amount || rental.totalAmount;
      if (paymentInfo.transactions && paymentInfo.transactions.length > 0) {
        rental.payment.transactionId =
          paymentInfo.transactions[0].reference || paymentInfo.id;
      }
      await rental.save();

      // Nạp đầy đủ thông tin thiết bị, chủ máy, người thuê
      await rental.populate("equipment owner renter");

      const ownerId = rental.owner?._id || rental.owner;
      const renterId = rental.renter?._id || rental.renter;
      const renterName = rental.renter?.name || "Khách thuê";
      const equipmentTitle = rental.equipment?.title || "Thiết bị";
      const paidAmount =
        Number(rental.payment.amountPaid) ||
        Number(rental.totalAmount) ||
        Number(rental.rentalFee) ||
        0;

      // Cộng tiền vào walletBalance của Owner (Ví trung gian)
      if (!wasAlreadyPaid && ownerId) {
        try {
          const User = require("../models/User");
          if (paidAmount > 0) {
            const ownerUser = await User.findById(ownerId);
            const balanceBefore = ownerUser ? (ownerUser.walletBalance || 0) : 0;
            const updatedOwner = await User.findByIdAndUpdate(
              ownerId,
              { $inc: { walletBalance: paidAmount } },
              { new: true }
            );
            const balanceAfter = updatedOwner ? updatedOwner.walletBalance : balanceBefore + paidAmount;

            // Ghi nhận lịch sử biến động số dư (UC_OWNER_08)
            try {
              const walletTransactionService = require("../services/walletTransactionService");
              await walletTransactionService.recordTransaction({
                ownerId,
                type: "RENTAL_INCOME",
                direction: "IN",
                amount: paidAmount,
                balanceBefore,
                balanceAfter,
                referenceId: rental._id,
                referenceModel: "Rental",
                referenceCode: rental.rentalCode || `#${rental._id.toString().slice(-6)}`,
                description: `Nhận thanh toán tiền thuê từ đơn #${rental.rentalCode} (${equipmentTitle})`,
                status: "SUCCESS",
                metadata: {
                  renterName,
                  equipmentTitle,
                  rentalCode: rental.rentalCode,
                },
              });
            } catch (txnErr) {
              console.warn("Ghi nhận biến động số dư ví thất bại:", txnErr.message);
            }
          }
        } catch (walletErr) {
          console.warn("Cộng tiền ví trung gian cho Owner thất bại:", walletErr.message);
        }

        // Tạo thông báo lưu trữ trong DB cho Owner
        try {
          const UserNotification = require("../models/UserNotification");
          await UserNotification.create({
            user_id: ownerId,
            title: `💰 Tiền đã về ví! Khách chuyển tiền đơn #${rental.rentalCode}`,
            message: `Khách thuê ${renterName} đã quét mã VietQR PayOS chuyển thành công ${paidAmount.toLocaleString("vi-VN")} đ cho thiết bị "${equipmentTitle}". Số dư ví của bạn đã được cộng tự động!`,
            related_record_id: rental._id,
          });

          if (renterId) {
            await UserNotification.create({
              user_id: renterId,
              title: `✅ Thanh toán VietQR thành công đơn #${rental.rentalCode}`,
              message: `Hệ thống đã nhận được ${paidAmount.toLocaleString("vi-VN")} đ cho thiết bị "${equipmentTitle}". Bạn đã sẵn sàng nhận bàn giao thiết bị!`,
              related_record_id: rental._id,
            });
          }
        } catch (notifErr) {
          console.warn("Tạo thông báo thanh toán thất bại:", notifErr.message);
        }
      }

      try {
        const { getIO } = require("../config/socket");
        const io = getIO();
        const toastData = {
          rentalId: rental._id,
          rentalCode: rental.rentalCode,
          equipmentTitle,
          renterName,
          amount: paidAmount,
          ownerId: String(ownerId || ""),
          renterId: String(renterId || ""),
          orderCode,
          status: "PAID",
          title: "💰 TIỀN ĐÃ VỀ VÍ! KHÁCH CHUYỂN TIỀN THÀNH CÔNG",
          message: `Khách thuê ${renterName} vừa thanh toán thành công ${paidAmount.toLocaleString("vi-VN")} đ cho đơn #${rental.rentalCode} ("${equipmentTitle}")!`,
          link: "/owner",
          createdAt: new Date(),
        };
        io.emit("payment:approved", toastData);
        io.emit("payment:success_owner", toastData);
      } catch (socketErr) {
        console.warn("Socket emit error on verifyPayment:", socketErr?.message);
      }

      // Gửi Email thông báo thanh toán thành công
      try {
        const populatedRental = await Rental.findById(rental._id).populate("renter equipment");
        if (populatedRental?.renter?.email) {
          const { sendRentalEmailNotification } = require("../utils/sendEmailNotification");
          sendRentalEmailNotification({
            to: populatedRental.renter.email,
            subject: `✅ Xác nhận thanh toán thành công đơn thuê #${rental.rentalCode} - SmartEquip`,
            htmlText: `
              <h2>Thanh toán thành công!</h2>
              <p>Xin chào <b>${populatedRental.renter.name}</b>,</p>
              <p>Hệ thống SmartEquip đã nhận đủ số tiền <b>${(rental.payment.amountPaid || rental.totalAmount).toLocaleString("vi-VN")} đ</b> cho đơn thuê <b>#${rental.rentalCode}</b>.</p>
              <p><b>Thiết bị:</b> ${populatedRental.equipment?.title || "Thiết bị điện tử"}</p>
              <p>Chủ máy đang chuẩn bị thiết bị để bàn giao cho bạn.</p>
              <br/>
              <p>Trân trọng,<br/>Đội ngũ SmartEquip</p>
            `,
          }).catch(() => {});
        }
      } catch (emailErr) {}
    }

    return res.status(200).json({
      success: true,
      data: paymentInfo,
      rentalStatus: rental?.status || "UNKNOWN",
    });
  },
};

module.exports = paymentController;

