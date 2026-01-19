import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate great circle arc points between two coordinates
// Returns an array of [lat, lon] points with continuous longitudes
export function getArcPoints(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const [lat1, lon1] = start.map((d) => (d * Math.PI) / 180);
  const [lat2, lon2] = end.map((d) => (d * Math.PI) / 180);

  const points: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    const d =
      2 *
      Math.asin(
        Math.sqrt(
          Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
        )
      );

    if (d === 0) {
      points.push([start[0], start[1]]);
      continue;
    }

    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const lon = Math.atan2(y, x);

    points.push([(lat * 180) / Math.PI, (lon * 180) / Math.PI]);
  }

  // Unwrap longitudes to be continuous (avoid jumps at antimeridian)
  for (let i = 1; i < points.length; i++) {
    const prevLon = points[i - 1][1];
    let currLon = points[i][1];
    
    while (currLon - prevLon > 180) currLon -= 360;
    while (currLon - prevLon < -180) currLon += 360;
    
    points[i][1] = currLon;
  }

  return points;
}

// Format airport display
export function formatAirport(airport: { iata: string; name: string; city: string }) {
  return `${airport.iata} - ${airport.city || airport.name}`;
}
