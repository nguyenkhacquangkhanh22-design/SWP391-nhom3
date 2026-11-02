const User = require("../models/User");
const AppError = require("../utils/AppError");

class UserService {
  toProfileResponse(user) {
    return {
      User_Id: user.User_Id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      trust_score: user.trust_score,
      phone: user.phone || "",
      address: user.address || "",
      avatarUrl: user.avatarUrl || "",
      kycStatus: user.kycStatus || "unverified",
      kycDocument: user.kycDocument
        ? {
            idNumber: user.kycDocument.idNumber ? `***${user.kycDocument.idNumber.slice(-4)}` : undefined,
            submittedAt: user.kycDocument.submittedAt,
            verifiedAt: user.kycDocument.verifiedAt,
            rejectionReason: user.kycDocument.rejectionReason,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * UC_R02: Xem profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return this.toProfileResponse(user);
  }

  /**
   * UC_R02: Cập nhật profile (name, phone, address, avatarUrl)
   */
  async updateProfile(userId, updateData) {
    const { name, phone, address, avatarUrl } = updateData;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw new AppError(400, "Name cannot be empty");
      }
      user.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone && typeof phone === "string") {
        const phoneRegex = /^[0-9+]{9,15}$/;
        if (!phoneRegex.test(phone.trim())) {
          throw new AppError(400, "Invalid phone number format");
        }
        user.phone = phone.trim();
      } else {
        user.phone = "";
      }
    }

    if (address !== undefined) {
      user.address = typeof address === "string" ? address.trim() : "";
    }

    if (avatarUrl !== undefined) {
      user.avatarUrl = typeof avatarUrl === "string" ? avatarUrl.trim() : "";
    }

    await user.save();
    return this.toProfileResponse(user);
  }

  /**
   * UC_R03: Nộp hồ sơ xác thực danh tính KYC
   */
  async submitKyc(userId, kycData) {
    const { idNumber, idCardFront, idCardBack, selfiePhoto } = kycData;

    if (!idNumber || typeof idNumber !== "string" || !idNumber.trim()) {
      throw new AppError(400, "ID number (CCCD/CMND) is required");
    }

    if (!idCardFront || typeof idCardFront !== "string") {
      throw new AppError(400, "Front photo of ID card is required");
    }

    if (!idCardBack || typeof idCardBack !== "string") {
      throw new AppError(400, "Back photo of ID card is required");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.kycStatus === "verified") {
      throw new AppError(400, "Your account KYC has already been verified");
    }

    user.kycStatus = "pending";
    user.kycDocument = {
      idNumber: idNumber.trim(),
      idCardFront: idCardFront.trim(),
      idCardBack: idCardBack.trim(),
      selfiePhoto: typeof selfiePhoto === "string" ? selfiePhoto.trim() : "",
      submittedAt: new Date(),
    };

    await user.save();
    return this.toProfileResponse(user);
  }
}

module.exports = new UserService();
