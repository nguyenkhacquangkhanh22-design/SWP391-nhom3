const http = require("node:http");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dns = require("node:dns");
const app = require("./app");
const connectDB = require("./config/db");
const { initSocket } = require("./config/socket");

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
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(port, () => {
    console.log(`Server is running on port ${port} with Socket.IO enabled`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
