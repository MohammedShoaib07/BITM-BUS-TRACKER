import React from "react";
import { Stop, TrackingSnapshot } from "../types";

interface LiveMapProps {
  stops: Stop[];
  snapshot: TrackingSnapshot | null;
  height?: string;
  pickupStopId?: string;
}

export default function LiveMap({ stops, snapshot, height = "420px", pickupStopId }: LiveMapProps) {
  const orderedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const nextSequence = orderedStops.find((stop) => stop.id === snapshot?.nextStopId)?.sequence;
  const etaByStop = new Map(snapshot?.stopEtas.map((eta) => [eta.stopId, eta]) || []);

  function formatEta(seconds: number) {
    if (seconds <= 0) return "Arriving";
    if (seconds < 60) return "< 1 min";
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="text-brand-500">⌄</span>
          Journey Timeline
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800">{snapshot ? `Next stop: ${snapshot.nextStopName || "Route complete"}` : "Waiting for live location"}</p>
            <p className="mt-1 text-xs text-slate-500">{snapshot ? `Last updated ${new Date(snapshot.timestamp).toLocaleTimeString()}` : "The timeline will update when the driver starts the trip."}</p>
          </div>
          <div className="rounded-md bg-brand-50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-700">Estimated time</p>
            <p className="text-lg font-bold text-brand-700">{snapshot ? formatEta(snapshot.etaToNextStopSeconds) : "—"}</p>
          </div>
        </div>
      </div>
      <ol className="relative space-y-3 px-4 py-5 sm:px-6">
        <span className="pointer-events-none absolute bottom-5 left-[1.55rem] top-5 w-0.5 bg-brand-200 sm:left-[2.05rem]" aria-hidden="true" />
        {snapshot && (
          <span
            className="pointer-events-none absolute left-[1.55rem] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-0.5 text-sm leading-5 shadow-sm transition-[top] duration-700 ease-out sm:left-[2.05rem]"
            style={{ top: `${Math.max(2, Math.min(98, snapshot.progressPercent))}%` }}
            title="Live bus position"
            aria-label={`Live bus position, ${Math.round(snapshot.progressPercent)} percent along the route`}
          >
            🚌
          </span>
        )}
        {orderedStops.map((stop: Stop) => {
          const eta = etaByStop.get(stop.id);
          const isNext = stop.id === snapshot?.nextStopId;
          const isPassed = Boolean(snapshot && nextSequence !== undefined && stop.sequence < nextSequence && !eta);
          const isPickup = stop.id === pickupStopId;
          return (
            <li key={stop.id} className="relative flex gap-3">
              <div className="relative flex w-5 shrink-0 justify-center">
                <span className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${isNext ? "bg-brand-500 ring-4 ring-brand-100" : isPassed ? "bg-rose-500" : "bg-brand-500"}`} />
              </div>
              <div className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${isPassed ? "border border-rose-100 bg-rose-50/70" : "border border-brand-200 bg-brand-50"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className={`font-semibold ${isNext ? "text-brand-800" : "text-slate-700"}`}>{stop.name}</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Stop {stop.sequence}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${isPassed ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"}`}>
                    {isPassed ? "Passed" : eta ? formatEta(eta.etaSeconds) : "Awaiting"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>{isNext ? "Next stop" : isPassed ? "Reached" : "Upcoming"}</span>
                  {eta && <span>{(eta.distanceMeters / 1000).toFixed(1)} km away</span>}
                  {isPickup && <span className="font-semibold text-brand-700">Your stop</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
