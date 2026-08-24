import { Server, Socket } from "socket.io";
import { verifyToken } from "../middleware/auth";

export function registerSockets(io: Server) {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(); // allow anonymous read-only viewers of public bus locations
    try {
      (socket.data as any).user = verifyToken(token);
    } catch {
      // invalid token: still allow connection, just untrusted/unauthenticated
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    socket.on("subscribe:bus", (busId: string) => {
      socket.join(`bus:${busId}`);
    });

    socket.on("unsubscribe:bus", (busId: string) => {
      socket.leave(`bus:${busId}`);
    });

    socket.on("subscribe:route", (routeId: string) => {
      socket.join(`route:${routeId}`);
    });

    socket.on("subscribe:admin", () => {
      const user = (socket.data as any).user;
      if (user?.role === "admin") socket.join("admin");
    });

    socket.on("disconnect", () => {
      // no-op; rooms are cleaned up automatically
    });
  });
}
