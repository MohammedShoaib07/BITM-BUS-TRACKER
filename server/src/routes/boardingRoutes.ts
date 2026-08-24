import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { evaluateBoarding } from "../services/authorizationEngine";
import { studentsRepo, passesRepo } from "../data/repositories";
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

export default router;
