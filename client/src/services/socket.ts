import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token: localStorage.getItem("bitm_token") || undefined },
      autoConnect: true,
      transports: ["websocket", "polling"]
    });
  }
  return socket;
}

export function reconnectSocketWithAuth() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
}
