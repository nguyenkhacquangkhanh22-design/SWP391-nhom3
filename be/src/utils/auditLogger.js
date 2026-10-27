const AuditLog = require("../models/AuditLog");

/**
 * Record an administrative activity into the audit log.
 * @param {object} req - Express request object containing req.user and network headers.
 * @param {object} options - Audit payload details.
 * @param {string} options.action - Action identifier (e.g. 'EQUIPMENT_APPROVED', 'DISPUTE_RESOLVED', etc.)
 * @param {string} options.targetType - Model name / category ('Equipment', 'Dispute', 'User', 'SupportTicket', etc.)
 * @param {string} [options.targetId] - Target entity identifier.
 * @param {string} [options.targetLabel] - Human-readable entity label (e.g. Title, Email, Dispute Code).
 * @param {object} [options.details] - Arbitrary context details or changes diff.
 */
async function recordAuditLog(req, {
  action,
  targetType,
  targetId = "",
  targetLabel = "",
  details = {},
}) {
  try {
    const actor = req?.user || {};
    const ipAddress =
      req?.headers?.["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      "127.0.0.1";
    const userAgent = req?.headers?.["user-agent"] || "Antigravity/AdminPortal";

    return await AuditLog.create({
      actor_id: actor._id || actor.id,
      actor_name: actor.name || "System Admin",
      actor_email: actor.email || "admin@smartequip.com",
      actor_role: actor.role || "systemadmin",
      action,
      target_type: targetType,
      target_id: String(targetId || ""),
      target_label: String(targetLabel || ""),
      details,
      ip_address: String(ipAddress),
      user_agent: String(userAgent),
    });
  } catch (err) {
    console.error("Failed to record audit log:", err.message);
    return null;
  }
}

module.exports = { recordAuditLog };
