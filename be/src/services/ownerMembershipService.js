const crypto = require("crypto");
const { PayOS } = require("@payos/node");
const Equipment = require("../models/Equipment");
const OwnerMembership = require("../models/OwnerMembership");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const PLANS = [
  { id: "trial_7d", name: "Dùng thử 7 ngày", durationDays: 7, amount: 0 },
  { id: "month_1", name: "1 tháng", durationMonths: 1, amount: 20000 },
  { id: "month_2", name: "2 tháng", durationMonths: 2, amount: 35000 },
  { id: "month_3", name: "3 tháng", durationMonths: 3, amount: 50000 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function addCalendarMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

function getPayOS() {
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env;
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
    throw new AppError(503, "Thanh toán online chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
  }
  return new PayOS({
    clientId: PAYOS_CLIENT_ID,
    apiKey: PAYOS_API_KEY,
    checksumKey: PAYOS_CHECKSUM_KEY,
  });
}

function getFrontendUrl() {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new AppError(503, "FRONTEND_URL chưa được cấu hình để mở cổng thanh toán.");
  }
  return `${frontendUrl.replace(/\/+$/, "")}/owner?membership=return`;
}

async function getMembershipOverview(ownerId) {
  const now = new Date();
  const [current, trial] = await Promise.all([
    OwnerMembership.findOne({
      owner_id: ownerId,
      status: "active",
      expires_at: { $gt: now },
    })
      .sort({ expires_at: -1 })
      .lean(),
    OwnerMembership.exists({ owner_id: ownerId, is_trial: true }),
  ]);
  const orders = await OwnerMembership.find({ owner_id: ownerId })
    .sort({ createdAt: -1 })
    .limit(10)
    .select("plan amount status order_code started_at expires_at paid_at createdAt")
    .lean();

  return {
    plans: PLANS,
    current,
    hasUsedTrial: Boolean(trial),
    orders,
  };
}

async function startTrial(ownerId) {
  const now = new Date();
  const session = await OwnerMembership.startSession();
  let membership;
  try {
    await session.withTransaction(async () => {
      const activeMembership = await OwnerMembership.exists({
        owner_id: ownerId,
        status: "active",
        expires_at: { $gt: now },
      }).session(session);
      if (activeMembership) {
        throw new AppError(409, "Tài khoản đang có membership còn hạn.");
      }

      const trial = await OwnerMembership.exists({ owner_id: ownerId, is_trial: true }).session(session);
      if (trial) {
        throw new AppError(409, "Tài khoản Owner này đã sử dụng gói dùng thử.");
      }

      [membership] = await OwnerMembership.create(
        [{
          owner_id: ownerId,
          plan: "trial_7d",
          amount: 0,
          duration_months: 0,
          is_trial: true,
          status: "active",
          started_at: now,
          expires_at: new Date(now.getTime() + 7 * DAY_MS),
        }],
        { session },
      );

      await Equipment.updateMany(
        { owner_id: ownerId, membership_hidden: true },
        { $set: { visibility: "published", membership_hidden: false, hidden_reason: "" } },
        { session },
      );
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, "Tài khoản Owner này đã sử dụng gói dùng thử.");
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return membership;
}

async function requireMembershipToPublish(req, res, next) {
  if (req.body?.visibility !== "published") return next();
  return requireActiveMembership(req, res, next);
}

async function createCheckout(ownerId, planId, buyerName) {
  const plan = PLANS.find((item) => item.id === planId && item.durationMonths);
  if (!plan) {
    throw new AppError(400, "Gói membership không hợp lệ.");
  }

  const payos = getPayOS();
  const returnUrl = getFrontendUrl();
  const orderCode = Date.now() * 1000 + crypto.randomInt(0, 1000);
  const membership = await OwnerMembership.create({
    owner_id: ownerId,
    plan: plan.id,
    duration_months: plan.durationMonths,
    amount: plan.amount,
    order_code: orderCode,
    status: "pending_payment",
  });

  try {
    const paymentLink = await payos.paymentRequests.create({
      orderCode,
      amount: plan.amount,
      description: `MEM${String(orderCode).slice(-6)}`,
      buyerName: typeof buyerName === "string" ? buyerName.slice(0, 50) : undefined,
      items: [{ name: `Membership ${plan.name}`, quantity: 1, price: plan.amount }],
      returnUrl,
      cancelUrl: returnUrl,
      expiredAt: Math.floor((Date.now() + 15 * 60 * 1000) / 1000),
    });

    membership.payment_link_id = paymentLink.paymentLinkId || "";
    membership.checkout_url = paymentLink.checkoutUrl;
    await membership.save();
    return {
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      amount: plan.amount,
      plan: plan.id,
    };
  } catch (error) {
    membership.status = "failed";
    await membership.save();
    console.error("Failed to create PayOS membership checkout:", error);
    throw new AppError(502, "Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.");
  }
}

async function activatePaidOrder(orderCode, amount, paymentReference = "") {
  const session = await OwnerMembership.startSession();
  try {
    await session.withTransaction(async () => {
      const membership = await OwnerMembership.findOne({ order_code: orderCode }).session(session);
      if (!membership) {
        throw new AppError(404, "Không tìm thấy đơn membership tương ứng.");
      }
      if (membership.status === "active" || membership.status === "extended") {
        return;
      }
      if (membership.status !== "pending_payment" || membership.amount !== Number(amount)) {
        throw new AppError(400, "Trạng thái hoặc số tiền thanh toán không khớp đơn membership.");
      }

      const now = new Date();
      const current = await OwnerMembership.findOne({
        owner_id: membership.owner_id,
        status: "active",
        expires_at: { $gt: now },
      })
        .sort({ expires_at: -1 })
        .session(session);

      const startAt = current && current.expires_at > now ? current.expires_at : now;
      const expiresAt = addCalendarMonths(startAt, membership.duration_months);
      if (current) {
        current.status = "extended";
        await current.save({ session });
      }

      membership.status = "active";
      membership.started_at = startAt;
      membership.expires_at = expiresAt;
      membership.paid_at = now;
      membership.payment_reference = paymentReference;
      await membership.save({ session });

      await Equipment.updateMany(
        { owner_id: membership.owner_id, membership_hidden: true },
        { $set: { visibility: "published", membership_hidden: false, hidden_reason: "" } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return OwnerMembership.findOne({ order_code: orderCode }).lean();
}

async function getOrderForOwner(orderCode, ownerId) {
  const parsedOrderCode = Number(orderCode);
  if (!Number.isSafeInteger(parsedOrderCode) || parsedOrderCode <= 0) {
    throw new AppError(400, "Mã đơn thanh toán không hợp lệ.");
  }
  const membership = await OwnerMembership.findOne({
    order_code: parsedOrderCode,
    owner_id: ownerId,
  })
    .select("plan amount status order_code expires_at paid_at")
    .lean();
  if (!membership) {
    throw new AppError(404, "Không tìm thấy đơn membership.");
  }
  return membership;
}

async function expireMemberships() {
  const now = new Date();
  await OwnerMembership.updateMany(
    { status: "active", expires_at: { $lte: now } },
    { $set: { status: "expired" } },
  );

  const [owners, activeOwnerIds] = await Promise.all([
    User.find({ role: "owner" }).select("_id").lean(),
    OwnerMembership.distinct("owner_id", {
      status: "active",
      expires_at: { $gt: now },
    }),
  ]);
  const activeIds = new Set(activeOwnerIds.map((id) => id.toString()));
  const inactiveOwnerIds = owners
    .map((owner) => owner._id)
    .filter((id) => !activeIds.has(id.toString()));

  if (inactiveOwnerIds.length) {
    await Equipment.updateMany(
      {
        owner_id: { $in: inactiveOwnerIds },
        visibility: "published",
        membership_hidden: { $ne: true },
      },
      {
        $set: {
          visibility: "hidden",
          membership_hidden: true,
          hidden_reason: "Gói membership đã hết hạn",
        },
      },
    );
  }
}

async function requireActiveMembership(req, _res, next) {
  try {
    if (String(req.user.role).toLowerCase() === "systemadmin") return next();
    const now = new Date();
    const membership = await OwnerMembership.findOne({
      owner_id: req.user._id,
      status: "active",
      expires_at: { $gt: now },
    }).select("_id");

    if (!membership) {
      await expireMemberships();
      throw new AppError(403, "Bạn cần có membership còn hạn để đăng bài cho thuê.");
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

async function startMembershipExpiryService() {
  await expireMemberships();
  const run = () => {
    expireMemberships().catch((error) => {
      console.error("Failed to expire owner memberships and hide listings:", error);
    });
  };
  run();
  const interval = setInterval(run, 60 * 1000);
  interval.unref();
}

module.exports = {
  PLANS,
  getPayOS,
  getMembershipOverview,
  startTrial,
  createCheckout,
  activatePaidOrder,
  getOrderForOwner,
  startMembershipExpiryService,
  requireActiveMembership,
  requireMembershipToPublish,
};
