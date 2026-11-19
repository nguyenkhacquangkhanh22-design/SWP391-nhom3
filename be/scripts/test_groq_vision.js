const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Groq = require("groq-sdk");

async function test() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("Testing Groq Vision API with llama-3.2-11b-vision-preview...");

  const response = await groq.chat.completions.create({
    model: "llama-3.2-11b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Phân tích nhanh bức ảnh này: thể loại gì, bối cảnh chụp ở đâu?",
          },
          {
            type: "image_url",
            image_url: {
              url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 300,
  });

  console.log("Response from Groq:");
  console.log(response.choices[0]?.message?.content);
  console.log("\n✅ Groq Vision API hoạt động hoàn hảo!");
  process.exit(0);
}

test().catch((err) => {
  console.error("❌ Lỗi Groq:", err.message);
  process.exit(1);
});

