import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";
import LiveMap from "../../components/LiveMap";
import { Badge, Card } from "../../components/ui";
import QrScanner from "../../components/QrScanner";
import { Stop, TrackingSnapshot } from "../../types";

export default function DriverDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [trip, setTrip] = useState<any>(null);
  const [gpsMode, setGpsMode] = useState<"real_gps" | "simulation">("simulation");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [scanResult, setScanResult] = useState<{ result: string; reason: string } | null>(null);
  const [monthlyVerification, setMonthlyVerification] = useState<any>(null);
  const [monthlyVerificationLoading, setMonthlyVerificationLoading] = useState(false);
  const [monthlyVerificationError, setMonthlyVerificationError] = useState<string | null>(null);
  const [manualPass, setManualPass] = useState("");
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    api.get("/driver/profile").then((res) => {
      setProfile(res.data);
      setTrip(res.data.activeTrip || null);
    });
  }, []);

  useEffect(() => {
    if (!profile?.bus?.id) return;
    const socket = getSocket();
    socket.emit("subscribe:bus", profile.bus.id);
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

  async function startTrip() {
    if (!profile?.bus?.id) return;
    const res = await api.post("/tracking/trip/start", { busId: profile.bus.id, mode: gpsMode });
    setTrip(res.data);

    if (gpsMode === "real_gps") {
      if (!("geolocation" in navigator)) {
        setGpsError("Geolocation is not supported in this browser.");
        return;
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          api.post("/tracking/gps", {
            busId: profile.bus.id,
            tripId: res.data.id,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: pos.coords.speed || 0,
            heading: pos.coords.heading || 0,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp).toISOString()
          }).catch(() => {});
        },
        (err) => setGpsError(`GPS error: ${err.message}`),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }
  }

  async function endTrip() {
    if (!trip) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await api.post(`/tracking/trip/${trip.id}/end`);
    setTrip(null);
  }

  async function handleScan(passNumber: string) {
    if (!profile?.bus?.id || !trip) return;
    try {
      const res = await api.post("/boarding/scan", { passNumber, busId: profile.bus.id, tripId: trip.id });
      setScanResult(res.data);
    } catch (e: any) {
      setScanResult(e?.response?.data || { result: "DENY", reason: "Scan failed." });
    }
  }

  async function verifyMonthlyPasses() {
    if (!profile?.bus?.id) return;
    setMonthlyVerificationLoading(true);
    setMonthlyVerificationError(null);
    try {
      const res = await api.post("/boarding/monthly-verify", { busId: profile.bus.id });
      setMonthlyVerification(res.data);
    } catch (e: any) {
      setMonthlyVerificationError(e?.response?.data?.error || "Monthly pass verification failed.");
    } finally {
      setMonthlyVerificationLoading(false);
    }
  }

  if (!profile) return <p className="p-6 text-slate-500">Loading driver dashboard…</p>;
  const { bus, route, stops } = profile;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <Card title={`${route?.name || "Route"} — ${bus?.registrationNumber || "Bus"}`} right={trip ? <Badge tone="green">Trip in progress ({trip.mode === "simulation" ? "simulated GPS" : "real GPS"})</Badge> : <Badge tone="slate">Not started</Badge>}>
        <LiveMap stops={stops} snapshot={snapshot} />
      </Card>

      <Card title="Trip Controls">
        {!trip ? (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={gpsMode}
              onChange={(e) => setGpsMode(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="simulation">GPS Simulation (recommended for demo)</option>
              <option value="real_gps">Real GPS (browser Geolocation)</option>
            </select>
            <button onClick={startTrip} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Start Trip
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={endTrip} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
              End Trip
            </button>
            {trip.mode === "simulation" && (
              <>
                <button onClick={() => api.post(`/tracking/simulation/${bus.id}/pause`)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Pause</button>
                <button onClick={() => api.post(`/tracking/simulation/${bus.id}/resume`)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Resume</button>
              </>
            )}
          </div>
        )}
        {gpsError && <p className="mt-2 text-sm text-rose-600">{gpsError}</p>}
        {trip?.mode === "simulation" && (
          <p className="mt-2 text-xs text-slate-500">
            The simulator generates real lat/lng fixes and pushes them through the same backend tracking pipeline as real GPS —
            it does not fake movement on the frontend.
          </p>
        )}
      </Card>

      <Card title="Monthly Pass Verification">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-slate-600">Verify every student assigned to this bus once at the start of the month. This does not create a boarding record.</p>
          <button onClick={verifyMonthlyPasses} disabled={monthlyVerificationLoading} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60">
            {monthlyVerificationLoading ? "Checking passes..." : "Verify monthly passes"}
          </button>
        </div>
        {monthlyVerificationError && <p className="mt-3 text-sm text-rose-600">{monthlyVerificationError}</p>}
        {monthlyVerification && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-500">Verified on {monthlyVerification.verificationDate}. {monthlyVerification.alreadyVerified ? "Already verified this month." : "Monthly verification completed."}</p>
            {monthlyVerification.expiringStudents.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="font-semibold text-amber-800">Passes expiring within 30 days</p>
                <div className="mt-2 space-y-2">
                  {monthlyVerification.expiringStudents.map((student: any) => (
                    <div key={student.studentId} className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
                      <span><strong>{student.name}</strong> · {student.rollNumber} · {student.passNumber}</span>
                      <span className="font-bold">Expires {student.expiryDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Roll No.</th><th className="py-2 pr-3">Pass</th><th className="py-2">Expiry date</th></tr></thead>
                <tbody>
                  {monthlyVerification.students.map((student: any) => (
                    <tr key={student.studentId} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{student.name}</td>
                      <td className="py-2 pr-3">{student.rollNumber}</td>
                      <td className="py-2 pr-3">{student.passNumber || "Missing"}</td>
                      <td className={`py-2 font-medium ${student.status === "expires_this_month" ? "text-amber-700" : student.status === "expired" ? "text-rose-700" : "text-slate-700"}`}>{student.expiryDate || "—"}{student.status === "expires_this_month" && " · Expires this month"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card title="Scan Student Pass (Boarding)">
        {!trip && <p className="text-sm text-slate-500">Start a trip before scanning boarding passes.</p>}
        {trip && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setScannerOn((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                {scannerOn ? "Stop camera" : "Start camera scan"}
              </button>
            </div>
            {scannerOn && <QrScanner active={scannerOn} onScan={handleScan} />}
            <div className="flex gap-2">
              <input
                value={manualPass}
                onChange={(e) => setManualPass(e.target.value)}
                placeholder="Or enter pass number manually, e.g. PASS-0001"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button onClick={() => manualPass && handleScan(manualPass)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900">
                Check
              </button>
            </div>
            {scanResult && (
              <div className={`rounded-lg p-3 text-sm ${scanResult.result === "ALLOW" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                <p className="font-semibold">{scanResult.result === "ALLOW" ? "🟢 BOARDING AUTHORIZED" : "🔴 BOARDING DENIED"}</p>
                <p>{scanResult.reason}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
