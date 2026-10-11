const User = require("../models/User");
const AppError = require("../utils/AppError");

async function getOverview(req, res) {
  const [totalUsers, activeUsers, adminCount, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({
      role: { $regex: /^systemadmin$/i },
    }),
    User.find({}, { password_hash: 0, password_reset_token_hash: 0, google_id: 0 })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.json({
    stats: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminCount,
    },
    users: recentUsers,
  });
}

async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || typeof role !== "string") {
    throw new AppError(400, "Role is required and must be a string");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  user.role = role.trim();
  await user.save();

  res.json({
    message: "User role updated successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;

  if (!status || !["active", "blocked", "inactive"].includes(status)) {
    throw new AppError(400, "Valid status ('active', 'blocked', 'inactive') is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (String(user._id) === String(req.user._id)) {
    throw new AppError(400, "You cannot alter your own account status");
  }

  user.status = status;
  if (status !== "active") {
    // Invalidate sessions immediately if deactivated/blocked
    user.token_version = (user.token_version || 0) + 1;
  }
  await user.save();

  res.json({
    message: `User status changed to ${status}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
}

module.exports = {
  getOverview,
  updateUserRole,
  updateUserStatus,
};
