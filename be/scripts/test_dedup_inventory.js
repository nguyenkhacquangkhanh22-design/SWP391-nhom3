require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function testDedup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const rawList = await Equipment.find({
    status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
    visibility: { $ne: "hidden" },
  })
    .select("_id title category brand dailyRate pricing specifications description images")
    .sort({ createdAt: -1 })
    .lean();

  // Deduplicate by title so AI gets a diverse variety of equipment
  const seenTitles = new Set();
  const dedupedList = [];
  for (const eq of rawList) {
    const normalized = (eq.title || "").trim().toLowerCase();
    if (!seenTitles.has(normalized)) {
      seenTitles.add(normalized);
      dedupedList.push(eq);
    }
  }

  console.log(`From ${rawList.length} total items, deduplicated to ${dedupedList.length} distinct items:`);
  dedupedList.forEach((e, i) => console.log(`${i+1}. [${e.category}] ${e.title}`));

  await mongoose.disconnect();
}

testDedup().catch(console.error);

