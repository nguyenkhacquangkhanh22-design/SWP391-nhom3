const express = require("express");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const handleError = require("./middleware/handleError");

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "SWP391-nhom3 API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use(handleError);

module.exports = app;
