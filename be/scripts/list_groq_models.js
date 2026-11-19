const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Groq = require("groq-sdk");

async function listModels() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const models = await groq.models.list();
  console.log("Supported Groq Models:");
  const visionModels = [];
  for (const m of models.data) {
    console.log(`- ${m.id} (owned by ${m.owned_by})`);
    if (m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("vl") || m.id.toLowerCase().includes("multimodal")) {
      visionModels.push(m.id);
    }
  }
  console.log("\nPossible Vision Models:", visionModels);
  process.exit(0);
}

listModels().catch(err => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});

