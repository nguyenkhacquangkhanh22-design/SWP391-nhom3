const express = require("express");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const systemRoutes = require("./routes/systemRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const userRoutes = require("./routes/userRoutes");
const rentalRoutes = require("./routes/rentalRoutes");
const supportRoutes = require("./routes/supportRoutes");
const handleError = require("./middleware/handleError");

const app = express();

app.use(express.json());

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
app.use(handleError);

module.exports = app;
