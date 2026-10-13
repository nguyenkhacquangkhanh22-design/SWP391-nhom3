const authService = require("../services/authService");
const UserNotification = require("../models/UserNotification");
const AppError = require("../utils/AppError");

async function sendRegistrationOtp(req, res) {
  res.status(202).json(await authService.sendRegistrationOtp(req.body.email));
}

async function verifyRegistrationOtp(req, res) {
  res.json(await authService.verifyRegistrationOtp(req.body));
}

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  res.json(await authService.login(req.body));
}

async function logout(req, res) {
  await authService.logout(req.user);
  res.json({ message: "Logged out successfully. All existing sessions have been revoked." });
}

async function changePassword(req, res) {
  res.json(await authService.changePassword(req.user, req.body));
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);
  res.status(202).json({
    message: "If an account exists for that email, a password reset link will be sent.",
  });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body);
  res.json({ message: "Password has been reset. Please sign in again." });
}

async function googleLogin(req, res) {
  res.json(await authService.signInWithGoogle(req.body.idToken));
}

async function getProfile(req, res) {
  res.json({ user: authService.getProfile(req.user) });
}

async function updateProfile(req, res) {
  res.json({ user: await authService.updateProfile(req.user, req.body) });
}

async function listNotifications(req, res) {
  const notifications = await UserNotification.find({ user_id: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ notifications });
}

async function markNotificationRead(req, res) {
  const notification = await UserNotification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    { $set: { read_at: new Date() } },
    { new: true }
  );
  if (!notification) throw new AppError(404, "Không tìm thấy thông báo.");
  res.json({ notification });
}

module.exports = {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  register,
  login,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  googleLogin,
  getProfile,
  updateProfile,
  listNotifications,
  markNotificationRead,
};
