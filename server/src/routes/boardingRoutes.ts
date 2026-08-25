import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { evaluateBoarding } from "../services/authorizationEngine";
import { studentsRepo, passesRepo, driversRepo, usersRepo } from "../data/repositories";
import { AuthedRequest } from "../middleware/auth";
import { getIo } from "../sockets/ioInstance";

const router = Router();
router.use(requireAuth, requireRole("driver", "admin"));

/**
 * Driver scans a student's QR pass. Payload contains the student's pass
 * number (encoded in the QR). Runs the real authorization engine and
 * broadcasts the result live to the admin dashboard.
 */
router.post("/scan", (req, res) => {
  const { passNumber, busId, tripId } = req.body as { passNumber: string; busId: string; tripId: string };

  const pass = passesRepo.findOneWhere((p) => p.passNumber === passNumber);
  if (!pass) {
    getIo().to("admin").emit("boarding:event", { result: "DENY", reason: "Unknown pass number.", passNumber, busId });
    return res.status(404).json({ result: "DENY", reason: "Unknown pass number." });
  }

  const student = studentsRepo.findOneWhere((s) => s.id === pass.studentId);
  if (!student) {
    return res.status(404).json({ result: "DENY", reason: "Student not found for this pass." });
  }

  const outcome = evaluateBoarding(student.id, busId, tripId);
  getIo().to("admin").emit("boarding:event", { ...outcome, studentId: student.id, busId, timestamp: new Date().toISOString() });

  res.json({ ...outcome, student: { id: student.id, rollNumber: student.rollNumber } });
});

router.post("/monthly-verify", (req: AuthedRequest, res) => {
  const driver = req.user?.role === "driver"
    ? driversRepo.findOneWhere((d) => d.userId === req.user?.userId)
    : undefined;
  const busId = driver?.assignedBusId || (req.body as { busId?: string }).busId;
  if (!busId) return res.status(400).json({ error: "No bus is assigned to this driver." });

  const today = new Date();
  const verificationDate = today.toISOString().slice(0, 10);
  const monthKey = verificationDate.slice(0, 7);
  const warningEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 30));
  const warningEndDate = warningEnd.toISOString().slice(0, 10);
  const busStudents = studentsRepo.findWhere((student) => student.assignedBusId === busId);
  const wasAlreadyVerified = busStudents.length > 0 && busStudents.every((student) => {
    const pass = passesRepo.findOneWhere((item) => item.studentId === student.id);
    return pass?.lastVerifiedAt?.slice(0, 7) === monthKey;
  });
  const results = busStudents.map((student) => {
    const pass = passesRepo.findOneWhere((item) => item.studentId === student.id);
    const user = usersRepo.findById(student.userId);
    if (!pass) {
      return { studentId: student.id, name: user?.name || "Unknown student", rollNumber: student.rollNumber, status: "missing", expiryDate: null, passNumber: null };
    }
    const alreadyVerified = pass.lastVerifiedAt?.slice(0, 7) === monthKey;
    if (!alreadyVerified) passesRepo.update(pass.id, { lastVerifiedAt: verificationDate });
    const expired = pass.validTo < verificationDate;
    const expiresSoon = !expired && pass.validTo <= warningEndDate;
    return {
      studentId: student.id,
      name: user?.name || "Unknown student",
      rollNumber: student.rollNumber,
      passNumber: pass.passNumber,
      expiryDate: pass.validTo,
      status: expired ? "expired" : expiresSoon ? "expires_this_month" : "valid",
      lastVerifiedAt: alreadyVerified ? pass.lastVerifiedAt : verificationDate
    };
  });

  res.json({
    busId,
    verificationDate,
    alreadyVerified: wasAlreadyVerified,
    students: results,
    expiringStudents: results.filter((student) => student.status === "expires_this_month")
  });
});

export default router;
