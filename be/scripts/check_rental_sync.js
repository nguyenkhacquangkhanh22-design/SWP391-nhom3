const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const Rental = require("../src/models/Rental");
const RentalContract = require("../src/models/RentalContract");
const RentalRequest = require("../src/models/RentalRequest");

async function check() {
  await connectDB();
  const rentals = await Rental.find({}).sort({ createdAt: -1 }).limit(5);
  console.log("Recent Rentals in Rental model:", rentals.map(r => ({
    id: r._id,
    code: r.rental_code,
    status: r.status,
    renter_id: r.renter_id,
    contract_id: r.contract_id
  })));

  const contracts = await RentalContract.find({ contract_code: "HD-2026-554305" });
  console.log("Contract HD-2026-554305:", contracts.map(c => ({
    id: c._id,
    code: c.contract_code,
    status: c.status,
    renter_id: c.renter_id,
    owner_id: c.owner_id,
    renter_signature: c.renter_signature,
    moderator_status: c.moderator_status,
    moderator_approved: c.moderator_approved,
    rental_id: c.rental_id
  })));

  process.exit(0);
}
check();

