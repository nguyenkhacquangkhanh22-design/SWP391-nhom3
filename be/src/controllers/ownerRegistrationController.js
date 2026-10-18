const OwnerApplication = require("../models/OwnerApplication");
const User = require("../models/User");
const AppError = require("../utils/AppError");

// UC_O02: Register Owner Account (Guest / Renter submits registration)
async function submitOwnerApplication(req, res) {
  const userId = req.user._id;

  const {
    phone,
    identity_card,
    address,
    shop_name,
    bank_name,
    bank_account_number,
    bank_account_holder,
    identity_card_front,
    identity_card_back,
    business_license,
    notes,
  } = req.body;

  if (
    !phone ||
    !identity_card ||
    !address ||
    !bank_name ||
    !bank_account_number ||
    !bank_account_holder
  ) {
    throw new AppError(
      400,
      "Vui lòng điền đầy đủ số điện thoại, CCCD/CMND, địa chỉ và thông tin tài khoản ngân hàng để nhận giải ngân"
    );
  }

  // Check if user already has an active pending or approved application
  const existingApp = await OwnerApplication.findOne({ user_id: userId });
  if (existingApp) {
    if (existingApp.status === "approved") {
      throw new AppError(400, "Tài khoản của bạn đã được phê duyệt làm Người cho thuê (Owner)");
    }
    if (existingApp.status === "pending") {
      throw new AppError(
        400,
        "Bạn đã gửi hồ sơ đăng ký và đang chờ System Admin phê duyệt. Vui lòng không gửi lại."
      );
    }
    // If previously rejected, allow re-submitting with updated info
    existingApp.phone = phone.trim();
    existingApp.identity_card = identity_card.trim();
    existingApp.address = address.trim();
    existingApp.shop_name = (shop_name || "").trim();
    existingApp.bank_name = bank_name.trim();
    existingApp.bank_account_number = bank_account_number.trim();
    existingApp.bank_account_holder = bank_account_holder.trim();
    existingApp.identity_card_front = identity_card_front || "";
    existingApp.identity_card_back = identity_card_back || "";
    existingApp.business_license = business_license || "";
    existingApp.notes = notes || "";
    existingApp.status = "pending";
    existingApp.admin_note = "";
    await existingApp.save();

    return res.json({
      message: "Hồ sơ đăng ký Owner đã được cập nhật lại và gửi tới System Admin phê duyệt",
      application: existingApp,
    });
  }

  const application = await OwnerApplication.create({
    user_id: userId,
    applicant_name: req.user.name,
    applicant_email: req.user.email,
    phone: phone.trim(),
    identity_card: identity_card.trim(),
    address: address.trim(),
    shop_name: (shop_name || "").trim(),
    bank_name: bank_name.trim(),
    bank_account_number: bank_account_number.trim(),
    bank_account_holder: bank_account_holder.trim(),
    identity_card_front: identity_card_front || "",
    identity_card_back: identity_card_back || "",
    business_license: business_license || "",
    notes: notes || "",
    status: "pending",
  });

  res.status(201).json({
    message: "Nộp hồ sơ đăng ký trở thành Owner thành công. Vui lòng chờ System Admin phê duyệt.",
    application,
  });
}

// Check current user's application status
async function getMyApplicationStatus(req, res) {
  const userId = req.user._id;
  const application = await OwnerApplication.findOne({ user_id: userId }).lean();

  res.json({
    hasApplication: Boolean(application),
    application: application || null,
  });
}

// System Admin: list all applications
async function adminListApplications(req, res) {
  const applications = await OwnerApplication.find()
    .populate("user_id", "name email role status")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ applications });
}

// System Admin: approve / reject owner application
async function adminReviewApplication(req, res) {
  const { id } = req.params;
  const { action, admin_note } = req.body; // 'approve' | 'reject'

  if (!["approve", "reject"].includes(action)) {
    throw new AppError(400, "Hành động duyệt không hợp lệ ('approve' hoặc 'reject')");
  }

  const application = await OwnerApplication.findById(id);
  if (!application) {
    throw new AppError(404, "Không tìm thấy hồ sơ đăng ký");
  }

  if (action === "approve") {
    application.status = "approved";
    application.admin_note = admin_note || "Hồ sơ hợp lệ, đã cấp quyền Owner.";

    // Upgrade user role to 'owner'
    const user = await User.findById(application.user_id);
    if (user) {
      user.role = "owner";
      await user.save();
    }
  } else {
    application.status = "rejected";
    application.admin_note = admin_note || "Hồ sơ không đáp ứng đủ yêu cầu xác thực.";
  }

  application.reviewed_by = req.user._id;
  application.reviewed_at = new Date();
  await application.save();

  res.json({
    message: action === "approve" ? "Đã phê duyệt quyền Owner cho tài khoản" : "Đã từ chối hồ sơ đăng ký",
    application,
  });
}

module.exports = {
  submitOwnerApplication,
  getMyApplicationStatus,
  adminListApplications,
  adminReviewApplication,
};
