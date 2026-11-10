import { io, Socket } from "socket.io-client";

// Connect to backend URL via environment variable or current host
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined"
    ? window.location.port === "5173"
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin
    : "http://localhost:3000");

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socket;
}
