"""FastAPI backend example for production routing.

Run:
    pip install -r requirements.txt
    uvicorn backend.app:app --reload --port 8000
"""

from typing import Literal
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
ROUTING_TIMEOUT = float(os.getenv("ROUTING_TIMEOUT", "20"))

app = FastAPI(title="PathFinder GIS API", version="0.2.0")


class Point(BaseModel):
    lat: float
    lng: float


class OptimizeRequest(BaseModel):
    points: list[Point] = Field(min_length=2)
    mode: Literal["distance", "duration"] = "duration"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/optimize")
async def optimize(req: OptimizeRequest):
    # Basic mode handling; expand with traffic/constraint models in production.
    ordered = req.points
    coords = ";".join(f"{p.lng},{p.lat}" for p in ordered)
    url = f"{OSRM_BASE_URL}/route/v1/driving/{coords}?overview=full&geometries=geojson"

    async with httpx.AsyncClient(timeout=ROUTING_TIMEOUT) as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Routing engine unavailable")

    data = response.json()
    if not data.get("routes"):
        raise HTTPException(status_code=404, detail="No route found")

    route = data["routes"][0]
    return {
        "distance_km": round(route["distance"] / 1000, 3),
        "duration_min": round(route["duration"] / 60, 2),
        "geometry": route["geometry"],
        "mode": req.mode,
    }
