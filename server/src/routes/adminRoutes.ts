import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  busesRepo, routesRepo, stopsRepo, studentsRepo, feesRepo, passesRepo,
  tripsRepo, boardingRepo, unauthorizedRepo, usersRepo
} from "../data/repositories";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/fleet", (_req, res) => {
  const buses = busesRepo.readAll();
  const trips = tripsRepo.findWhere((t) => t.status === "in_progress");
  const routes = routesRepo.readAll();
  res.json({
    buses: buses.map((b) => ({
      ...b,
      route: routes.find((r) => r.id === b.routeId),
      activeTrip: trips.find((t) => t.busId === b.id) || null
    }))
  });
});

router.get("/students", (_req, res) => {
  const students = studentsRepo.readAll();
  const users = usersRepo.readAll();
  const fees = feesRepo.readAll();
  const passes = passesRepo.readAll();
  res.json(
    students.map((s) => ({
      ...s,
      user: users.find((u) => u.id === s.userId),
      fee: fees.find((f) => f.studentId === s.id),
      pass: passes.find((p) => p.studentId === s.id)
    }))
  );
});

router.get("/routes", (_req, res) => {
  const routes = routesRepo.readAll();
  const stops = stopsRepo.readAll();
  res.json(routes.map((r) => ({ ...r, stops: stops.filter((s) => s.routeId === r.id).sort((a, b) => a.sequence - b.sequence) })));
});

router.get("/boarding", (_req, res) => {
  res.json(boardingRepo.readAll().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200));
});

router.get("/alerts", (_req, res) => {
  res.json(unauthorizedRepo.readAll().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200));
});

/** Toggle a student's fee status — real state change, drives boarding authorization live. */
router.patch("/fees/:studentId", (req, res) => {
  const { status } = req.body as { status: "PAID" | "PENDING" };
  const fee = feesRepo.findOneWhere((f) => f.studentId === req.params.studentId);
  if (!fee) return res.status(404).json({ error: "Fee record not found." });
  const updated = feesRepo.update(fee.id, { status, updatedAt: new Date().toISOString() });
  res.json(updated);
});

/** Toggle a student's pass status. */
router.patch("/passes/:studentId", (req, res) => {
  const { status } = req.body as { status: "valid" | "expired" | "suspended" };
  const pass = passesRepo.findOneWhere((p) => p.studentId === req.params.studentId);
  if (!pass) return res.status(404).json({ error: "Pass record not found." });
  const updated = passesRepo.update(pass.id, { status });
  res.json(updated);
});

export default router;
