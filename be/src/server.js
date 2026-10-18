const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dns = require("node:dns");
const app = require("./app");
const connectDB = require("./config/db");

const port = process.env.PORT || 3000;

function configureDnsServers() {
  const configuredServers = process.env.DNS_SERVERS;
  if (!configuredServers) {
    return;
  }

  const servers = configuredServers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length === 0) {
    throw new Error("DNS_SERVERS must contain at least one DNS server address");
  }

  dns.setServers(servers);
  console.log(`Using configured DNS servers: ${servers.join(", ")}`);
}

async function startServer() {
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port} (initializing database...)`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ CỔNG ${port} ĐANG BỊ CHIẾM DỤNG (EADDRINUSE)!`);
      console.error(`Có một cửa sổ terminal khác đang chạy server ngầm.`);
      console.error(`👉 Khắc phục: Chạy lệnh sau trong PowerShell để giải phóng cổng:`);
      console.error(`   Stop-Process -Name node -Force\n`);
      process.exit(1);
    } else {
      console.error("Server listen error:", err.message);
      process.exit(1);
    }
  });

  configureDnsServers();
  await connectDB();

  try {
    const seedData = require("./utils/seedData");
    await seedData();
  } catch (seedErr) {
    console.warn("Seed data notice:", seedErr.message);
  }

  if (typeof app.setServerReady === "function") {
    app.setServerReady(true);
  }
  console.log(`✓ Database & Seed Data ready! Server is fully operational on port ${port}`);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
