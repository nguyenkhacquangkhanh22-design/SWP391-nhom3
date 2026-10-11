const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

async function authenticate(req, _res, next) {
  try {
    const authorization = req.get("authorization");
    const parts = authorization ? authorization.split(" ") : [];
    const [scheme, token] = parts;

    if (parts.length !== 2 || scheme !== "Bearer" || !token) {
      throw new AppError(401, "Authentication token is required");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.sub !== "string" ||
      !Number.isInteger(decoded.tokenVersion)
    ) {
      throw new AppError(401, "Invalid authentication token");
    }

    const user = await User.findById(decoded.sub).select("+token_version");
    if (
      !user ||
      user.status !== "active" ||
      user.token_version !== decoded.tokenVersion
    ) {
      throw new AppError(401, "Authentication token is no longer valid");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError(401, "Invalid or expired authentication token"));
    }
    return next(error);
  }
}

module.exports = authenticate;
