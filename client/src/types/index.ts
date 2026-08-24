export type Role = "student" | "driver" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string;
  student?: { id: string; rollNumber: string; routeId: string; assignedBusId: string; pickupStopId: string };
  driver?: { id: string; licenseNumber: string; assignedBusId: string };
}

export interface Stop {
  id: string;
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface RouteRec {
  id: string;
  name: string;
  description: string;
}

export interface Bus {
  id: string;
  registrationNumber: string;
  routeId: string;
  capacity: number;
  status: string;
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

export interface BoardingRecord {
  id: string;
  studentId: string;
  busId: string;
  tripId: string;
  result: "ALLOW" | "DENY";
  reason: string;
  timestamp: string;
}
