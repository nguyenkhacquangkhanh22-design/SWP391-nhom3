const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const Rental = require("../src/models/Rental");
const User = require("../src/models/User");

async function test() {
  await connectDB();
  const user = await User.findOne({ email: "customer_kyc@test.com" });
  console.log("Customer id:", user._id.toString());

  const rental = await Rental.findOne({ rentalCode: /743840/ });
  console.log("Rental found:", rental ? {
    id: rental._id,
    code: rental.rentalCode,
    renter: rental.renter?.toString(),
    isMatch: rental.renter?.toString() === user._id.toString()
  } : "No rental found");

  process.exit(0);
}
test();

