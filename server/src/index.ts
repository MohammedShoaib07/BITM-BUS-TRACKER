import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes";
import studentRoutes from "./routes/studentRoutes";
import driverRoutes from "./routes/driverRoutes";
import adminRoutes from "./routes/adminRoutes";
import trackingRoutes from "./routes/trackingRoutes";
import boardingRoutes from "./routes/boardingRoutes";
import { setIo } from "./sockets/ioInstance";
import { registerSockets } from "./sockets";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});
setIo(io);
registerSockets(io);

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "bitm-smartbus-server", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/boarding", boardingRoutes);

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`BITM SmartBus server listening on port ${PORT}`);
  console.log(`Socket.IO ready. Accepting client origin: ${CLIENT_ORIGIN}`);
});
