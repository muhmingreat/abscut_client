
import { io } from "socket.io-client";

// ============================================================
// ABS CUT — CHAT SOCKET SERVICE
// ============================================================

// Set VITE_API_URL in your frontend .env file.
// Example: VITE_API_URL=http://localhost:5000/api

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

// Socket.IO connects to the server origin, not the REST API path.
const SOCKET_URL = API_URL.replace(/\/api\/?$/i, "");

let socket = null;
let connectedToken = null;

const SOCKET_OPTIONS = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  transports: ["websocket", "polling"],
};

function createSocket(token) {
  const instance = io(SOCKET_URL, {
    ...SOCKET_OPTIONS,
    auth: { token },
  });

  instance.on("connect", () => {
    console.info("ABS CUT chat connected:", instance.id);
  });

  instance.on("disconnect", (reason) => {
    console.info("ABS CUT chat disconnected:", reason);
  });

  instance.on("connect_error", (error) => {
    console.error("ABS CUT chat connection error:", error.message);

    const authenticationErrors = [
      "Authentication required",
      "Invalid or expired authentication token",
      "User account not found",
    ];

    if (authenticationErrors.includes(error.message)) {
      instance.disconnect();
    }
  });

  return instance;
}

// Connect the logged-in customer or admin.
export function connectChatSocket() {
  const token = localStorage.getItem("absCutToken");

  if (!token) {
    disconnectChatSocket();
    throw new Error("Please log in to use ABS CUT chat.");
  }

  // Replace the socket if the logged-in account has changed.
  if (socket && connectedToken !== token) {
    disconnectChatSocket();
  }

  if (!socket) {
    socket = createSocket(token);
    connectedToken = token;
  }

  if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
}

// Return the existing socket without creating another one.
export function getChatSocket() {
  return socket;
}

// Check whether the socket is currently connected.
export function isChatSocketConnected() {
  return Boolean(socket?.connected);
}

// Disconnect during logout or account switching.
export function disconnectChatSocket() {
  if (!socket) {
    connectedToken = null;
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();

  socket = null;
  connectedToken = null;
}

// Call this after the saved authentication token changes.
export function refreshChatSocketAuthentication() {
  disconnectChatSocket();

  if (localStorage.getItem("absCutToken")) {
    return connectChatSocket();
  }

  return null;
}


