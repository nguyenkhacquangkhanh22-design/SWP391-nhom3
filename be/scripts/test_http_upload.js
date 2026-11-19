require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const app = require("../src/app");

async function testHttpEndpoint() {
  console.log("=== KIỂM THỬ TỰ ĐỘNG TÍCH HỢP HTTP API /api/ai/shot-to-gear ===");
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartequip";
  await mongoose.connect(mongoUri);
  app.setServerReady(true);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`✓ Test Server tạm thời đang chạy trên cổng ${port}`);

  try {
    const testPayload = {
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
    };

    console.log("-> Gửi request POST tới http://localhost:" + port + "/api/ai/shot-to-gear");
    const res = await fetch(`http://localhost:${port}/api/ai/shot-to-gear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    const data = await res.json();
    console.log("HTTP Status Code:", res.status);
    console.log("API Response Success:", data.success);
    console.log("API Response Message:", data.message);
    if (!data.success) {
      throw new Error("API trả về thất bại: " + JSON.stringify(data));
    }

    console.log("\n[KẾT QUẢ TRẢ VỀ CHO FRONTEND]");
    console.log("Match Status:", data.data.match_status);
    console.log("Confidence:", data.data.match_confidence + "%");
    console.log("Body đề xuất:", data.data.recommended_combo?.body_title);
    console.log("Body ID:", data.data.recommended_combo?.body_equipment_id);
    console.log("Focal Length:", data.data.optical_analysis?.estimated_focal_length);
    console.log("Aperture:", data.data.optical_analysis?.estimated_aperture);
    console.log("Shooting Tips:", data.data.shooting_tips);
    console.log("\n✓ HTTP Integration Test PASSED 100%!");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testHttpEndpoint().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});