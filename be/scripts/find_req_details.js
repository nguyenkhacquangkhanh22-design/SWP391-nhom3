const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const RentalRequest = require("../src/models/RentalRequest");
const RentalContract = require("../src/models/RentalContract");

async function check() {
  await connectDB();
  const req = await RentalRequest.findOne({ request_code: /743840/ }).lean();
  console.log("RentalRequest REQ-743840-4277:", req);
  const contract = await RentalContract.findOne({ request_id: req._id }).lean();
  console.log("RentalContract for REQ-743840-4277:", contract);
  process.exit(0);
}
check();

