const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const RegistrationVerification = require("../models/RegistrationVerification");
const AppError = require("../utils/AppError");

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const REGISTRATION_OTP_TTL_MS = 10 * 60 * 1000;
const REGISTRATION_TICKET_TTL_MS = 10 * 60 * 1000;
const REGISTRATION_RESEND_COOLDOWN_MS = 60 * 1000;
const REGISTRATION_MAX_ATTEMPTS = 5;
const googleClient = new OAuth2Client();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    { tokenVersion: user.token_version || 0 },
    getJwtSecret(),
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    },
  );
}

function toPublicUser(user) {
  return {
    User_Id: user.User_Id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    trust_score: user.trust_score,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters long");
  }
}

function hashRegistrationSecret(value, purpose) {
  return crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${purpose}:${value}`)
    .digest("hex");
}

function validateEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError(400, "A valid email is required");
  }
  return normalizedEmail;
}

async function sendRegistrationOtp(email) {
  const normalizedEmail = validateEmail(email);
  const existingUser = await User.exists({ email: normalizedEmail });

  if (!existingUser) {
    const now = new Date();
    let challenge = await RegistrationVerification.findOne({ email: normalizedEmail });
    if (
      challenge?.last_sent_at &&
      now.getTime() - challenge.last_sent_at.getTime() < REGISTRATION_RESEND_COOLDOWN_MS
    ) {
      throw new AppError(429, "Please wait before requesting another verification code");
    }

    const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const otpExpiresAt = new Date(now.getTime() + REGISTRATION_OTP_TTL_MS);
    const otpHash = hashRegistrationSecret(otp, "registration-otp");

    challenge = await RegistrationVerification.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          otp_hash: otpHash,
          otp_expires_at: otpExpiresAt,
          attempts: 0,
          last_sent_at: now,
          expires_at: otpExpiresAt,
        },
        $unset: {
          verified_ticket_hash: 1,
          ticket_expires_at: 1,
        },
        $setOnInsert: { email: normalizedEmail },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    try {
      await createEmailTransport().sendMail({
        from: process.env.EMAIL_FROM,
        to: normalizedEmail,
        subject: "Xác minh email đăng ký Gatherly",
        text: `Mã xác minh email của bạn là ${otp}. Mã có hiệu lực trong 10 phút.`,
        html: `<p>Mã xác minh email của bạn là:</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>`,
      });
    } catch (error) {
      await RegistrationVerification.deleteOne({
        _id: challenge._id,
        otp_hash: otpHash,
      });
      throw error;
    }
  }

  return {
    message: "If this email can be registered, a verification code will be sent.",
  };
}

async function verifyRegistrationOtp({ email, otp }) {
  const normalizedEmail = validateEmail(email);
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw new AppError(400, "A valid 6-digit verification code is required");
  }

  const now = new Date();
  const challenge = await RegistrationVerification.findOne({
    email: normalizedEmail,
  }).select("+otp_hash");

  if (
    !challenge ||
    !challenge.otp_hash ||
    !challenge.otp_expires_at ||
    challenge.otp_expires_at <= now
  ) {
    throw new AppError(400, "Verification code is invalid or expired");
  }

  if (challenge.attempts >= REGISTRATION_MAX_ATTEMPTS) {
    throw new AppError(429, "Too many incorrect codes. Request a new code.");
  }

  const submittedHash = hashRegistrationSecret(otp, "registration-otp");
  const hashesMatch = crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(challenge.otp_hash, "hex"),
  );

  if (!hashesMatch) {
    const updated = await RegistrationVerification.findOneAndUpdate(
      {
        _id: challenge._id,
        otp_hash: challenge.otp_hash,
        otp_expires_at: { $gt: now },
        attempts: { $lt: REGISTRATION_MAX_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (updated && updated.attempts >= REGISTRATION_MAX_ATTEMPTS) {
      throw new AppError(429, "Too many incorrect codes. Request a new code.");
    }
    throw new AppError(400, "Verification code is invalid or expired");
  }

  const ticket = crypto.randomBytes(32).toString("hex");
  const ticketExpiresAt = new Date(now.getTime() + REGISTRATION_TICKET_TTL_MS);
  const verifiedChallenge = await RegistrationVerification.findOneAndUpdate(
    {
      _id: challenge._id,
      otp_hash: challenge.otp_hash,
      attempts: { $lt: REGISTRATION_MAX_ATTEMPTS },
      otp_expires_at: { $gt: now },
    },
    {
      $unset: { otp_hash: 1, otp_expires_at: 1 },
      $set: {
        verified_ticket_hash: hashRegistrationSecret(ticket, "registration-ticket"),
        ticket_expires_at: ticketExpiresAt,
        expires_at: ticketExpiresAt,
      },
    },
    { new: true },
  );

  if (!verifiedChallenge) {
    throw new AppError(400, "Verification code is invalid or expired");
  }

  return {
    message: "Email verified successfully",
    email: normalizedEmail,
    verificationToken: ticket,
    expiresInSeconds: REGISTRATION_TICKET_TTL_MS / 1000,
  };
}

async function register({ name, email, password, verificationToken }) {
  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "Name is required");
  }
  const normalizedEmail = validateEmail(email);
  if (typeof verificationToken !== "string" || !verificationToken) {
    throw new AppError(403, "Verify your email before creating an account");
  }
  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, "Email or account identifier already exists");
  }
  validatePassword(password);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();
  const verification = await RegistrationVerification.findOneAndDelete(
    {
      email: normalizedEmail,
      verified_ticket_hash: hashRegistrationSecret(
        verificationToken,
        "registration-ticket",
      ),
      ticket_expires_at: { $gt: now },
    },
  );
  if (!verification) {
    throw new AppError(403, "Email verification is missing, expired, or already used");
  }

  const user = await User.create({
    User_Id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
  });

  return { user: toPublicUser(user), token: createAccessToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: normalizeEmail(email) })
    .select("+password_hash +token_version");

  if (
    !user ||
    !user.password_hash ||
    !(await bcrypt.compare(typeof password === "string" ? password : "", user.password_hash))
  ) {
    throw new AppError(401, "Invalid email or password");
  }
  if (user.status !== "active") {
    throw new AppError(403, "This account is not active");
  }

  return { user: toPublicUser(user), token: createAccessToken(user) };
}

async function logout(user) {
  user.token_version += 1;
  await user.save();
}

async function changePassword(user, { currentPassword, newPassword }) {
  validatePassword(newPassword);
  const account = await User.findById(user._id)
    .select("+password_hash +token_version");

  if (!account || !account.password_hash) {
    throw new AppError(400, "This account does not have a password");
  }
  if (
    typeof currentPassword !== "string" ||
    !(await bcrypt.compare(currentPassword, account.password_hash))
  ) {
    throw new AppError(400, "Current password is incorrect");
  }

  account.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  account.token_version += 1;
  await account.save();

  return { user: toPublicUser(account), token: createAccessToken(account) };
}

function createEmailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !EMAIL_FROM) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM must be configured");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

async function forgotPassword(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new AppError(400, "Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.password_reset_token_hash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.password_reset_expires_at = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error("FRONTEND_URL must be configured to send password reset links");
  }
  const resetUrl = new URL("/reset-password", frontendUrl);
  resetUrl.searchParams.set("token", resetToken);
  resetUrl.searchParams.set("email", normalizedEmail);

  await createEmailTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: normalizedEmail,
    subject: "Reset your password",
    text: `Use this link to reset your password within 15 minutes: ${resetUrl.toString()}`,
  });
}

async function resetPassword({ email, token, newPassword }) {
  validatePassword(newPassword);
  if (typeof token !== "string" || !token) {
    throw new AppError(400, "Reset token is required");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    email: normalizeEmail(email),
    password_reset_token_hash: tokenHash,
    password_reset_expires_at: { $gt: new Date() },
  }).select("+password_hash +password_reset_token_hash +password_reset_expires_at +token_version");

  if (!user) {
    throw new AppError(400, "Reset token is invalid or expired");
  }

  user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password_reset_token_hash = undefined;
  user.password_reset_expires_at = undefined;
  user.token_version += 1;
  await user.save();
}

async function signInWithGoogle(idToken) {
  if (typeof idToken !== "string" || !idToken) {
    throw new AppError(400, "Google ID token is required");
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID must be configured");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (_error) {
    throw new AppError(401, "Invalid Google ID token");
  }

  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError(401, "Google account must have a verified email");
  }

  const email = normalizeEmail(payload.email);
  let user = await User.findOne({ $or: [{ google_id: payload.sub }, { email }] })
    .select("+google_id +token_version");

  if (user && user.google_id && user.google_id !== payload.sub) {
    throw new AppError(409, "This email is linked to another Google account");
  }

  if (!user) {
    user = await User.create({
      User_Id: crypto.randomUUID(),
      name: payload.name || email,
      email,
      google_id: payload.sub,
    });
    user.token_version = 0;
  } else {
    if (!user.google_id) {
      user.google_id = payload.sub;
    }
    if (user.status !== "active") {
      throw new AppError(403, "This account is not active");
    }
    await user.save();
  }

  return { user: toPublicUser(user), token: createAccessToken(user) };
}

async function updateProfile(user, { name }) {
  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "Name is required");
  }
  user.name = name.trim();
  await user.save();
  return toPublicUser(user);
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
  signInWithGoogle,
  getProfile: toPublicUser,
  updateProfile,
};
