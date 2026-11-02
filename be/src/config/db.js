const mongoose = require("mongoose");

let memoryServer = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder =
    !uri ||
    uri.includes("YOUR_USER") ||
    uri.includes("YOUR_PASSWORD") ||
    uri.includes("cluster.mongodb.net");

  if (!isPlaceholder) {
    try {
      console.log("Connecting to configured MongoDB...");
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected successfully");
      return;
    } catch (err) {
      console.warn("Failed to connect to configured MONGODB_URI:", err.message);
      console.warn("Falling back to local in-memory MongoDB database...");
    }
  } else {
    console.log("No valid external MONGODB_URI configured. Starting in-memory MongoDB for local dev...");
  }

  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`In-memory MongoDB connected successfully at ${memoryUri}`);
  } catch (memErr) {
    console.error("Failed to start in-memory MongoDB:", memErr.message);
    throw memErr;
  }
}

module.exports = connectDB;
