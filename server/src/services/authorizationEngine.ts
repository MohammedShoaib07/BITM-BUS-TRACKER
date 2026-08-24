import { v4 as uuid } from "uuid";
import { studentsRepo, passesRepo, feesRepo, boardingRepo, unauthorizedRepo, busesRepo } from "../data/repositories";

export interface AuthorizationResult {
  result: "ALLOW" | "DENY";
  reason: string;
}

/**
 * Real authorization engine. Verifies, in order:
 * 1. Student exists / has an assignment
 * 2. Bus pass is valid (and not expired by date)
 * 3. Bus fee is PAID
 * 4. The bus being boarded matches the student's assigned bus + route
 * Every decision is written to boarding_records.csv (and, on denial,
 * unauthorized_attempts.csv) so the admin dashboard reflects real events.
 */
export function evaluateBoarding(studentId: string, busId: string, tripId: string): AuthorizationResult {
  const student = studentsRepo.findOneWhere((s) => s.id === studentId);
  const bus = busesRepo.findOneWhere((b) => b.id === busId);
  const now = new Date().toISOString();

  const deny = (reason: string): AuthorizationResult => {
    unauthorizedRepo.insert({ id: uuid(), studentId, busId, reason, timestamp: now });
    boardingRepo.insert({ id: uuid(), studentId, busId, tripId, result: "DENY", reason, timestamp: now });
    return { result: "DENY", reason };
  };

  if (!student) return deny("Student record not found.");
  if (!bus) return deny("Bus record not found.");

  const pass = passesRepo.findOneWhere((p) => p.studentId === studentId);
  if (!pass || pass.status !== "valid") {
    return deny("Digital bus pass is not valid.");
  }
  if (new Date(pass.validTo).getTime() < Date.now()) {
    return deny("Digital bus pass has expired.");
  }

  const fee = feesRepo.findOneWhere((f) => f.studentId === studentId);
  if (!fee || fee.status !== "PAID") {
    return deny("Transportation fee is not active.");
  }

  if (student.assignedBusId !== busId) {
    return deny("Student is not assigned to this bus.");
  }

  if (student.routeId !== bus.routeId) {
    return deny("Student's route does not match this bus's route.");
  }

  const reason = "Pass valid, fee paid, correct bus and route.";
  boardingRepo.insert({ id: uuid(), studentId, busId, tripId, result: "ALLOW", reason, timestamp: now });
  return { result: "ALLOW", reason };
}
