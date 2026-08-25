import { calculateDistance, distanceToSegment } from "../utils/haversine";
import { stopsRepo } from "../data/repositories";
import { Stop, TrackingSnapshot } from "../types";

// Assumed average bus speed (km/h) used as a fallback when the reported GPS
// speed is ~0 (e.g. at a stop) so ETA doesn't divide by zero or spike.
const FALLBACK_SPEED_KMH = 22;
const MIN_SPEED_MPS = 1.5; // ~5.4 km/h floor for ETA math

export interface RawFix {
  busId: string;
  tripId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number; // m/s
  heading: number;
  timestamp: string;
}

/**
 * Implements the "Where Is My Train"-style algorithm:
 * GPS fix -> route -> closest segment -> previous/next stop -> distance -> ETA.
 */
export function buildTrackingSnapshot(fix: RawFix): TrackingSnapshot {
  const stops = stopsRepo
    .findWhere((s) => s.routeId === fix.routeId)
    .sort((a, b) => a.sequence - b.sequence);

  if (stops.length < 2) {
    return {
      busId: fix.busId,
      tripId: fix.tripId,
      routeId: fix.routeId,
      latitude: fix.latitude,
      longitude: fix.longitude,
      speed: fix.speed,
      heading: fix.heading,
      timestamp: fix.timestamp,
      previousStopId: null,
      previousStopName: null,
      nextStopId: null,
      nextStopName: null,
      progressPercent: 0,
      distanceToNextStopMeters: 0,
      etaToNextStopSeconds: 0,
      stopEtas: []
    };
  }

  // 1. Find the closest route segment (between consecutive stops) to the bus.
  let bestSegmentIdx = 0;
  let bestDistance = Infinity;
  let bestT = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    const { distanceMeters, t } = distanceToSegment(
      fix.latitude, fix.longitude,
      a.latitude, a.longitude,
      b.latitude, b.longitude
    );
    if (distanceMeters < bestDistance) {
      bestDistance = distanceMeters;
      bestSegmentIdx = i;
      bestT = t;
    }
  }

  const previousStop: Stop = stops[bestSegmentIdx];
  const nextStop: Stop = stops[bestSegmentIdx + 1];

  const segmentLengthMeters = calculateDistance(
    previousStop.latitude, previousStop.longitude,
    nextStop.latitude, nextStop.longitude
  );
  const distanceCoveredOnSegment = segmentLengthMeters * bestT;
  const distanceToNextStopMeters = Math.max(0, segmentLengthMeters - distanceCoveredOnSegment);
  const distanceBeforeSegment = stops.slice(0, bestSegmentIdx + 1).reduce(
    (total, stop, index) => index === 0
      ? total
      : total + calculateDistance(stops[index - 1].latitude, stops[index - 1].longitude, stop.latitude, stop.longitude),
    0
  );
  const totalRouteDistanceMeters = stops.slice(1).reduce(
    (total, stop, index) => total + calculateDistance(stops[index].latitude, stops[index].longitude, stop.latitude, stop.longitude),
    0
  );

  // Effective speed: use real reported speed if moving meaningfully, else fallback.
  const fallbackMps = (FALLBACK_SPEED_KMH * 1000) / 3600;
  const effectiveSpeed = fix.speed && fix.speed > 0.5 ? Math.max(fix.speed, MIN_SPEED_MPS) : fallbackMps;

  const etaToNextStopSeconds = Math.round(distanceToNextStopMeters / effectiveSpeed);

  // 2. Compute distance/ETA to every subsequent stop on the route.
  const stopEtas: TrackingSnapshot["stopEtas"] = [];
  let cumulativeDistance = distanceToNextStopMeters;
  let cumulativeSeconds = etaToNextStopSeconds;

  stopEtas.push({
    stopId: nextStop.id,
    stopName: nextStop.name,
    sequence: nextStop.sequence,
    distanceMeters: Math.round(distanceToNextStopMeters),
    etaSeconds: etaToNextStopSeconds
  });

  for (let i = bestSegmentIdx + 1; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    const legMeters = calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
    cumulativeDistance += legMeters;
    cumulativeSeconds += Math.round(legMeters / effectiveSpeed);
    stopEtas.push({
      stopId: b.id,
      stopName: b.name,
      sequence: b.sequence,
      distanceMeters: Math.round(cumulativeDistance),
      etaSeconds: cumulativeSeconds
    });
  }

  const progressPercent = totalRouteDistanceMeters > 0
    ? Math.round(((distanceBeforeSegment + distanceCoveredOnSegment) / totalRouteDistanceMeters) * 100)
    : 0;

  return {
    busId: fix.busId,
    tripId: fix.tripId,
    routeId: fix.routeId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: fix.speed,
    heading: fix.heading,
    timestamp: fix.timestamp,
    previousStopId: previousStop.id,
    previousStopName: previousStop.name,
    nextStopId: nextStop.id,
    nextStopName: nextStop.name,
    progressPercent,
    distanceToNextStopMeters: Math.round(distanceToNextStopMeters),
    etaToNextStopSeconds,
    stopEtas
  };
}

export function humanizeEta(seconds: number): string {
  if (seconds < 60) return "Arriving now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hours}h ${rem}m`;
}
