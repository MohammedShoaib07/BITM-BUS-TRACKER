import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";
import LiveMap from "../../components/LiveMap";
import { Badge, Card } from "../../components/ui";
import { TrackingSnapshot } from "../../types";

export default function AdminDashboard() {
  const [fleet, setFleet] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [boarding, setBoarding] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, TrackingSnapshot>>({});
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [tab, setTab] = useState<"fleet" | "students" | "boarding" | "alerts">("fleet");

  function refreshAll() {
    api.get("/admin/fleet").then((r) => setFleet(r.data.buses));
    api.get("/admin/routes").then((r) => setRoutes(r.data));
    api.get("/admin/students").then((r) => setStudents(r.data));
    api.get("/admin/boarding").then((r) => setBoarding(r.data));
    api.get("/admin/alerts").then((r) => setAlerts(r.data));
  }

  useEffect(() => {
    refreshAll();
    const socket = getSocket();
    socket.emit("subscribe:admin");

    const locHandler = (data: TrackingSnapshot) => {
      setSnapshots((prev) => ({ ...prev, [data.busId]: data }));
    };
    const boardHandler = () => {
      api.get("/admin/boarding").then((r) => setBoarding(r.data));
      api.get("/admin/alerts").then((r) => setAlerts(r.data));
    };
    const tripHandler = () => {
      api.get("/admin/fleet").then((r) => setFleet(r.data.buses));
    };

    socket.on("bus:location", locHandler);
    socket.on("boarding:event", boardHandler);
    socket.on("trip:started", tripHandler);
    socket.on("trip:ended", tripHandler);

    return () => {
      socket.off("bus:location", locHandler);
      socket.off("boarding:event", boardHandler);
      socket.off("trip:started", tripHandler);
      socket.off("trip:ended", tripHandler);
    };
  }, []);

  async function toggleFee(studentId: string, current: string) {
    const next = current === "PAID" ? "PENDING" : "PAID";
    await api.patch(`/admin/fees/${studentId}`, { status: next });
    api.get("/admin/students").then((r) => setStudents(r.data));
  }

  async function togglePass(studentId: string, current: string) {
    const next = current === "valid" ? "suspended" : "valid";
    await api.patch(`/admin/passes/${studentId}`, { status: next });
    api.get("/admin/students").then((r) => setStudents(r.data));
  }

  const activeBuses = fleet.filter((b) => b.activeTrip);
  const selectedBus = fleet.find((b) => b.id === selectedBusId) || activeBuses[0] || fleet[0];
  const selectedRoute = routes.find((r) => r.id === selectedBus?.routeId);
  const selectedSnapshot = selectedBus ? snapshots[selectedBus.id] || null : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        {(["fleet", "students", "boarding", "alerts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-brand-500 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
          >
            {t === "fleet" && "Live Fleet"}
            {t === "students" && "Students"}
            {t === "boarding" && "Boarding Records"}
            {t === "alerts" && `Unauthorized Alerts${alerts.length ? ` (${alerts.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "fleet" && (
        <>
          <Card
            title={selectedBus ? `${selectedRoute?.name || ""} — ${selectedBus.registrationNumber}` : "Select a bus"}
            right={
              <select
                value={selectedBus?.id || ""}
                onChange={(e) => setSelectedBusId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                {fleet.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.registrationNumber} {b.activeTrip ? "🟢" : "⚪"}
                  </option>
                ))}
              </select>
            }
          >
            {selectedBus && <LiveMap stops={selectedRoute?.stops || []} snapshot={selectedSnapshot} height="440px" />}
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((b) => {
              const snap = snapshots[b.id];
              return (
                <Card key={b.id} title={b.registrationNumber}>
                  <p className="text-sm text-slate-600">{routes.find((r) => r.id === b.routeId)?.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone={b.activeTrip ? "green" : "slate"}>{b.activeTrip ? "On trip" : "Idle"}</Badge>
                    {b.activeTrip && <span className="text-xs text-slate-400">{b.activeTrip.mode === "simulation" ? "Simulated" : "Real GPS"}</span>}
                  </div>
                  {snap && (
                    <p className="mt-2 text-xs text-slate-500">
                      Between {snap.previousStopName} → {snap.nextStopName} · {(snap.distanceToNextStopMeters / 1000).toFixed(1)} km to go
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "students" && (
        <Card title="Students">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Roll No.</th>
                  <th className="py-2 pr-4">Fee</th>
                  <th className="py-2 pr-4">Pass</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{s.user?.name}</td>
                    <td className="py-2 pr-4">{s.rollNumber}</td>
                    <td className="py-2 pr-4"><Badge tone={s.fee?.status === "PAID" ? "green" : "red"}>{s.fee?.status}</Badge></td>
                    <td className="py-2 pr-4"><Badge tone={s.pass?.status === "valid" ? "green" : "red"}>{s.pass?.status}</Badge></td>
                    <td className="py-2 pr-4 space-x-2">
                      <button onClick={() => toggleFee(s.id, s.fee?.status)} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                        Toggle fee
                      </button>
                      <button onClick={() => togglePass(s.id, s.pass?.status)} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                        Toggle pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "boarding" && (
        <Card title="Recent Boarding Records">
          <ul className="space-y-2">
            {boarding.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-800">{new Date(b.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{b.reason}</p>
                </div>
                <Badge tone={b.result === "ALLOW" ? "green" : "red"}>{b.result}</Badge>
              </li>
            ))}
            {boarding.length === 0 && <p className="text-sm text-slate-500">No boarding events yet.</p>}
          </ul>
        </Card>
      )}

      {tab === "alerts" && (
        <Card title="Unauthorized Boarding Attempts">
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <p className="font-medium">{new Date(a.timestamp).toLocaleString()}</p>
                <p>{a.reason}</p>
              </li>
            ))}
            {alerts.length === 0 && <p className="text-sm text-slate-500">No unauthorized attempts recorded.</p>}
          </ul>
        </Card>
      )}
    </div>
  );
}
