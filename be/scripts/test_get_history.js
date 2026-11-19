const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const rentalService = require("../src/services/rentalService");

async function test() {
  await connectDB();
  const user = await User.findOne({ email: "customer_kyc@test.com" });
  console.log("Customer id:", user._id);
  const res = await rentalService.getRentalHistory(user._id);
  console.log(
    "getRentalHistory count:",
    res.rentals.length,
    res.rentals.map((r) => ({
      id: r._id,
      code: r.rentalCode,
      status: r.status,
      equipment: r.equipment?.title,
      contract: {
        number: r.contract?.contractNumber,
        moderatorStatus: r.contract?.moderatorStatus,
        moderatorApproved: r.contract?.moderatorApproved,
        ownerSigned: r.contract?.ownerSigned,
      },
    }))
  );
  process.exit(0);
}
test();

