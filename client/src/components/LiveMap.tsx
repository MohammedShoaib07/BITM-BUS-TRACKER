import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Stop, TrackingSnapshot } from "../types";

// Fix default marker icon paths (Vite bundling breaks Leaflet's default asset resolution).
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const stopIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#1763b8;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function busIcon(heading: number) {
  return new L.DivIcon({
    className: "bus-marker-icon",
    html: `<div style="transform: rotate(${heading}deg); font-size: 28px; line-height: 1;">🚌</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function RecenterOnBus({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [position]);
  return null;
}

interface LiveMapProps {
  stops: Stop[];
  snapshot: TrackingSnapshot | null;
  height?: string;
}

export default function LiveMap({ stops, snapshot, height = "420px" }: LiveMapProps) {
  const routeLine = useMemo<[number, number][]>(
    () => stops.sort((a, b) => a.sequence - b.sequence).map((s) => [s.latitude, s.longitude]),
    [stops]
  );

  const center: [number, number] = snapshot
    ? [snapshot.latitude, snapshot.longitude]
    : routeLine[0] || [15.15, 76.92];

  const busPos: [number, number] | null = snapshot ? [snapshot.latitude, snapshot.longitude] : null;

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: "#1763b8", weight: 4, opacity: 0.7 }} />}
        {stops.map((s) => (
          <Marker key={s.id} position={[s.latitude, s.longitude]} icon={stopIcon}>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              Stop {s.sequence}
            </Popup>
          </Marker>
        ))}
        {busPos && (
          <Marker position={busPos} icon={busIcon(snapshot?.heading || 0)}>
            <Popup>
              <strong>Live bus position</strong>
              <br />
              {snapshot?.previousStopName} → {snapshot?.nextStopName}
              <br />
              Updated {snapshot ? new Date(snapshot.timestamp).toLocaleTimeString() : ""}
            </Popup>
          </Marker>
        )}
        <RecenterOnBus position={busPos} />
      </MapContainer>
    </div>
  );
}
