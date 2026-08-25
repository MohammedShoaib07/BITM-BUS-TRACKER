import { stopsRepo } from "../data/repositories";
import { interpolate, calculateDistance, calculateBearing } from "../utils/haversine";

type IngestFn = (fix: {
  busId: string; tripId: string; routeId: string;
  latitude: number; longitude: number; speed: number; heading: number; timestamp: string;
}) => void;

interface SimState {
  busId: string;
  tripId: string;
  routeId: string;
  segmentIndex: number;
  t: number; // progress along current segment, 0..1
  speedMps: number;
  timer: NodeJS.Timeout | null;
  status: "running" | "paused";
}

const TICK_MS = 500;
const TARGET_DURATION_SECONDS = 18;

const activeSims = new Map<string, SimState>(); // key: busId

/**
 * Simulation Engine -> ingestLocation() -> Tracking Engine -> Socket.IO
 * This is the exact same code path real driver GPS uses (see
 * trackingController.ingestLocation). The simulator only stands in for the
 * hardware GPS chip; nothing downstream is mocked.
 */
export function startSimulation(busId: string, tripId: string, routeId: string, ingest: IngestFn) {
  stopSimulation(busId);

  const stops = stopsRepo.findWhere((s) => s.routeId === routeId).sort((a, b) => a.sequence - b.sequence);
  if (stops.length < 2) throw new Error("Route needs at least 2 stops to simulate.");
  const routeDistanceMeters = stops.slice(1).reduce(
    (total, stop, index) => total + calculateDistance(stops[index].latitude, stops[index].longitude, stop.latitude, stop.longitude),
    0
  );

  const state: SimState = {
    busId, tripId, routeId,
    segmentIndex: 0,
    t: 0,
    speedMps: routeDistanceMeters / TARGET_DURATION_SECONDS,
    timer: null,
    status: "running"
  };

  state.timer = setInterval(() => {
    if (state.status !== "running") return;
    const a = stops[state.segmentIndex];
    const b = stops[state.segmentIndex + 1];
    if (!a || !b) {
      stopSimulation(busId);
      return;
    }
    const segmentLen = calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
    const step = segmentLen > 0 ? (state.speedMps * (TICK_MS / 1000)) / segmentLen : 1;
    state.t += step;

    if (state.t >= 1) {
      state.t = 0;
      state.segmentIndex += 1;
      if (state.segmentIndex >= stops.length - 1) {
        // Reached final stop — emit final fix at last stop, then stop.
        const last = stops[stops.length - 1];
        ingest({
          busId, tripId, routeId,
          latitude: last.latitude, longitude: last.longitude,
          speed: 0, heading: 0, timestamp: new Date().toISOString()
        });
        stopSimulation(busId);
        return;
      }
    }

    const from = stops[state.segmentIndex];
    const to = stops[state.segmentIndex + 1];
    const pos = interpolate(from.latitude, from.longitude, to.latitude, to.longitude, state.t);
    const heading = calculateBearing(from.latitude, from.longitude, to.latitude, to.longitude);

    ingest({
      busId, tripId, routeId,
      latitude: pos.latitude, longitude: pos.longitude,
      speed: state.speedMps, heading,
      timestamp: new Date().toISOString()
    });
  }, TICK_MS);

  activeSims.set(busId, state);
}

export function pauseSimulation(busId: string) {
  const s = activeSims.get(busId);
  if (s) s.status = "paused";
}

export function resumeSimulation(busId: string) {
  const s = activeSims.get(busId);
  if (s) s.status = "running";
}

export function stopSimulation(busId: string) {
  const s = activeSims.get(busId);
  if (s?.timer) clearInterval(s.timer);
  activeSims.delete(busId);
}

export function isSimulating(busId: string) {
  return activeSims.has(busId);
}
