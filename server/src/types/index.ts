export type Role = "student" | "driver" | "admin";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  phone: string;
}

export interface Student {
  id: string;
  userId: string;
  rollNumber: string;
  routeId: string;
  assignedBusId: string;
  pickupStopId: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  assignedBusId: string;
}

export interface Bus {
  id: string;
  registrationNumber: string;
  routeId: string;
  capacity: number;
  status: "active" | "inactive" | "maintenance";
}

export interface RouteRec {
  id: string;
  name: string;
  description: string;
}

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface BusPass {
  id: string;
  studentId: string;
  passNumber: string;
  status: "valid" | "expired" | "suspended";
  validFrom: string;
  validTo: string;
}

export interface BusFee {
  id: string;
  studentId: string;
  status: "PAID" | "PENDING";
  amount: number;
  dueDate: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  mode: "real_gps" | "simulation";
  startedAt: string;
  endedAt: string;
}

export interface BusLocation {
  id: string;
  busId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
}

export interface BoardingRecord {
  id: string;
  studentId: string;
  busId: string;
  tripId: string;
  result: "ALLOW" | "DENY";
  reason: string;
  timestamp: string;
}

export interface UnauthorizedAttempt {
  id: string;
  studentId: string;
  busId: string;
  reason: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TrackingSnapshot {
  busId: string;
  tripId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  previousStopId: string | null;
  previousStopName: string | null;
  nextStopId: string | null;
  nextStopName: string | null;
  progressPercent: number;
  distanceToNextStopMeters: number;
  etaToNextStopSeconds: number;
  stopEtas: { stopId: string; stopName: string; sequence: number; distanceMeters: number; etaSeconds: number }[];
}
