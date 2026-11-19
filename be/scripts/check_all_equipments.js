require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function checkAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await Equipment.countDocuments();
  console.log("Total Equipment count in DB:", total);

  // Group by status
  const byStatus = await Equipment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  console.log("By status:", byStatus);

  // Group by visibility
  const byVis = await Equipment.aggregate([
    { $group: { _id: "$visibility", count: { $sum: 1 } } }
  ]);
  console.log("By visibility:", byVis);

  // Sample items
  const samples = await Equipment.find({}).select("title status visibility category").limit(15).lean();
  console.log("Samples:", samples);

  await mongoose.disconnect();
}

checkAll().catch(console.error);

