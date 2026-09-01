import { stopsRepo } from "../data/repositories";
import { interpolate, calculateDistance, calculateBearing } from "../utils/haversine";

type IngestFn = (fix: {
  busId: string; tripId: string; routeId: string;
  latitude: number; longitude: number; speed: number; heading: number; timestamp: string;
}) => void;
type CompleteFn = (tripId: string, busId: string) => void;

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
const SECONDS_PER_SEGMENT = 8; // each stop-to-stop leg takes exactly 8 s regardless of distance

const activeSims = new Map<string, SimState>(); // key: busId

/**
 * Simulation Engine -> ingestLocation() -> Tracking Engine -> Socket.IO
 * This is the exact same code path real driver GPS uses (see
 * trackingController.ingestLocation). The simulator only stands in for the
 * hardware GPS chip; nothing downstream is mocked.
 */
export function startSimulation(busId: string, tripId: string, routeId: string, ingest: IngestFn, complete?: CompleteFn) {
  stopSimulation(busId);

  const stops = stopsRepo.findWhere((s) => s.routeId === routeId).sort((a, b) => a.sequence - b.sequence);
  if (stops.length < 2) throw new Error("Route needs at least 2 stops to simulate.");
  // Fixed time per segment: every stop-to-stop leg takes SECONDS_PER_SEGMENT seconds
  const stepPerTick = (TICK_MS / 1000) / SECONDS_PER_SEGMENT;

  const state: SimState = {
    busId, tripId, routeId,
    segmentIndex: 0,
    t: 0,
    speedMps: 0,
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
    state.t += stepPerTick;

    while (state.t >= 1) {
      state.t -= 1;
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
        complete?.(tripId, busId);
        return;
      }
    }

    const from = stops[state.segmentIndex];
    const to = stops[state.segmentIndex + 1];
    const pos = interpolate(from.latitude, from.longitude, to.latitude, to.longitude, state.t);
    const heading = calculateBearing(from.latitude, from.longitude, to.latitude, to.longitude);

    const segmentLen = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
    ingest({
      busId, tripId, routeId,
      latitude: pos.latitude, longitude: pos.longitude,
      speed: segmentLen / SECONDS_PER_SEGMENT,
      heading,
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
