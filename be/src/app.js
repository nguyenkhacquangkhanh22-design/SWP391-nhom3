const express = require("express");
const path = require("path");
const fs = require("fs");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const systemRoutes = require("./routes/systemRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const userRoutes = require("./routes/userRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const supportRoutes = require("./routes/supportRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const ownerRegistrationRoutes = require("./routes/ownerRegistrationRoutes");
const moderatorRoutes = require("./routes/moderatorRoutes");
const chatRoutes = require("./routes/chatRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const handleError = require("./middleware/handleError");

const app = express();

let isReady = false;
app.setServerReady = (ready = true) => {
  isReady = ready;
};

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Phục vụ thư mục ảnh tĩnh upload
const uploadDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Enable CORS for local dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Chờ Database kết nối và nạp dữ liệu xong trước khi xử lý API request
app.use((req, res, next) => {
  if (isReady || req.path === "/") {
    return next();
  }

  const startTime = Date.now();
  const checkInterval = setInterval(() => {
    if (isReady) {
      clearInterval(checkInterval);
      return next();
    }
    if (Date.now() - startTime > 30000) {
      clearInterval(checkInterval);
      return res.status(503).json({
        message: "Hệ thống đang khởi động cơ sở dữ liệu, vui lòng thử lại sau vài giây.",
      });
    }
  }, 100);
});

app.get("/", (_req, res) => {
  res.json({ message: "SmartEquip API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/equipments", marketplaceRoutes);
app.use("/api/owner-registration", ownerRegistrationRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

app.use(handleError);

module.exports = app;
