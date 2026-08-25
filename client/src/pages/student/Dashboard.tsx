import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";
import LiveMap from "../../components/LiveMap";
import { Badge, Card, StatPill } from "../../components/ui";
import { Stop, TrackingSnapshot } from "../../types";

interface Profile {
  student: any;
  bus: any;
  route: any;
  stops: Stop[];
  pickupStop: Stop | null;
  pass: any;
  fee: any;
  activeTrip: any;
  driver: any;
}

function humanEta(seconds: number) {
  if (seconds <= 0) return "—";
  if (seconds < 60) return "Arriving now";
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/profile").then((res) => setProfile(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!profile?.bus?.id) return;
    const socket = getSocket();
    socket.emit("subscribe:bus", profile.bus.id);

    // Fetch whatever the last known live snapshot is (in case trip already in progress).
    api.get(`/tracking/snapshot/${profile.bus.id}`).then((res) => setSnapshot(res.data)).catch(() => {});

    const handler = (data: TrackingSnapshot) => {
      if (data.busId === profile.bus.id) setSnapshot(data);
    };
    socket.on("bus:location", handler);
    return () => {
      socket.emit("unsubscribe:bus", profile.bus.id);
      socket.off("bus:location", handler);
    };
  }, [profile?.bus?.id]);

  if (loading) return <p className="p-6 text-slate-500">Loading your dashboard…</p>;
  if (!profile || !profile.student) return <p className="p-6 text-slate-500">No student profile found.</p>;

  const { bus, route, stops, pickupStop, pass, fee, activeTrip, driver } = profile;

  const pickupEta = snapshot?.stopEtas.find((s) => s.stopId === pickupStop?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Card title={`${route?.name || "Route"} — ${bus?.registrationNumber || "Bus"}`} right={activeTrip ? <Badge tone="green">Live trip in progress</Badge> : <Badge tone="slate">No active trip</Badge>}>
        {driver && <p className="mb-3 text-sm text-slate-600">Driver: <strong className="text-slate-800">{driver.name}</strong> · {driver.phone} · Bus {bus?.registrationNumber}</p>}
        <LiveMap stops={stops} snapshot={snapshot} pickupStopId={pickupStop?.id} />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Previous stop" value={snapshot?.previousStopName || "—"} />
        <StatPill label="Next stop" value={snapshot?.nextStopName || "—"} />
        <StatPill label="Distance to next" value={snapshot ? `${(snapshot.distanceToNextStopMeters / 1000).toFixed(1)} km` : "—"} />
        <StatPill label="ETA to next stop" value={snapshot ? humanEta(snapshot.etaToNextStopSeconds) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card title="Bus fee status">
          <Badge tone={fee?.status === "PAID" ? "green" : "red"}>{fee?.status || "UNKNOWN"}</Badge>
          <p className="mt-2 text-xs text-slate-500">Amount ₹{fee?.amount} · Due {fee?.dueDate}</p>
        </Card>
        <Card title="Digital pass status">
          <Badge tone={pass?.status === "valid" ? "green" : "red"}>{(pass?.status || "unknown").toUpperCase()}</Badge>
          <p className="mt-2 text-xs text-slate-500">Pass {pass?.passNumber} · Valid till {pass?.validTo}</p>
        </Card>
      </div>

    </div>
  );
}
