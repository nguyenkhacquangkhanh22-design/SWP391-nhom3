require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const list = await Equipment.find({
    status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
    visibility: { $ne: "hidden" },
  })
    .select("_id title category brand dailyRate pricing")
    .limit(30)
    .lean();

  console.log("Total matching equipments in query:", list.length);
  list.forEach((item, i) => {
    console.log(`${i + 1}. [${item.category}] ${item.title} (${item.brand}) - Rate: ${item.dailyRate || item.pricing?.price_per_day}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);

