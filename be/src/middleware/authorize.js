const AppError = require("../utils/AppError");

/**
 * Middleware to restrict route access by user role.
 * Role check is case-insensitive (e.g., 'systemadmin' matches 'Systemadmin').
 */
function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase().trim()
  );

  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }

    const currentRole = String(req.user.role || "").toLowerCase().trim();
    if (!normalizedAllowedRoles.includes(currentRole)) {
      return next(
        new AppError(
          403,
          "Forbidden: You do not have permission to access this resource"
        )
      );
    }

    next();
  };
}

module.exports = authorize;
