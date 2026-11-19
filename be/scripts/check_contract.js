const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
require("../src/models/User");
require("../src/models/Equipment");
const RentalRequest = require("../src/models/RentalRequest");
const RentalContract = require("../src/models/RentalContract");

async function check() {
  await connectDB();
  const req = await RentalRequest.findOne({ request_code: /743840/ }).populate("equipment_id").populate("owner_id").populate("renter_id");
  console.log("Found RentalRequest:", req ? {
    id: req._id,
    code: req.request_code,
    status: req.status,
    renter: req.renter_id?.name,
    owner: req.owner_id?.name,
    equipment: req.equipment_id?.title
  } : "Not found");

  if (req) {
    const contract = await RentalContract.findOne({ request_id: req._id });
    console.log("Found Contract:", contract ? {
      id: contract._id,
      code: contract.contract_code,
      status: contract.status,
      moderatorStatus: contract.moderatorStatus,
      moderatorApproved: contract.moderatorApproved
    } : "No contract created yet");
  }
  process.exit(0);
}
check();
