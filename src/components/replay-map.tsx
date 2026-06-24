"use client";

import * as React from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ReplayPoint {
  lat: number;
  lng: number;
  speed: number;
  recordedAt: string;
}

const carIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 4px #16a34a33,0 2px 6px rgba(0,0,0,.3);font-size:16px;color:white;">🚗</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;box-shadow:0 0 0 3px #3b82f655;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const endIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#dc2626;box-shadow:0 0 0 3px #dc262655;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitOnce({ points }: { points: ReplayPoint[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export default function ReplayMap({ points, currentIndex }: { points: ReplayPoint[]; currentIndex: number }) {
  if (points.length === 0) return null;
  const idx = Math.min(currentIndex, points.length - 1);
  const path = points.map((p) => [p.lat, p.lng] as [number, number]);
  const traveled = path.slice(0, idx + 1);
  const remaining = path.slice(idx);
  const cur = points[idx];

  return (
    <MapContainer center={[cur.lat, cur.lng]} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitOnce points={points} />
      {/* المسار المُقطَّع */}
      <Polyline positions={remaining} pathOptions={{ color: "#9ca3af", weight: 4, opacity: 0.5, dashArray: "6 6" }} />
      <Polyline positions={traveled} pathOptions={{ color: "#16a34a", weight: 5, opacity: 0.85 }} />
      <Marker position={path[0]} icon={startIcon} />
      <Marker position={path[path.length - 1]} icon={endIcon} />
      <Marker position={[cur.lat, cur.lng]} icon={carIcon} />
    </MapContainer>
  );
}
