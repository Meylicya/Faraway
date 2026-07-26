import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";

import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import { registerRoomSocket } from "./sockets/roomSocket.js";
import { getDb } from "./db/index.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
});

registerRoomSocket(io);

const PORT = process.env.PORT || 4000;

getDb().then(() => {
  server.listen(PORT, () => {
    console.log(`faraway backend listening on :${PORT}`);
  });
});
