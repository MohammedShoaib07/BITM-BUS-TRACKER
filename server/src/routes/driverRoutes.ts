import { Router } from "express";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { driversRepo, busesRepo, routesRepo, stopsRepo, tripsRepo, usersRepo } from "../data/repositories";

const router = Router();
router.use(requireAuth, requireRole("driver"));

router.get("/profile", (req: AuthedRequest, res) => {
  const driver = driversRepo.findOneWhere((d) => d.userId === req.user!.userId);
  if (!driver) return res.status(404).json({ error: "Driver profile not found." });

  const bus = busesRepo.findOneWhere((b) => b.id === driver.assignedBusId);
  const route = bus ? routesRepo.findOneWhere((r) => r.id === bus.routeId) : undefined;
  const stops = bus ? stopsRepo.findWhere((s) => s.routeId === bus.routeId).sort((a, b) => a.sequence - b.sequence) : [];
  const activeTrip = bus ? tripsRepo.findOneWhere((t) => t.busId === bus.id && t.status === "in_progress") : undefined;
  const user = usersRepo.findById(driver.userId);

  res.json({ driver: { ...driver, name: user?.name, phone: user?.phone }, bus, route, stops, activeTrip });
});

export default router;
