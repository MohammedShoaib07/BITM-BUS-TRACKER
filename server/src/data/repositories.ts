import { CsvRepository } from "./csvRepository";
import {
  User, Student, Driver, Bus, RouteRec, Stop, BusPass, BusFee,
  Trip, BusLocation, BoardingRecord, UnauthorizedAttempt, Notification
} from "../types";

export const usersRepo = new CsvRepository<User>("users.csv", [
  "id", "email", "passwordHash", "role", "name", "phone"
]);

export const studentsRepo = new CsvRepository<Student>("students.csv", [
  "id", "userId", "rollNumber", "routeId", "assignedBusId", "pickupStopId"
]);

export const driversRepo = new CsvRepository<Driver>("drivers.csv", [
  "id", "userId", "licenseNumber", "assignedBusId"
]);

export const busesRepo = new CsvRepository<Bus>("buses.csv", [
  "id", "registrationNumber", "routeId", "capacity", "status"
]);

export const routesRepo = new CsvRepository<RouteRec>("routes.csv", [
  "id", "name", "description"
]);

export const stopsRepo = new CsvRepository<Stop>("stops.csv", [
  "id", "routeId", "name", "latitude", "longitude", "sequence"
]);

export const passesRepo = new CsvRepository<BusPass>("bus_passes.csv", [
  "id", "studentId", "passNumber", "status", "validFrom", "validTo", "lastVerifiedAt"
]);

export const feesRepo = new CsvRepository<BusFee>("bus_fees.csv", [
  "id", "studentId", "status", "amount", "dueDate", "updatedAt"
]);

export const tripsRepo = new CsvRepository<Trip>("trips.csv", [
  "id", "busId", "routeId", "driverId", "status", "mode", "startedAt", "endedAt"
]);

export const locationsRepo = new CsvRepository<BusLocation>("bus_locations.csv", [
  "id", "busId", "tripId", "latitude", "longitude", "speed", "heading", "accuracy", "timestamp"
]);

export const boardingRepo = new CsvRepository<BoardingRecord>("boarding_records.csv", [
  "id", "studentId", "busId", "tripId", "result", "reason", "timestamp"
]);

export const unauthorizedRepo = new CsvRepository<UnauthorizedAttempt>("unauthorized_attempts.csv", [
  "id", "studentId", "busId", "reason", "timestamp"
]);

export const notificationsRepo = new CsvRepository<Notification>("notifications.csv", [
  "id", "userId", "title", "message", "read", "createdAt"
]);
