/**
 * Geolocation utilities for auto-detecting the closest trip location.
 */

/**
 * Get the user's current GPS position via the browser Geolocation API.
 * Returns { latitude, longitude } or throws on denial/timeout.
 */
export function detectPosition(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: timeoutMs, enableHighAccuracy: false }
    );
  });
}

/**
 * Haversine distance between two lat/lon points in kilometres.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the closest location from a list of { name, lat, lon } objects
 * given the user's GPS coordinates.
 * Returns { name, distance } or null if no valid coords exist.
 */
export function findClosestLocation(userLat, userLon, locationCoords) {
  let closest = null;
  let minDist = Infinity;

  for (const loc of locationCoords) {
    if (loc.lat == null || loc.lon == null) continue;
    const dist = haversineKm(userLat, userLon, loc.lat, loc.lon);
    if (dist < minDist) {
      minDist = dist;
      closest = { name: loc.name, distance: dist };
    }
  }

  return closest;
}
