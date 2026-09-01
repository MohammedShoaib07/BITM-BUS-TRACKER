import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { getSocket } from "../../services/socket";
import LiveMap from "../../components/LiveMap";
import { Stop, TrackingSnapshot } from "../../types";

interface BusOption {
  id: string;
  number: number;
  registrationNumber: string;
  route: { name: string; description: string } | null;
  activeTrip: any;
}

interface BusDetails {
  bus: BusOption;
  route: { name: string; description: string } | null;
  stops: Stop[];
  activeTrip: any;
  snapshot: TrackingSnapshot | null;
}

const unavailableBuses = new Set([12, 13, 15, 18]);

export default function BusTracker() {
  const navigate = useNavigate();
  const { busId } = useParams<{ busId: string }>();
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [details, setDetails] = useState<BusDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BusOption[]>("/tracking/public/buses")
      .then((res) => setBuses(res.data.filter((bus) => !unavailableBuses.has(bus.number))))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!busId) return;
    api.get<BusDetails>(`/tracking/public/buses/${busId}`).then((res) => setDetails(res.data));
    const socket = getSocket();
    socket.emit("subscribe:bus", busId);
    const handler = (snapshot: TrackingSnapshot) => {
      if (snapshot.busId === busId) setDetails((current) => current ? { ...current, snapshot } : current);
    };
    socket.on("bus:location", handler);
    return () => {
      socket.emit("unsubscribe:bus", busId);
      socket.off("bus:location", handler);
    };
  }, [busId]);

  if (loading) return <p className="p-6 text-slate-500">Loading buses...</p>;

  if (busId && details) {
    return (
      <div className="min-h-screen px-3 py-3 text-slate-900 sm:px-8 sm:py-5">
        <div className="mx-auto max-w-6xl">
          <button type="button" onClick={() => navigate("/student")} className="mb-5 text-sm font-bold text-slate-600 hover:text-slate-900">← All buses</button>
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2 sm:mb-4 sm:gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">Bus {details.bus.number}</p>
                <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{details.route?.name || "Route"}</h1>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{details.bus.registrationNumber} · {details.route?.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${details.activeTrip ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {details.activeTrip ? "Live trip" : "Not currently moving"}
              </span>
            </div>
            <LiveMap stops={details.stops} snapshot={details.snapshot} />
          </section>
        </div>
      </div>
    );
  }

  if (busId) return <p className="min-h-screen p-6 text-slate-500">Loading bus...</p>;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden px-4 py-5 text-slate-900 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3 border-b border-white/70 pb-4">
          <button
            type="button"
            onClick={() => navigate("/login")}
            aria-label="Back to role selection"
            className="text-2xl leading-none text-slate-500 hover:text-slate-900"
          >
            ←
          </button>
          <h1 className="text-lg font-black text-slate-900 sm:text-2xl">Student Dashboard</h1>
        </div>
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <h2 className="text-center text-xl font-black text-slate-900 sm:text-3xl">Select Your Bus</h2>
          <div className="mx-auto mt-5 grid max-w-xl grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-7">
            {buses.map((bus) => (
              <button
                key={bus.id}
                type="button"
                onClick={() => navigate(`/student/bus/${bus.id}`)}
                className="flex h-14 items-center justify-center rounded-xl border border-white/80 bg-white/65 text-lg font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-white hover:text-cyan-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400/70 sm:h-16 sm:text-xl"
              >
                {bus.number}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}