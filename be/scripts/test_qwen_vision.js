const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const Groq = require("groq-sdk");

async function test() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("Testing Groq with qwen/qwen3.8-27b...");

  const response = await groq.chat.completions.create({
    model: "qwen/qwen3.8-27b",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Bức ảnh này chụp thiết bị gì? Trả lời bằng tiếng Việt ngắn gọn 1 câu.",
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
    max_tokens: 200,
  });

  console.log("Response from Groq:");
  console.log(response.choices[0]?.message?.content);
  console.log("\n🎉 TEST GROQ VISION THÀNH CÔNG RỰC RỠ!");
  process.exit(0);
}

test().catch((err) => {
  console.error("❌ Lỗi Groq:", err.message);
  process.exit(1);
});

