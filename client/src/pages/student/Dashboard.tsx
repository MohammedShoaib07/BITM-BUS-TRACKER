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

  const { bus, route, stops, pickupStop, pass, fee, activeTrip } = profile;

  const pickupEta = snapshot?.stopEtas.find((s) => s.stopId === pickupStop?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Card title={`${route?.name || "Route"} — ${bus?.registrationNumber || "Bus"}`} right={activeTrip ? <Badge tone="green">Live trip in progress</Badge> : <Badge tone="slate">No active trip</Badge>}>
        <LiveMap stops={stops} snapshot={snapshot} />
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Previous stop" value={snapshot?.previousStopName || "—"} />
        <StatPill label="Next stop" value={snapshot?.nextStopName || "—"} />
        <StatPill label="Distance to next" value={snapshot ? `${(snapshot.distanceToNextStopMeters / 1000).toFixed(1)} km` : "—"} />
        <StatPill label="ETA to next stop" value={snapshot ? humanEta(snapshot.etaToNextStopSeconds) : "—"} />
      </div>

      <Card title={`Your pickup stop: ${pickupStop?.name || "—"}`}>
        {pickupEta ? (
          <p className="text-sm text-slate-700">
            The bus is <strong>{(pickupEta.distanceMeters / 1000).toFixed(1)} km</strong> away and expected in{" "}
            <strong>{humanEta(pickupEta.etaSeconds)}</strong>.
          </p>
        ) : (
          <p className="text-sm text-slate-500">No live ETA yet — the driver hasn't started this trip.</p>
        )}
      </Card>

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

      <Card title="Upcoming stops">
        <ol className="space-y-2">
          {stops.map((s: Stop) => {
            const eta = snapshot?.stopEtas.find((e) => e.stopId === s.id);
            const isPast = snapshot && eta === undefined && s.sequence <= (stops.find((x: Stop) => x.id === snapshot.nextStopId)?.sequence ?? Infinity) - 1;
            return (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className={s.id === pickupStop?.id ? "font-semibold text-brand-700" : "text-slate-700"}>
                  {s.sequence}. {s.name} {s.id === pickupStop?.id && "📍 (your stop)"}
                </span>
                <span className="text-slate-500">{eta ? humanEta(eta.etaSeconds) : isPast ? "Passed" : "—"}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
