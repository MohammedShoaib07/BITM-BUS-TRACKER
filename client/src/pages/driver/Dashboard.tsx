import React, { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";
import LiveMap from "../../components/LiveMap";
import { Badge, Card } from "../../components/ui";
import { TrackingSnapshot } from "../../types";

export default function DriverDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [trip, setTrip] = useState<any>(null);
  const [gpsMode, setGpsMode] = useState<"real_gps" | "simulation">("simulation");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const watchIdRef = useRef<number | null>(null);
  const kannada = language === "kn";

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
    setSnapshot(null);
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

  if (!profile) return <p className="p-6 text-slate-500">Loading driver dashboard…</p>;
  const { bus, route, stops, driver } = profile;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setLanguage(kannada ? "en" : "kn")}
          className="rounded-full border border-slate-300 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white"
          aria-label={kannada ? "Switch to English" : "ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"}
        >
          {kannada ? "English" : "ಕನ್ನಡ"}
        </button>
      </div>
      <Card title={`${route?.name || "Route"} — ${bus?.registrationNumber || "Bus"}`} right={trip ? <Badge tone="green">Trip in progress ({trip.mode === "simulation" ? "simulated GPS" : "real GPS"})</Badge> : <Badge tone="slate">Not started</Badge>}>
        <p className="mb-3 text-sm text-slate-600">{kannada ? "ಚಾಲಕ" : "Driver"}: <strong className="text-slate-800">{driver?.name || "—"}</strong> · {driver?.phone ? <a href={`tel:${driver.phone}`} className="font-semibold text-brand-700 hover:underline">{driver.phone}</a> : "—"} · {kannada ? "ಬಸ್" : "Bus"} {bus?.registrationNumber}</p>
        <LiveMap stops={stops} snapshot={snapshot} language={language} />
      </Card>

      <Card title={kannada ? "ಪ್ರಯಾಣ ನಿಯಂತ್ರಣಗಳು" : "Trip Controls"}>
        {!trip ? (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={gpsMode}
              onChange={(e) => setGpsMode(e.target.value as any)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="simulation">{kannada ? "GPS ಸಿಮ್ಯುಲೇಶನ್ (ಡೆಮೊಗೆ ಶಿಫಾರಸು)" : "GPS Simulation (recommended for demo)"}</option>
              <option value="real_gps">{kannada ? "ನೈಜ GPS (ಬ್ರೌಸರ್ ಸ್ಥಳ ಮಾಹಿತಿ)" : "Real GPS (browser Geolocation)"}</option>
            </select>
            <button onClick={startTrip} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              {kannada ? "ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ" : "Start Trip"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={endTrip} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
              {kannada ? "ಪ್ರಯಾಣ ಮುಗಿಸಿ" : "End Trip"}
            </button>
            {trip.mode === "simulation" && (
              <>
                <button onClick={() => api.post(`/tracking/simulation/${bus.id}/pause`)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{kannada ? "ವಿರಾಮ" : "Pause"}</button>
                <button onClick={() => api.post(`/tracking/simulation/${bus.id}/resume`)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{kannada ? "ಮುಂದುವರಿಸಿ" : "Resume"}</button>
              </>
            )}
          </div>
        )}
        {gpsError && <p className="mt-2 text-sm text-rose-600">{kannada ? "GPS ದೋಷ: " : "GPS error: "}{gpsError.replace(/^GPS error: /, "")}</p>}
        {trip?.mode === "simulation" && (
          <p className="mt-2 text-xs text-slate-500">
            {kannada ? "ಸಿಮ್ಯುಲೇಟರ್ ನೈಜ GPS ಸ್ಥಳಗಳನ್ನು ಸೃಷ್ಟಿಸಿ, ನೈಜ GPS ನಂತೆಯೇ ಬ್ಯಾಕೆಂಡ್ ಟ್ರ್ಯಾಕಿಂಗ್ ವ್ಯವಸ್ಥೆಗೆ ಕಳುಹಿಸುತ್ತದೆ." : "The simulator generates real lat/lng fixes and pushes them through the same backend tracking pipeline as real GPS — it does not fake movement on the frontend."}
          </p>
        )}
      </Card>

    </div>
  );
}
