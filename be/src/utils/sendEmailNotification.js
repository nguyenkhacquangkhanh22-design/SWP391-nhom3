const nodemailer = require("nodemailer");

function getEmailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT) {
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: (SMTP_USER && SMTP_PASSWORD) ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    });
  } catch (err) {
    console.warn("Failed to create email transport:", err.message);
    return null;
  }
}

/**
 * Gửi email thông báo tự động cho Khách thuê
 */
async function sendRentalEmailNotification({ to, subject, htmlText }) {
  if (!to) return;
  const transporter = getEmailTransport();
  const fromEmail = process.env.EMAIL_FROM || "SmartEquip <no-reply@smartequip.vn>";

  if (!transporter) {
    console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html: htmlText,
    });
    console.log(`[Email Sent] To: ${to} | Subject: ${subject}`);
  } catch (err) {
    console.warn(`[Email Send Error] To: ${to}:`, err.message);
  }
}

module.exports = {
  sendRentalEmailNotification,
};

