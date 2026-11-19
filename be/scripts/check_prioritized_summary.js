require("dotenv").config();
const mongoose = require("mongoose");
const Equipment = require("../src/models/Equipment");

async function checkPrioritized() {
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

  const validGear = availableEquipments.filter(
    (e) => e.title && e.title.length > 6 && (e.brand || (e.dailyRate || 0) >= 50000)
  );

  const cameras = validGear.filter(e => 
    e.title.toLowerCase().includes("máy ảnh") || 
    e.title.toLowerCase().includes("máy quay") ||
    e.title.toLowerCase().includes("gopro") ||
    (e.category && (e.category.includes("Máy ảnh") || e.category.includes("Mirrorless")))
  );
  const accessories = validGear.filter(e => !cameras.includes(e));

  const prioritized = [...cameras, ...accessories.slice(0, 8)];

  const inventorySummary = prioritized.map((eq) => ({
    id: eq._id.toString(),
    title: eq.title,
    brand: eq.brand || "",
    dailyRate: eq.dailyRate || eq.pricing?.price_per_day || 0,
    category: eq.category || "",
  }));

  console.log(`Prioritized ${inventorySummary.length} items (Cameras: ${cameras.length}):`);
  inventorySummary.forEach((e, i) => console.log(`${i+1}. [${e.category}] ${e.title}`));

  await mongoose.disconnect();
}

checkPrioritized().catch(console.error);

