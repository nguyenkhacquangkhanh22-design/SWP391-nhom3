const express = require("express");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const ownerRegistrationRoutes = require("./routes/ownerRegistrationRoutes");
const moderatorRoutes = require("./routes/moderatorRoutes");
const handleError = require("./middleware/handleError");

const app = express();

let isReady = false;
app.setServerReady = (ready = true) => {
  isReady = ready;
};

app.use(express.json());

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
  res.json({ message: "SWP391-nhom3 API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/equipments", marketplaceRoutes);
app.use("/api/owner-registration", ownerRegistrationRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use(handleError);

module.exports = app;
