const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const Rental = require("../src/models/Rental");

async function check() {
  await connectDB();
  const allRentals = await Rental.find({}).lean();
  console.log("Total rentals count:", allRentals.length);
  for (const r of allRentals) {
    console.log({
      id: r._id,
      code: r.rentalCode,
      status: r.status,
      renter: r.renter,
      equipment: r.equipment,
      contract: r.contract
    });
  }
  process.exit(0);
}
check();

