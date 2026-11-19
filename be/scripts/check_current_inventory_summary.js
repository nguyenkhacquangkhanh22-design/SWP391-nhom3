require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function checkInventorySummary() {
  await mongoose.connect(process.env.MONGODB_URI);

  const rawEquipments = await Equipment.find({
    status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] },
    visibility: { $ne: "hidden" },
  })
    .select("_id title category brand model_name dailyRate pricing specifications description images")
    .sort({ createdAt: -1 })
    .lean();

  const seenTitles = new Set();
  const availableEquipments = [];
  for (const eq of rawEquipments) {
    const norm = (eq.title || "").trim().toLowerCase();
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      availableEquipments.push(eq);
    }
  }

  const relevantCategories = ["Máy ảnh & Quay phim", "Gimbal & Chân máy", "Âm thanh & Ánh sáng", "Flycam & Drone", "Máy ảnh & Ống kính"];
  const filtered = availableEquipments.filter(
    (e) => !e.category || relevantCategories.some((cat) => e.category.includes(cat))
  );

  const inventorySummary = (filtered.length > 0 ? filtered : availableEquipments).slice(0, 14).map((eq) => ({
    id: eq._id.toString(),
    title: eq.title,
    brand: eq.brand || "",
    dailyRate: eq.dailyRate || eq.pricing?.price_per_day || 0,
  }));

  console.log("Current inventorySummary (passed to Groq):");
  console.log(JSON.stringify(inventorySummary, null, 2));

  await mongoose.disconnect();
}

checkInventorySummary().catch(console.error);

