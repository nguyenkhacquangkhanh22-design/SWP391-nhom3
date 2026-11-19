const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Groq = require("groq-sdk");

async function listAll() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const models = await groq.models.list();
  console.log("Total models:", models.data.length);
  console.log(models.data.map(m => m.id));
  process.exit(0);
}
listAll().catch(e => console.error(e));

