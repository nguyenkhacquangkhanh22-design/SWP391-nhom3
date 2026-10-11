const mongoose = require("mongoose");

async function connectDB() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in the environment");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
}

module.exports = connectDB;
