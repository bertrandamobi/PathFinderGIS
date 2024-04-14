# PathFinder GIS

PathFinder GIS is a route-optimization demo project for **logistics, field operations, urban planning, and emergency response**. It includes:

<a href="https://bertrandamobi.github.io/PathFinderGIS/">
  <img src="/images/app-image.png" width="100%" />
</a>

---

🔗 **[Live Demo](https://bertrandamobi.github.io/PathFinderGIS/)**

---

- A **beautiful animated web frontend** (GitHub Pages-ready) for interactive route planning.
- A **Python FastAPI backend** example that integrates with OSRM for routing.
- Support for **multi-stop input**, **distance/time optimization modes**, **obstacle-aware routing behavior**, and **KML/GPX export**.

---

## Table of Contents

1. [Project Goals](#project-goals)
2. [Core Features](#core-features)
3. [Architecture Overview](#architecture-overview)
4. [Repository Structure](#repository-structure)
5. [Frontend Demo (GitHub Pages)](#frontend-demo-github-pages)
6. [Backend API (FastAPI + OSRM)](#backend-api-fastapi--osrm)
7. [Setup Guide](#setup-guide)
8. [API Contract](#api-contract)
9. [Export Formats](#export-formats)
10. [Customization Ideas](#customization-ideas)
11. [Operational Notes](#operational-notes)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## Project Goals

PathFinder GIS demonstrates a practical pattern for route planning systems:

- Accept multiple delivery/visit points.
- Optimize either for shortest distance or fastest travel time.
- Visualize routes interactively on a map.
- Export route geometry for field navigation and GIS workflows.

This repository is intended as a **launchpad**: use the frontend for demos and stakeholder walkthroughs, and extend the backend into a production route service.

---

## Core Features

### Frontend (`docs/`)

- Leaflet-powered interactive map.
- Click-to-add and drag-to-adjust stop markers.
- Optimization mode selector:
  - **Fastest Time (Traffic-weighted)**
  - **Shortest Distance**
- Obstacle profiles to model route restrictions:
  - None
  - Urban restrictions
  - Flooded region
- Route line rendering + metric summary.
- One-click **KML** and **GPX** export.
- Animated, responsive UI suitable for GitHub Pages.

### Backend (`backend/`)

- FastAPI endpoint `POST /optimize`.
- Forwards route requests to OSRM (`/route/v1/driving/...`).
- Returns normalized output:
  - `distance_km`
  - `duration_min`
  - `geometry` (GeoJSON line)
- Ready for extension with:
  - traffic APIs
  - time windows
  - vehicle capacities
  - road restrictions / geofencing rules

---

## Architecture Overview

```text
[Browser UI in docs/] --(HTTP)--> [FastAPI in backend/] --(HTTP)--> [OSRM / GraphHopper]
         |                                   |
         +--- local visualization + export   +--- normalized route payload
```

- The frontend can call OSRM directly for demo convenience.
- In production, route requests should pass through your backend for security, caching, auth, and policy enforcement.

---

## Repository Structure

```text
PathFinderGIS
├── .gitignore
├── env.example
├── .gitkeep
├── LICENSE
├── README.md
├── backend/
│   └── app.py
├── docs/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── images/
│   └── app-image.png
└── requirements.txt
```

---

## Frontend Demo (GitHub Pages)

The `docs/` folder is ready for GitHub Pages hosting:

1. Push repository to GitHub.
2. In **Settings → Pages**, set source to:
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
3. Save and wait for deployment.

### How to use the demo

1. Open the map.
2. Click to add multiple stops.
3. Choose optimization mode and obstacle profile.
4. Click **Optimize Route**.
5. Export as KML/GPX if needed.

---

## Backend API (FastAPI + OSRM)

The backend is intentionally minimal and easy to extend.

### Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000
```

Then open:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

---

## Setup Guide

### Prerequisites

- Python 3.10+
- Optional Node/npm (only if you add frontend build tooling)

### Environment configuration

Copy environment template:

```bash
cp .env.example .env
```

Defaults are development-friendly and point to the public OSRM demo service.

---

## API Contract

### `POST /optimize`

Request:

```json
{
  "points": [
    { "lat": 40.73061, "lng": -73.935242 },
    { "lat": 40.748817, "lng": -73.985428 },
    { "lat": 40.712776, "lng": -74.005974 }
  ],
  "mode": "duration"
}
```

Response:

```json
{
  "distance_km": 12.345,
  "duration_min": 26.78,
  "geometry": {
    "type": "LineString",
    "coordinates": [[-73.93, 40.73], [-73.98, 40.74]]
  }
}
```

> Note: current demo backend forwards points in the submitted order. For production-grade optimization, add a dedicated TSP/VRP solver or use OSRM trip/GraphHopper optimization endpoints.

---

## Export Formats

### KML

Useful for Google Earth, some fleet software, and GIS data exchange.

### GPX

Useful for handheld GPS devices, outdoor workflows, and mobile field apps.

---

## Customization Ideas

- Replace public OSRM with private hosted OSRM/GraphHopper.
- Add Mapbox/Here/TomTom traffic layers and speed profiles.
- Add time windows and stop service durations.
- Add multiple vehicles and depot assignment.
- Add auth, tenant isolation, and quota controls.
- Add job persistence and historical run analytics.

---

## Operational Notes

- Public OSRM demo endpoints are rate-limited and not SLA-backed.
- For production, always run your own routing engine and add retries/caching.
- Add validation for out-of-region routes and impossible coordinate sets.

---

## Roadmap

- [ ] Introduce deterministic route optimization (no random traffic factor).
- [ ] Add backend route caching.
- [ ] Add optional traffic API adapter interface.
- [ ] Add integration tests against a local OSRM container.
- [ ] Add multi-vehicle dispatch support.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
