const { Server } = require("socket.io");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Client joins room (e.g., "admin", "owner", or specific ticket ID "ticket_123")
    socket.on("join", (room) => {
      if (room) {
        socket.join(room);
      }
    });

    socket.on("leave", (room) => {
      if (room) {
        socket.leave(room);
      }
    });

    socket.on("disconnect", () => {
      // Client disconnected
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    return {
      emit: () => {},
      to: () => ({ emit: () => {} }),
    };
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};
