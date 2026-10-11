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
  configureDnsServers();
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
