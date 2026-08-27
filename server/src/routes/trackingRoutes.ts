import { Router } from "express";
import { v4 as uuid } from "uuid";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";
import { locationsRepo, tripsRepo, busesRepo, driversRepo, routesRepo, stopsRepo } from "../data/repositories";
import { buildTrackingSnapshot } from "../services/trackingEngine";
import { startSimulation, pauseSimulation, resumeSimulation, stopSimulation, isSimulating } from "../services/simulationEngine";
import { getIo } from "../sockets/ioInstance";

const router = Router();

// In-memory cache of the latest snapshot per bus, purely a read-through cache
// on top of the CSV log (bus_locations.csv remains the source of truth).
const latestSnapshotByBus = new Map<string, ReturnType<typeof buildTrackingSnapshot>>();

router.get("/public/buses", (_req, res) => {
  const buses = busesRepo.readAll()
    .map((bus) => {
      const route = routesRepo.findOneWhere((item) => item.id === bus.routeId);
      return {
        id: bus.id,
        number: Number(bus.id.replace("bus-", "")),
        registrationNumber: bus.registrationNumber,
        route: route ? { id: route.id, name: route.name, description: route.description } : null,
        activeTrip: tripsRepo.findOneWhere((trip) => trip.busId === bus.id && trip.status === "in_progress") || null
      };
    })
    .sort((a, b) => a.number - b.number);
  res.json(buses);
});

router.get("/public/buses/:busId", (req, res) => {
  const bus = busesRepo.findOneWhere((item) => item.id === req.params.busId);
  if (!bus) return res.status(404).json({ error: "Bus not found." });

  const route = routesRepo.findOneWhere((item) => item.id === bus.routeId);
  const stops = stopsRepo.findWhere((stop) => stop.routeId === bus.routeId).sort((a, b) => a.sequence - b.sequence);
  const activeTrip = tripsRepo.findOneWhere((trip) => trip.busId === bus.id && trip.status === "in_progress") || null;
  res.json({ bus, route, stops, activeTrip, snapshot: latestSnapshotByBus.get(bus.id) || null });
});

function ingestLocation(fix: {
  busId: string; tripId: string; routeId: string;
  latitude: number; longitude: number; speed: number; heading: number; timestamp: string; accuracy?: number;
}) {
  locationsRepo.insert({
    id: uuid(),
    busId: fix.busId,
    tripId: fix.tripId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: fix.speed,
    heading: fix.heading,
    accuracy: fix.accuracy ?? 0,
    timestamp: fix.timestamp
  });
  // Keep the on-disk location log bounded per bus so CSV doesn't grow unbounded.
  locationsRepo.pruneKeepLatest((r) => r.busId === fix.busId, 500, "timestamp");

  const snapshot = buildTrackingSnapshot(fix);
  latestSnapshotByBus.set(fix.busId, snapshot);

  const io = getIo();
  io.to(`bus:${fix.busId}`).emit("bus:location", snapshot);
  io.to(`route:${fix.routeId}`).emit("bus:location", snapshot);
  io.to("admin").emit("bus:location", snapshot);
}

/** Real GPS ingest — called by the driver's browser via navigator.geolocation.watchPosition(). */
router.post("/gps", requireAuth, requireRole("driver"), (req: AuthedRequest, res) => {
  const { busId, tripId, latitude, longitude, speed, heading, accuracy, timestamp } = req.body;
  const trip = tripsRepo.findOneWhere((t) => t.id === tripId && t.status === "in_progress");
  if (!trip) return res.status(400).json({ error: "No active trip found for this trip ID." });

  ingestLocation({
    busId, tripId, routeId: trip.routeId,
    latitude, longitude, speed: speed ?? 0, heading: heading ?? 0, accuracy, timestamp: timestamp || new Date().toISOString()
  });

  res.json({ ok: true });
});

/** Latest known snapshot for a bus (used on initial page load before the socket delivers a live update). */
router.get("/snapshot/:busId", requireAuth, (req, res) => {
  const snap = latestSnapshotByBus.get(req.params.busId);
  if (!snap) return res.status(404).json({ error: "No live location yet for this bus." });
  res.json(snap);
});

/** Start trip (real or simulated) — creates a real trip record either way. */
router.post("/trip/start", requireAuth, requireRole("driver", "admin"), (req: AuthedRequest, res) => {
  const { busId, mode } = req.body as { busId: string; mode: "real_gps" | "simulation" };
  const bus = busesRepo.findOneWhere((b) => b.id === busId);
  if (!bus) return res.status(404).json({ error: "Bus not found." });

  const driver = driversRepo.findOneWhere((d) => d.assignedBusId === busId);

  const trip = {
    id: uuid(),
    busId,
    routeId: bus.routeId,
    driverId: driver?.id || req.user!.userId,
    status: "in_progress" as const,
    mode,
    startedAt: new Date().toISOString(),
    endedAt: ""
  };
  tripsRepo.insert(trip);
  latestSnapshotByBus.delete(busId);

  if (mode === "simulation") {
    startSimulation(busId, trip.id, bus.routeId, ingestLocation);
  }

  getIo().to("admin").emit("trip:started", trip);
  res.json(trip);
});

router.post("/trip/:tripId/end", requireAuth, requireRole("driver", "admin"), (req, res) => {
  const trip = tripsRepo.findOneWhere((t) => t.id === req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found." });
  stopSimulation(trip.busId);
  const updated = tripsRepo.update(trip.id, { status: "completed", endedAt: new Date().toISOString() });
  getIo().to("admin").emit("trip:ended", updated);
  res.json(updated);
});

router.post("/simulation/:busId/pause", requireAuth, requireRole("driver", "admin"), (req, res) => {
  pauseSimulation(req.params.busId);
  res.json({ ok: true, status: "paused" });
});

router.post("/simulation/:busId/resume", requireAuth, requireRole("driver", "admin"), (req, res) => {
  resumeSimulation(req.params.busId);
  res.json({ ok: true, status: "running" });
});

router.post("/simulation/:busId/stop", requireAuth, requireRole("driver", "admin"), (req, res) => {
  stopSimulation(req.params.busId);
  res.json({ ok: true, status: "stopped" });
});

router.get("/simulation/:busId/status", requireAuth, (req, res) => {
  res.json({ simulating: isSimulating(req.params.busId) });
});

export default router;
