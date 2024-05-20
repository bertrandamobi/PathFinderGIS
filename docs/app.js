const map = L.map('map').setView([40.73061, -73.935242], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markers = [];
let routeLayer = null;
let obstacleLayer = null;
let routeCoords = [];

const obstacleProfiles = {
  none: [],
  urban: [
    [[40.758, -73.996], [40.758, -73.973], [40.743, -73.973], [40.743, -73.996]],
    [[40.723, -74.010], [40.723, -73.990], [40.709, -73.990], [40.709, -74.010]]
  ],
  flood: [
    [[40.707, -74.022], [40.707, -74.000], [40.694, -74.000], [40.694, -74.022]],
    [[40.738, -73.985], [40.738, -73.955], [40.722, -73.955], [40.722, -73.985]]
  ]
};

map.on('click', e => addStop(e.latlng));

function addStop(latlng) {
  const marker = L.marker(latlng, { draggable: true }).addTo(map);
  marker.bindTooltip(`Stop ${markers.length + 1}`, { permanent: false });
  marker.on('dragend', () => updateStopCount());
  markers.push(marker);
  updateStopCount();
}

function updateStopCount() {
  document.getElementById('stopCount').textContent = String(markers.length);
}

function drawObstacles(profile) {
  if (obstacleLayer) map.removeLayer(obstacleLayer);
  const polygons = obstacleProfiles[profile] || [];
  if (!polygons.length) return;
  obstacleLayer = L.layerGroup(
    polygons.map(poly => L.polygon(poly, {
      color: '#ff5f7a',
      fillColor: '#ff5f7a',
      fillOpacity: 0.28,
      weight: 2,
      dashArray: '6,4'
    }))
  ).addTo(map);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi + Number.EPSILON) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function obstaclePenalty(a, b, profile) {
  const polygons = obstacleProfiles[profile] || [];
  if (!polygons.length) return 1;
  const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
  const blocked = polygons.some(poly => pointInPolygon(mid, poly));
  return blocked ? 1.45 : 1;
}

function haversineKm(a, b) {
  const r = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function nearestNeighborOrder(points, mode, profile) {
  const unvisited = points.slice(1);
  const ordered = [points[0]];
  while (unvisited.length) {
    const current = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestScore = Infinity;
    unvisited.forEach((candidate, idx) => {
      const km = haversineKm(current, candidate);
      const penalty = obstaclePenalty(current, candidate, profile);
      const trafficFactor = mode === 'duration' ? (1.0 + Math.random() * 0.18) : 1.0;
      const score = km * penalty * trafficFactor;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    ordered.push(unvisited.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

async function fetchRoutePath(points) {
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('OSRM demo request failed');
  const data = await r.json();
  if (!data.routes?.length) throw new Error('No route found');
  return data.routes[0];
}

function renderRoute(geojsonCoords) {
  if (routeLayer) map.removeLayer(routeLayer);
  routeLayer = L.polyline(
    geojsonCoords.map(([lng, lat]) => [lat, lng]),
    { color: '#4be1ff', weight: 6, opacity: 0.9, lineCap: 'round' }
  ).addTo(map);
  map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
}

function formatStats(distanceKm, durationSec) {
  document.getElementById('distance').textContent = `${distanceKm.toFixed(2)} km`;
  const mins = durationSec / 60;
  document.getElementById('duration').textContent = mins > 60
    ? `${(mins / 60).toFixed(2)} h`
    : `${mins.toFixed(0)} min`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportKML() {
  if (!routeCoords.length) return alert('Optimize a route first.');
  const coordString = routeCoords.map(([lat, lng]) => `${lng},${lat},0`).join(' ');
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>PathFinder Route</name>
<Placemark><LineString><coordinates>${coordString}</coordinates></LineString></Placemark>
</Document></kml>`;
  downloadFile('pathfinder-route.kml', kml, 'application/vnd.google-earth.kml+xml');
}

function exportGPX() {
  if (!routeCoords.length) return alert('Optimize a route first.');
  const trackPoints = routeCoords.map(([lat, lng]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`).join('');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PathFinder GIS" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>PathFinder Route</name><trkseg>${trackPoints}</trkseg></trk></gpx>`;
  downloadFile('pathfinder-route.gpx', gpx, 'application/gpx+xml');
}

async function optimize() {
  if (markers.length < 2) {
    alert('Add at least two stops.');
    return;
  }

  const mode = document.getElementById('mode').value;
  const obstacle = document.getElementById('obstacle').value;
  drawObstacles(obstacle);

  const points = markers.map(m => m.getLatLng());
  const ordered = nearestNeighborOrder(points, mode, obstacle);

  try {
    const route = await fetchRoutePath(ordered);
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    routeCoords = coords;
    renderRoute(route.geometry.coordinates);
    formatStats(route.distance / 1000, route.duration);
  } catch {
    let dist = 0;
    for (let i = 1; i < ordered.length; i++) {
      dist += haversineKm(ordered[i - 1], ordered[i]);
    }
    const adjustedDist = dist * (obstacle === 'none' ? 1 : 1.2);
    const secs = adjustedDist / 42 * 3600;
    routeCoords = ordered.map(p => [p.lat, p.lng]);
    renderRoute(routeCoords.map(([lat, lng]) => [lng, lat]));
    formatStats(adjustedDist, secs);
  }
}

function clearStops() {
  markers.forEach(m => map.removeLayer(m));
  markers.length = 0;
  if (routeLayer) map.removeLayer(routeLayer);
  if (obstacleLayer) map.removeLayer(obstacleLayer);
  routeCoords = [];
  updateStopCount();
  document.getElementById('distance').textContent = '-';
  document.getElementById('duration').textContent = '-';
}

document.getElementById('optimizeBtn').addEventListener('click', optimize);
document.getElementById('clearBtn').addEventListener('click', clearStops);
document.getElementById('kmlBtn').addEventListener('click', exportKML);
document.getElementById('gpxBtn').addEventListener('click', exportGPX);
