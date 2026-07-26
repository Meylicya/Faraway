import { io } from "socket.io-client";

let socket = null;

// Connect once, reusing the token stored at login.
// Server state is the source of truth; we only render what it pushes to us.
export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem("faraway_token");
  socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
    auth: { token },
    autoConnect: false,
  });

  return socket;
}
