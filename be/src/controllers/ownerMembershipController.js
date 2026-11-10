const ownerMembershipService = require("../services/ownerMembershipService");
const AppError = require("../utils/AppError");

async function getMembership(req, res) {
  res.json(await ownerMembershipService.getMembershipOverview(req.user._id));
}

async function startTrial(req, res) {
  const membership = await ownerMembershipService.startTrial(req.user._id);
  res.status(201).json({
    message: "Đã kích hoạt membership dùng thử 7 ngày.",
    membership,
  });
}

async function createCheckout(req, res) {
  const result = await ownerMembershipService.createCheckout(
    req.user._id,
    req.body?.plan,
    req.user.name,
  );
  res.status(201).json({
    message: "Đã tạo liên kết thanh toán membership.",
    ...result,
  });
}

async function getOrderStatus(req, res) {
  const order = await ownerMembershipService.getOrderForOwner(
    req.params.orderCode,
    req.user._id,
  );
  res.json({ order });
}

async function handlePayOSWebhook(req, res) {
  const payos = ownerMembershipService.getPayOS();
  let event;
  try {
    event = await payos.webhooks.verify(req.body);
  } catch (error) {
    console.error("PayOS membership webhook signature verification failed:", error.message);
    throw new AppError(400, "Chữ ký webhook PayOS không hợp lệ.");
  }

  if (event.code === "00" && event.orderCode && event.amount) {
    try {
      await ownerMembershipService.activatePaidOrder(
        Number(event.orderCode),
        Number(event.amount),
        event.reference || "",
      );
    } catch (error) {
      if (error.statusCode !== 404) throw error;
      console.warn("Ignoring signed PayOS webhook for an unknown membership order:", event.orderCode);
    }
  }

  res.json({ error: 0, message: "Webhook processed", data: null });
}

module.exports = {
  getMembership,
  startTrial,
  createCheckout,
  getOrderStatus,
  handlePayOSWebhook,
};
