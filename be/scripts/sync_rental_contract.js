const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/db");
const Rental = require("../src/models/Rental");
const RentalRequest = require("../src/models/RentalRequest");
const RentalContract = require("../src/models/RentalContract");

async function sync() {
  await connectDB();

  const reqDoc = await RentalRequest.findOne({ request_code: /743840/ });
  if (!reqDoc) {
    console.error("Không tìm thấy RentalRequest REQ-743840-4277");
    process.exit(1);
  }

  const contract = await RentalContract.findOne({ request_id: reqDoc._id });
  if (!contract) {
    console.error("Không tìm thấy RentalContract");
    process.exit(1);
  }

  console.log("Found RentalRequest:", reqDoc.request_code);
  console.log("Found Contract:", contract.contract_code, "status:", contract.status);

  // Tạo hoặc cập nhật bản ghi Rental tương ứng
  let rental = await Rental.findOne({ rentalCode: reqDoc.request_code });
  if (!rental) {
    rental = new Rental({
      rentalCode: reqDoc.request_code,
      renter: reqDoc.renter_id,
      equipment: reqDoc.equipment_id,
      owner: reqDoc.owner_id,
      startDate: reqDoc.start_date,
      endDate: reqDoc.end_date,
      totalDays: reqDoc.duration_days || 3,
      dailyRate: (reqDoc.rental_fee / (reqDoc.duration_days || 3)) || 650000,
      rentalFee: reqDoc.rental_fee,
      depositAmount: 0,
      totalAmount: reqDoc.rental_fee,
      status: "APPROVED",
      deliveryAddress: "123 Quốc lộ 1A, Cái Bè, Tiền Giang",
      contract: {
        contractNumber: contract.contract_code,
        termsAccepted: false,
        contractTerms: contract.terms_content,
        moderatorApproved: contract.status === "moderator_approved",
        moderatorStatus: contract.status,
        ownerSigned: Boolean(contract.owner_signature?.signed),
      },
    });
  } else {
    rental.status = "APPROVED";
    rental.contract = {
      contractNumber: contract.contract_code,
      termsAccepted: false,
      contractTerms: contract.terms_content,
      moderatorApproved: contract.status === "moderator_approved",
      moderatorStatus: contract.status,
      ownerSigned: Boolean(contract.owner_signature?.signed),
    };
  }

  await rental.save();
  console.log("✅ Đã đồng bộ thành công bản ghi Rental:", {
    id: rental._id,
    code: rental.rentalCode,
    status: rental.status,
    contract: rental.contract,
  });

  process.exit(0);
}

sync().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});

