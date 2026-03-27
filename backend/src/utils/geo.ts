export interface Coordinate {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(a: Coordinate, b: Coordinate) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return EARTH_RADIUS_KM * y;
}

function weightedAverage(points: Coordinate[], weights: number[]) {
  let sumLat = 0;
  let sumLon = 0;
  let sumW = 0;

  for (let i = 0; i < points.length; i++) {
    sumLat += points[i].lat * weights[i];
    sumLon += points[i].lon * weights[i];
    sumW += weights[i];
  }

  return {
    lat: sumLat / sumW,
    lon: sumLon / sumW,
  };
}

export function geometricMedian(points: Coordinate[], iterations = 30): Coordinate {
  if (points.length === 1) {
    return points[0];
  }

  let current = {
    lat: points.reduce((acc, p) => acc + p.lat, 0) / points.length,
    lon: points.reduce((acc, p) => acc + p.lon, 0) / points.length,
  };

  for (let i = 0; i < iterations; i++) {
    const weights = points.map((p) => {
      const d = haversineDistanceKm(current, p);
      return 1 / Math.max(d, 1e-6);
    });

    const next = weightedAverage(points, weights);

    const delta = haversineDistanceKm(current, next);
    current = next;

    if (delta < 0.001) {
      break;
    }
  }

  return current;
}

export function googleNavigationUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}
