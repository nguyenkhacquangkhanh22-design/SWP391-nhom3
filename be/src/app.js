const express = require("express");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const ownerRegistrationRoutes = require("./routes/ownerRegistrationRoutes");
const handleError = require("./middleware/handleError");

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SWP391-nhom3 API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/equipments", marketplaceRoutes);
app.use("/api/owner-registration", ownerRegistrationRoutes);
app.use(handleError);

module.exports = app;
