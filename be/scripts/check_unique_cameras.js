require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function checkCameras() {
  await mongoose.connect(process.env.MONGODB_URI);
  const allEquips = await Equipment.find({
    status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
  }).select("title category brand dailyRate visibility").lean();

  console.log("Total AVAILABLE in DB:", allEquips.length);
  const titles = allEquips.map(e => `[${e.category}] ${e.title} (${e.brand}) - Vis: ${e.visibility}`);
  console.log("All Unique Titles:");
  const unique = [...new Set(titles)];
  unique.forEach((u, i) => console.log(`${i+1}. ${u}`));

  await mongoose.disconnect();
}

checkCameras().catch(console.error);

