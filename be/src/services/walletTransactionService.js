const crypto = require("crypto");
const WalletTransaction = require("../models/WalletTransaction");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const Rental = require("../models/Rental");
const User = require("../models/User");

/**
 * Service quản lý lịch sử biến động số dư (Wallet Transaction History - UC_OWNER_08)
 */
const walletTransactionService = {
  /**
   * Sinh mã giao dịch duy nhất
   * Định dạng: TXN-YYYYMMDD-XXXX (VD: TXN-20261111-A8F2)
   */
  generateTransactionCode() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `TXN-${today}-${randomHex}`;
  },

  /**
   * Ghi nhận một giao dịch biến động số dư
   */
  async recordTransaction({
    ownerId,
    type,
    direction,
    amount,
    balanceBefore = 0,
    balanceAfter = 0,
    referenceId = null,
    referenceModel = "Other",
    referenceCode = "",
    description,
    status = "SUCCESS",
    metadata = {},
  }) {
    if (!ownerId || !type || amount === undefined || !description) {
      throw new Error("Thiếu thông tin bắt buộc để ghi nhận giao dịch ví.");
    }

    // Tự động suy ra hướng tiền nếu chưa có
    let finalDirection = direction;
    if (!finalDirection) {
      if (type === "RENTAL_INCOME" || type === "WITHDRAWAL_REFUND") {
        finalDirection = "IN";
      } else {
        finalDirection = "OUT";
      }
    }

    const transactionCode = this.generateTransactionCode();

    const transaction = await WalletTransaction.create({
      transactionCode,
      ownerId,
      type,
      direction: finalDirection,
      amount: Math.abs(Number(amount)),
      balanceBefore: Math.max(0, Number(balanceBefore)),
      balanceAfter: Math.max(0, Number(balanceAfter)),
      referenceId,
      referenceModel,
      referenceCode,
      description: description.trim(),
      status,
      metadata,
    });

    return transaction;
  },

  /**
   * Tự động đồng bộ / nạp dữ liệu lịch sử quá khứ cho Owner (nếu trước đó chưa có bản ghi nào)
   */
  async backfillPastTransactions(ownerId) {
    try {
      const existingCount = await WalletTransaction.countDocuments({ ownerId });
      if (existingCount > 0) return;

      const user = await User.findById(ownerId);
      if (!user) return;

      // 1. Lấy tất cả các đơn thuê đã thanh toán của Owner
      const paidRentals = await Rental.find({
        owner: ownerId,
        $or: [
          { "payment.isPaid": true },
          { "payment.paymentStatus": "paid" },
          { status: { $in: ["PAID", "ACTIVE", "CONFIRMED", "IN_PROGRESS", "RETURNED", "COMPLETED"] } },
        ],
      })
        .populate("equipment", "title")
        .sort({ createdAt: 1 });

      // 2. Lấy tất cả các lệnh rút tiền của Owner
      const withdrawals = await WithdrawalRequest.find({ ownerId }).sort({ createdAt: 1 });

      if (paidRentals.length === 0 && withdrawals.length === 0) {
        return;
      }

      // Tạo chuỗi sự kiện theo thứ tự thời gian
      const events = [];

      for (const r of paidRentals) {
        const amt = Number(r.payment?.amountPaid) || Number(r.totalAmount) || Number(r.rentalFee) || 0;
        if (amt > 0) {
          events.push({
            date: r.payment?.paidAt || r.updatedAt || r.createdAt,
            type: "RENTAL_INCOME",
            direction: "IN",
            amount: amt,
            referenceId: r._id,
            referenceModel: "Rental",
            referenceCode: r.rentalCode || `#${r._id.toString().slice(-6)}`,
            description: `Nhận thanh toán từ đơn thuê #${r.rentalCode || r._id.toString().slice(-6)} (${r.equipment?.title || "Thiết bị"})`,
            status: "SUCCESS",
          });
        }
      }

      for (const w of withdrawals) {
        events.push({
          date: w.createdAt,
          type: "WITHDRAWAL",
          direction: "OUT",
          amount: w.amount,
          referenceId: w._id,
          referenceModel: "WithdrawalRequest",
          referenceCode: `WTH-${w._id.toString().slice(-6).toUpperCase()}`,
          description: `Rút tiền về ${w.bankInfoSnapshot?.bankName || "ngân hàng"} (${w.bankInfoSnapshot?.accountNumber || "..."})`,
          status: w.status === "COMPLETED" ? "SUCCESS" : (w.status === "REJECTED" ? "REJECTED" : "PENDING"),
          adminNote: w.adminNote,
        });

        // Nếu lệnh rút bị reject, có hoàn tiền lại
        if (w.status === "REJECTED") {
          events.push({
            date: w.completedAt || new Date(w.updatedAt || w.createdAt),
            type: "WITHDRAWAL_REFUND",
            direction: "IN",
            amount: w.amount,
            referenceId: w._id,
            referenceModel: "WithdrawalRequest",
            referenceCode: `REF-${w._id.toString().slice(-6).toUpperCase()}`,
            description: `Hoàn tiền ví do lệnh rút bị từ chối (${w.adminNote || "Admin từ chối"})`,
            status: "SUCCESS",
          });
        }
      }

      // Sắp xếp các sự kiện từ cũ đến mới để tính lũy tiến số dư
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = 0;
      for (const ev of events) {
        const before = runningBalance;
        if (ev.status === "SUCCESS" || ev.status === "PENDING") {
          if (ev.direction === "IN") {
            runningBalance += ev.amount;
          } else {
            runningBalance = Math.max(0, runningBalance - ev.amount);
          }
        }
        const after = runningBalance;

        const dateStr = new Date(ev.date).toISOString().slice(0, 10).replace(/-/g, "");
        const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const code = `TXN-${dateStr}-${hex}`;

        await WalletTransaction.create({
          transactionCode: code,
          ownerId,
          type: ev.type,
          direction: ev.direction,
          amount: ev.amount,
          balanceBefore: before,
          balanceAfter: after,
          referenceId: ev.referenceId,
          referenceModel: ev.referenceModel,
          referenceCode: ev.referenceCode,
          description: ev.description,
          status: ev.status,
          createdAt: ev.date,
          updatedAt: ev.date,
        });
      }
    } catch (err) {
      console.warn("Backfill past wallet transactions failed:", err.message);
    }
  },

  /**
   * Lấy danh sách giao dịch có phân trang, bộ lọc và thống kê
   */
  async getTransactions(ownerId, query = {}) {
    // Tự động kiểm tra và backfill nếu đây là lần đầu Owner truy cập và chưa có bản ghi
    await this.backfillPastTransactions(ownerId);

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { ownerId };

    // Lọc theo loại giao dịch
    if (query.type && query.type !== "ALL") {
      filter.type = query.type;
    }

    // Lọc theo hướng tiền (IN / OUT)
    if (query.direction && query.direction !== "ALL" && ["IN", "OUT"].includes(query.direction)) {
      filter.direction = query.direction;
    }

    // Lọc theo trạng thái
    if (query.status && query.status !== "ALL") {
      filter.status = query.status;
    }

    // Lọc theo khoảng thời gian (startDate -> endDate)
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Tìm kiếm từ khóa (Mã GD, mô tả, mã tham chiếu)
    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), "i");
      filter.$or = [
        { transactionCode: regex },
        { description: regex },
        { referenceCode: regex },
      ];
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    // Tính tổng tiền vào / ra cho bộ lọc hiện tại
    const stats = await WalletTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$direction", "IN"] },
                    { $eq: ["$status", "SUCCESS"] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          totalOut: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$direction", "OUT"] },
                    { $in: ["$status", ["SUCCESS", "PENDING"]] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalIn = stats[0]?.totalIn || 0;
    const totalOut = stats[0]?.totalOut || 0;
    const netChange = totalIn - totalOut;

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalIn,
        totalOut,
        netChange,
      },
    };
  },

  /**
   * Lấy chi tiết 1 giao dịch theo ID
   */
  async getTransactionById(ownerId, transactionId) {
    const transaction = await WalletTransaction.findOne({
      _id: transactionId,
      ownerId,
    }).lean();

    if (!transaction) {
      return null;
    }

    // Nạp thêm thông tin chi tiết của bản ghi tham chiếu nếu có
    let referenceDetail = null;
    if (transaction.referenceId && transaction.referenceModel === "Rental") {
      referenceDetail = await Rental.findById(transaction.referenceId)
        .select("rentalCode status totalAmount rentalFee payment equipment renter startDate endDate")
        .populate("equipment", "title images dailyRate")
        .populate("renter", "name email phone")
        .lean();
    } else if (transaction.referenceId && transaction.referenceModel === "WithdrawalRequest") {
      referenceDetail = await WithdrawalRequest.findById(transaction.referenceId)
        .select("amount status bankInfoSnapshot adminNote createdAt completedAt")
        .lean();
    }

    return {
      ...transaction,
      referenceDetail,
    };
  },
};

module.exports = walletTransactionService;
