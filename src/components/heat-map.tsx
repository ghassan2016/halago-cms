"use client";

import * as React from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HeatPoint } from "@/services";

// لون متدرّج من أزرق-بنفسجي → أحمر حسب الكثافة (0..1)
function weightColor(w: number): string {
  // 0.0 → أزرق (#3b82f6), 0.5 → أصفر (#facc15), 1.0 → أحمر (#dc2626)
  if (w < 0.5) {
    const r = Math.round(59 + (250 - 59) * (w / 0.5));
    const g = Math.round(130 + (204 - 130) * (w / 0.5));
    const b = Math.round(246 + (21 - 246) * (w / 0.5));
    return `rgb(${r},${g},${b})`;
  }
  const t = (w - 0.5) / 0.5;
  const r = Math.round(250 + (220 - 250) * t);
  const g = Math.round(204 + (38 - 204) * t);
  const b = Math.round(21 + (38 - 21) * t);
  return `rgb(${r},${g},${b})`;
}

function FitBounds({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export default function HeatMap({ points }: { points: HeatPoint[] }) {
  const center: [number, number] =
    points.length > 0 ? [points[0].lat, points[0].lng] : [24.7136, 46.6753];

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds points={points} />
      {points.map((p, i) => {
        const radius = 600 + p.weight * 2400; // 600m → 3km
        const color = weightColor(p.weight);
        return (
          <Circle
            key={i}
            center={[p.lat, p.lng]}
            radius={radius}
            pathOptions={{
              color,
              weight: 0,
              fillColor: color,
              fillOpacity: 0.18 + p.weight * 0.35,
            }}
          />
        );
      })}
    </MapContainer>
  );
}
