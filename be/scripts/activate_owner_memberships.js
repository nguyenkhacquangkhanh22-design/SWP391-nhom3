require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Equipment = require("../src/models/Equipment");
const OwnerMembership = require("../src/models/OwnerMembership");

async function activateMemberships() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const owners = await User.find({ role: "owner" });
  console.log(`Found ${owners.length} owners.`);

  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  for (const owner of owners) {
    await OwnerMembership.findOneAndUpdate(
      { owner_id: owner._id },
      {
        owner_id: owner._id,
        plan_code: "yearly",
        amount: 2000000,
        status: "active",
        started_at: new Date(),
        expires_at: oneYearLater,
        duration_months: 12,
        paid_at: new Date(),
      },
      { upsert: true, new: true }
    );
    console.log(`✓ Activated 1-year membership for owner: ${owner.email}`);
  }

  // Unhide all equipment
  const result = await Equipment.updateMany(
    { status: { $in: ["available", "AVAILABLE", "active", "ACTIVE"] } },
    {
      $set: {
        visibility: "published",
        membership_hidden: false,
        hidden_reason: "",
      },
    }
  );
  console.log(`✓ Unhid and published ${result.modifiedCount} equipments.`);

  await mongoose.disconnect();
}

activateMemberships().catch(console.error);

