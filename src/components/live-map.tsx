"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveDriver } from "@/services";

function driverIcon(vehicleType: string) {
  const color = vehicleType === "motorcycle" ? "#f59e0b" : "#16a34a";
  const emoji = vehicleType === "motorcycle" ? "🏍️" : "🚗";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33,0 2px 6px rgba(0,0,0,.3);font-size:16px;">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

// إعادة ضبط حدود الخريطة عند تغيّر عدد السائقين فقط (لا مع كل حركة)
function FitBounds({ drivers }: { drivers: LiveDriver[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (drivers.length > 0) {
      const bounds = L.latLngBounds(drivers.map((d) => [d.lat, d.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers.length]);
  return null;
}

export default function LiveMap({ drivers }: { drivers: LiveDriver[] }) {
  const center: [number, number] =
    drivers.length > 0 ? [drivers[0].lat, drivers[0].lng] : [24.7136, 46.6753];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds drivers={drivers} />
      {drivers.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]} icon={driverIcon(d.vehicleType)}>
          <Popup>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <strong>{d.name}</strong>
              <br />
              <span dir="ltr">{d.phone}</span>
              <br />
              ⭐ {Number(d.rating).toFixed(1)} — {d.city}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
