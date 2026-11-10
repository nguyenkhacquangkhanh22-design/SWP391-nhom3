const User = require("../models/User");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const AppError = require("../utils/AppError");

const walletController = {
  /**
   * UC_W01: Thêm tài khoản ngân hàng cho Owner
   * POST /api/owners/bank-accounts
   * Quy định: Tối đa 3 tài khoản, trạng thái mặc định là 'PENDING'
   */
  async addBankAccount(req, res) {
    const { bankName, accountNumber, accountHolderName } = req.body;

    if (!bankName || !bankName.trim()) {
      throw new AppError(400, "Vui lòng chọn hoặc nhập tên ngân hàng.");
    }
    if (!accountNumber || !accountNumber.trim()) {
      throw new AppError(400, "Vui lòng nhập số tài khoản ngân hàng.");
    }
    if (!accountHolderName || !accountHolderName.trim()) {
      throw new AppError(400, "Vui lòng nhập họ và tên chủ tài khoản.");
    }

    const cleanAccountNumber = accountNumber.trim().replace(/\s+/g, "");
    const cleanHolderName = accountHolderName.trim().toUpperCase();
    const cleanBankName = bankName.trim();

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError(404, "Không tìm thấy thông tin người dùng.");
    }

    user.bankAccounts = user.bankAccounts || [];

    // Kiểm tra số lượng: Tối đa 3 tài khoản ngân hàng
    if (user.bankAccounts.length >= 3) {
      throw new AppError(
        400,
        "Mỗi Chủ thiết bị (Owner) chỉ được thêm TỐI ĐA 3 tài khoản ngân hàng theo quy định bảo mật."
      );
    }

    // Kiểm tra xem số tài khoản này đã được thêm trước đó chưa
    const isDuplicate = user.bankAccounts.some(
      (acc) => acc.accountNumber === cleanAccountNumber && acc.bankName.toLowerCase() === cleanBankName.toLowerCase()
    );
    if (isDuplicate) {
      throw new AppError(400, "Tài khoản ngân hàng này đã tồn tại trong danh sách của bạn.");
    }

    const newAccount = {
      bankName: cleanBankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: cleanHolderName,
      status: "PENDING", // Trạng thái mặc định: Chờ Admin phê duyệt
      createdAt: new Date(),
    };

    user.bankAccounts.push(newAccount);
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Thêm tài khoản ngân hàng thành công! Vui lòng chờ Quản trị viên (Admin) xét duyệt trước khi dùng để rút tiền.",
      data: user.bankAccounts,
    });
  },

  /**
   * UC_W02: Lấy số dư ví trung gian và danh sách tài khoản ngân hàng của Owner
   * GET /api/owners/bank-accounts
   */
  async getOwnerBankAccountsAndBalance(req, res) {
    const user = await User.findById(req.user._id).select("walletBalance bankAccounts name email phone");
    if (!user) {
      throw new AppError(404, "Không tìm thấy thông tin người dùng.");
    }

    return res.status(200).json({
      success: true,
      walletBalance: user.walletBalance || 0,
      bankAccounts: user.bankAccounts || [],
    });
  },

  /**
   * UC_W03: Xóa tài khoản ngân hàng (nếu không cần dùng nữa)
   * DELETE /api/owners/bank-accounts/:accountId
   * Quy định: Không cho phép xóa nếu đang có Lệnh rút tiền PENDING chờ Admin chuyển tiền
   */
  async removeBankAccount(req, res) {
    const { accountId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError(404, "Không tìm thấy thông tin người dùng.");
    }

    const targetAccount = user.bankAccounts?.find(
      (acc) => acc._id.toString() === accountId
    );
    if (!targetAccount) {
      throw new AppError(404, "Không tìm thấy tài khoản ngân hàng cần xóa.");
    }

    // Kiểm tra xem tài khoản ngân hàng này có Lệnh rút tiền đang ở trạng thái PENDING không
    const pendingWithdrawal = await WithdrawalRequest.findOne({
      ownerId: req.user._id,
      status: "PENDING",
      $or: [
        { "bankInfoSnapshot.bankAccountId": targetAccount._id },
        {
          "bankInfoSnapshot.accountNumber": targetAccount.accountNumber,
          "bankInfoSnapshot.bankName": targetAccount.bankName,
        },
      ],
    });

    if (pendingWithdrawal) {
      throw new AppError(
        400,
        `Không thể xóa tài khoản ngân hàng "${targetAccount.bankName} - ${targetAccount.accountNumber}" vì đang có Lệnh rút tiền (${pendingWithdrawal.amount.toLocaleString(
          "vi-VN"
        )} đ) ở trạng thái chờ duyệt (PENDING). Vui lòng đợi Admin xử lý xong hoặc từ chối lệnh rút tiền trước khi xóa.`
      );
    }

    const initialLength = user.bankAccounts.length;
    user.bankAccounts = user.bankAccounts.filter(
      (acc) => acc._id.toString() !== accountId
    );

    if (user.bankAccounts.length === initialLength) {
      throw new AppError(404, "Không tìm thấy tài khoản ngân hàng cần xóa.");
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Đã xóa tài khoản ngân hàng thành công.",
      data: user.bankAccounts,
    });
  },

  /**
   * UC_W04: Tạo yêu cầu rút tiền từ ví trung gian
   * POST /api/owners/withdraw
   * Điều kiện:
   * 1. Số dư ví >= amount
   * 2. Tài khoản ngân hàng được chọn PHẢI có status là 'APPROVED'
   * 3. Trừ số dư ví ngay khi tạo lệnh để tránh rút trùng
   */
  async createWithdrawal(req, res) {
    const { amount, bankAccountId } = req.body;

    const withdrawAmount = Math.round(Number(amount));
    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount < 10000) {
      throw new AppError(400, "Số tiền rút tối thiểu là 10.000 đ.");
    }

    if (!bankAccountId) {
      throw new AppError(400, "Vui lòng chọn tài khoản ngân hàng nhận tiền đã được Admin duyệt.");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError(404, "Không tìm thấy thông tin người dùng.");
    }

    // 1. Kiểm tra số dư ví
    const currentBalance = user.walletBalance || 0;
    if (currentBalance < withdrawAmount) {
      throw new AppError(
        400,
        `Số dư ví hiện tại (${currentBalance.toLocaleString("vi-VN")} đ) không đủ để rút ${withdrawAmount.toLocaleString("vi-VN")} đ.`
      );
    }

    // 2. Kiểm tra tài khoản ngân hàng có tồn tại và đã được Admin duyệt chưa
    const account = user.bankAccounts?.id
      ? user.bankAccounts.id(bankAccountId)
      : user.bankAccounts?.find((a) => a._id.toString() === bankAccountId);

    if (!account) {
      throw new AppError(404, "Không tìm thấy tài khoản ngân hàng được chọn.");
    }

    if (account.status !== "APPROVED") {
      throw new AppError(
        400,
        `Tài khoản ${account.bankName} (${account.accountNumber}) hiện đang ở trạng thái "${account.status}". Chỉ tài khoản đã được Admin PHÊ DUYỆT (APPROVED) mới được phép rút tiền.`
      );
    }

    // 3. Trừ số dư ví ngay khi tạo lệnh để đóng băng số tiền
    user.walletBalance = currentBalance - withdrawAmount;
    await user.save();

    // 4. Tạo bản ghi yêu cầu rút tiền kèm snapshot thông tin ngân hàng
    const withdrawal = await WithdrawalRequest.create({
      ownerId: user._id,
      amount: withdrawAmount,
      bankInfoSnapshot: {
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolderName: account.accountHolderName,
        bankAccountId: account._id,
      },
      status: "PENDING",
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Đã tạo yêu cầu rút ${withdrawAmount.toLocaleString("vi-VN")} đ thành công. Vui lòng chờ Admin kiểm tra và chuyển khoản giả lập!`,
      data: withdrawal,
      remainingBalance: user.walletBalance,
    });
  },

  /**
   * UC_W05: Lịch sử rút tiền của Owner
   * GET /api/owners/withdrawals
   */
  async getOwnerWithdrawals(req, res) {
    const list = await WithdrawalRequest.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: list,
    });
  },

  // ================= ADMIN APIS =================

  /**
   * UC_A_W01: Lấy danh sách các tài khoản ngân hàng đang chờ duyệt
   * GET /api/admin/bank-accounts/pending
   */
  async getPendingBankAccounts(_req, res) {
    const users = await User.find({
      "bankAccounts.status": "PENDING",
    }).select("name email phone User_Id bankAccounts");

    const pendingAccounts = [];
    for (const u of users) {
      for (const acc of u.bankAccounts) {
        if (acc.status === "PENDING") {
          pendingAccounts.push({
            userId: u._id,
            ownerName: u.name,
            ownerEmail: u.email,
            ownerPhone: u.phone,
            User_Id: u.User_Id,
            account: acc,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: pendingAccounts,
    });
  },

  /**
   * UC_A_W02: Admin phê duyệt tài khoản ngân hàng
   * PUT /api/admin/bank-accounts/:userId/:accountId/approve
   */
  async approveBankAccount(req, res) {
    const { userId, accountId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "Không tìm thấy người dùng.");
    }

    const account = user.bankAccounts.id
      ? user.bankAccounts.id(accountId)
      : user.bankAccounts.find((a) => a._id.toString() === accountId);

    if (!account) {
      throw new AppError(404, "Không tìm thấy tài khoản ngân hàng.");
    }

    account.status = "APPROVED";
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Đã phê duyệt tài khoản ngân hàng ${account.bankName} - ${account.accountNumber} của ${user.name}.`,
      data: account,
    });
  },

  /**
   * UC_A_W03: Admin từ chối tài khoản ngân hàng
   * PUT /api/admin/bank-accounts/:userId/:accountId/reject
   */
  async rejectBankAccount(req, res) {
    const { userId, accountId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "Không tìm thấy người dùng.");
    }

    const account = user.bankAccounts.id
      ? user.bankAccounts.id(accountId)
      : user.bankAccounts.find((a) => a._id.toString() === accountId);

    if (!account) {
      throw new AppError(404, "Không tìm thấy tài khoản ngân hàng.");
    }

    account.status = "REJECTED";
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Đã từ chối tài khoản ngân hàng ${account.bankName} - ${account.accountNumber} của ${user.name}.`,
      data: account,
    });
  },

  /**
   * UC_A_W04: Lấy danh sách các lệnh rút tiền cho Admin
   * GET /api/admin/withdraw/pending
   */
  async getAdminWithdrawals(req, res) {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const list = await WithdrawalRequest.find(filter)
      .populate("ownerId", "name email phone User_Id walletBalance")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: list,
    });
  },

  /**
   * UC_A_W05: Admin duyệt lệnh rút tiền và giả lập chuyển khoản
   * PUT /api/admin/withdraw/:id/approve
   */
  async approveWithdrawal(req, res) {
    const { id } = req.params;

    const withdrawal = await WithdrawalRequest.findById(id).populate(
      "ownerId",
      "name email phone walletBalance"
    );

    if (!withdrawal) {
      throw new AppError(404, "Không tìm thấy lệnh rút tiền.");
    }

    if (withdrawal.status !== "PENDING") {
      throw new AppError(
        400,
        `Lệnh rút tiền này đã ở trạng thái "${withdrawal.status}", không thể duyệt lại.`
      );
    }

    withdrawal.status = "COMPLETED";
    withdrawal.completedAt = new Date();
    withdrawal.approvedBy = req.user._id;
    withdrawal.adminNote = req.body?.note || "Admin xác nhận đã chuyển khoản giả lập thành công";
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: `Đã xác nhận chuyển tiền ${withdrawal.amount.toLocaleString("vi-VN")} đ thành công cho ${withdrawal.bankInfoSnapshot.accountHolderName}.`,
      data: withdrawal,
    });
  },

  /**
   * UC_A_W06: Admin từ chối lệnh rút tiền và hoàn tiền lại vào ví Owner
   * PUT /api/admin/withdraw/:id/reject
   */
  async rejectWithdrawal(req, res) {
    const { id } = req.params;
    const { note } = req.body;

    const withdrawal = await WithdrawalRequest.findById(id);
    if (!withdrawal) {
      throw new AppError(404, "Không tìm thấy lệnh rút tiền.");
    }

    if (withdrawal.status !== "PENDING") {
      throw new AppError(
        400,
        `Lệnh rút tiền này đã ở trạng thái "${withdrawal.status}", không thể từ chối.`
      );
    }

    // Hoàn tiền lại ví của Owner
    const user = await User.findById(withdrawal.ownerId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + withdrawal.amount;
      await user.save();
    }

    withdrawal.status = "REJECTED";
    withdrawal.adminNote = note || "Từ chối yêu cầu rút tiền và đã hoàn tiền vào ví.";
    withdrawal.approvedBy = req.user._id;
    withdrawal.completedAt = new Date();
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: `Đã từ chối lệnh rút tiền và hoàn trả ${withdrawal.amount.toLocaleString("vi-VN")} đ vào ví của Owner.`,
      data: withdrawal,
      refundedBalance: user?.walletBalance,
    });
  },
};

module.exports = walletController;

