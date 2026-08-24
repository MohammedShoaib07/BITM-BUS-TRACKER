const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in meters. */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Distance from a point to a line segment (great-circle approximation using
 * planar projection, adequate at city/route scale), plus the fractional
 * position [0,1] of the closest point along the segment. Used to project the
 * bus's raw GPS fix onto the route polyline between two consecutive stops.
 */
export function distanceToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { distanceMeters: number; t: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closestLat = ax + abx * t;
  const closestLon = ay + aby * t;
  const distanceMeters = calculateDistance(px, py, closestLat, closestLon);
  return { distanceMeters, t };
}

/** Interpolate a point along the great-circle segment (linear approx, fine at short range). */
export function interpolate(
  lat1: number, lon1: number, lat2: number, lon2: number, t: number
): { latitude: number; longitude: number } {
  return {
    latitude: lat1 + (lat2 - lat1) * t,
    longitude: lon1 + (lon2 - lon1) * t
  };
}

/** Initial bearing from point A to point B, in degrees [0, 360). */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}
