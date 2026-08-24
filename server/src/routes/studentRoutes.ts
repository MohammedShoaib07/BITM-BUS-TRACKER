import { Router } from "express";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import {
  studentsRepo, busesRepo, routesRepo, stopsRepo, passesRepo, feesRepo,
  boardingRepo, notificationsRepo, tripsRepo
} from "../data/repositories";

const router = Router();
router.use(requireAuth, requireRole("student"));

function getStudentByUser(userId: string) {
  return studentsRepo.findOneWhere((s) => s.userId === userId);
}

router.get("/profile", (req: AuthedRequest, res) => {
  const student = getStudentByUser(req.user!.userId);
  if (!student) return res.status(404).json({ error: "Student profile not found." });

  const bus = busesRepo.findOneWhere((b) => b.id === student.assignedBusId);
  const route = routesRepo.findOneWhere((r) => r.id === student.routeId);
  const stops = stopsRepo.findWhere((s) => s.routeId === student.routeId).sort((a, b) => a.sequence - b.sequence);
  const pickupStop = stopsRepo.findOneWhere((s) => s.id === student.pickupStopId);
  const pass = passesRepo.findOneWhere((p) => p.studentId === student.id);
  const fee = feesRepo.findOneWhere((f) => f.studentId === student.id);
  const activeTrip = tripsRepo.findOneWhere((t) => t.busId === student.assignedBusId && t.status === "in_progress");

  res.json({ student, bus, route, stops, pickupStop, pass, fee, activeTrip });
});

router.get("/history", (req: AuthedRequest, res) => {
  const student = getStudentByUser(req.user!.userId);
  if (!student) return res.status(404).json({ error: "Student profile not found." });
  const history = boardingRepo.findWhere((b) => b.studentId === student.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(history);
});

router.get("/notifications", (req: AuthedRequest, res) => {
  const notes = notificationsRepo.findWhere((n) => n.userId === req.user!.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notes);
});

export default router;
