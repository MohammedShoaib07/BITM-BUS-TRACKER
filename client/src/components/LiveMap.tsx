import React, { useLayoutEffect, useRef, useState } from "react";
import { Stop, TrackingSnapshot } from "../types";

interface LiveMapProps {
  stops: Stop[];
  snapshot: TrackingSnapshot | null;
  height?: string;
  pickupStopId?: string;
  language?: "en" | "kn";
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveMap({ stops, snapshot, pickupStopId, language = "en" }: LiveMapProps) {
  const kannada = language === "kn";
  const orderedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const etaByStop = new Map(snapshot?.stopEtas.map((e) => [e.stopId, e]) || []);

  // Refs to each stop dot so we can measure their exact pixel positions
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dotTops, setDotTops] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const tops = dotRefs.current.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.top - containerTop + r.height / 2;
    });
    setDotTops(tops);
  }, [stops, snapshot]);

  function formatEta(seconds: number) {
    if (seconds <= 0) return kannada ? "ಬರುತ್ತಿದೆ" : "Arriving";
    if (seconds < 60) return "< 1 min";
    const m = Math.round(seconds / 60);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  // Determine stop state — last stop is "reached" once bus arrives there
  function getStopState(stop: Stop, idx: number) {
    if (!snapshot) return { kind: "upcoming" as const, label: kannada ? "ಮುಂದಿನದು" : "Upcoming" };

    const nextIdx = orderedStops.findIndex((s) => s.id === snapshot.nextStopId);
    const isLastStop = idx === orderedStops.length - 1;

    // Bus has passed this stop
    if (idx < nextIdx) return { kind: "reached" as const, label: kannada ? "ದಾಟಲಾಗಿದೆ" : "Reached" };

    // This is the next stop the bus is heading to
    if (stop.id === snapshot.nextStopId) {
      const atStop = snapshot.distanceToNextStopMeters <= 30;
      // Last stop: once within 30m, mark reached
      if (isLastStop && atStop) return { kind: "reached" as const, label: kannada ? "ದಾಟಲಾಗಿದೆ" : "Reached" };
      return {
        kind: atStop ? ("current" as const) : ("approaching" as const),
        label: atStop
          ? (kannada ? "ಈ minute ನಲ್ಲಿ" : "At stop")
          : (kannada ? "ಹತ್ತಿರದಲ್ಲಿದೆ" : "Approaching"),
      };
    }

    return { kind: "upcoming" as const, label: kannada ? "ಮುಂದಿನದು" : "Upcoming" };
  }

  // Bus marker pixel position — interpolated between prev and next dot
  const busTop = (() => {
    if (!snapshot || dotTops.length !== orderedStops.length) return null;

    const prevIdx = orderedStops.findIndex((s) => s.id === snapshot.previousStopId);
    const nextIdx = orderedStops.findIndex((s) => s.id === snapshot.nextStopId);

    // Bus at last stop (terminal)
    const isLastStop = nextIdx === orderedStops.length - 1;
    if (isLastStop && snapshot.distanceToNextStopMeters <= 30) {
      return dotTops[nextIdx];
    }

    if (prevIdx === -1 && nextIdx !== -1) return dotTops[nextIdx]; // before first stop
    if (prevIdx === -1 || nextIdx === -1) return null;

    const prevStop = orderedStops[prevIdx];
    const nextStop = orderedStops[nextIdx];

    let progress = 0.5;
    if (prevStop.latitude && prevStop.longitude && nextStop.latitude && nextStop.longitude) {
      const segLen = haversineMeters(prevStop.latitude, prevStop.longitude, nextStop.latitude, nextStop.longitude);
      if (segLen > 0) {
        progress = Math.max(0, Math.min(1, 1 - snapshot.distanceToNextStopMeters / segLen));
      }
    }

    return dotTops[prevIdx] + progress * (dotTops[nextIdx] - dotTops[prevIdx]);
  })();

  // Track line: from first dot to last dot
  const trackTop = dotTops[0] ?? 0;
  const trackBottom = dotTops[dotTops.length - 1] ?? 0;
  const trackHeight = trackBottom - trackTop;

  // Filled (green) portion of track: from first dot to bus position
  const filledHeight = busTop !== null ? Math.max(0, busTop - trackTop) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white text-sm shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">
              {kannada ? "ಪ್ರಯಾಣದ ಸಮಯರೇಖೆ" : "Live Journey Timeline"}
            </p>
            <p className="mt-1 text-base font-bold">
              {snapshot
                ? `${kannada ? "ಮುಂದಿನ ನಿಲ್ದಾಣ: " : "Next: "}${snapshot.nextStopName || (kannada ? "ಮಾರ್ಗ ಪೂರ್ಣ" : "Route complete")}`
                : (kannada ? "ನೈಜ ಸ್ಥಳಕ್ಕಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ" : "Waiting for driver to start trip")}
            </p>
            {snapshot && (
              <p className="mt-0.5 text-xs text-blue-200">
                {kannada ? "ನವೀಕರಿಸಲಾಗಿದೆ " : "Updated "}{new Date(snapshot.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="shrink-0 rounded-xl bg-white/20 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">
              {kannada ? "ಅಂದಾಜು ಸಮಯ" : "ETA"}
            </p>
            <p className="text-2xl font-black text-white leading-tight">
              {snapshot ? formatEta(snapshot.etaToNextStopSeconds) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div ref={containerRef} className="relative px-5 py-5">
        {/* Grey track line — from first dot to last dot */}
        {trackHeight > 0 && (
          <span
            className="pointer-events-none absolute w-0.5 bg-slate-200"
            style={{ left: "1.75rem", top: trackTop, height: trackHeight }}
            aria-hidden="true"
          />
        )}
        {/* Green filled track — from first dot to bus */}
        {trackHeight > 0 && filledHeight > 0 && (
          <span
            className="pointer-events-none absolute w-0.5 bg-emerald-400 transition-all duration-500"
            style={{ left: "1.75rem", top: trackTop, height: filledHeight }}
            aria-hidden="true"
          />
        )}

        {/* Bus marker — pinned to exact dot pixel position */}
        {busTop !== null && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: "0.85rem",
              top: busTop,
              transform: "translateY(-50%)",
              transition: "top 0.8s linear",
            }}
          >
            <span className="text-2xl drop-shadow-md leading-none">🚌</span>
          </div>
        )}

        <ol className="space-y-0">
          {orderedStops.map((stop, idx) => {
            const eta = etaByStop.get(stop.id);
            const isPickup = stop.id === pickupStopId;
            const state = getStopState(stop, idx);
            const isReached = state.kind === "reached";
            const isCurrent = state.kind === "current" || state.kind === "approaching";
            const isLast = idx === orderedStops.length - 1;

            return (
              <li key={stop.id} className={`relative flex items-start gap-4 ${isLast ? "" : "pb-5"}`}>
                {/* Dot — measured via ref */}
                <div className="relative flex w-4 shrink-0 justify-center pt-1">
                  <span
                    ref={(el) => { dotRefs.current[idx] = el; }}
                    className={`relative z-10 block h-4 w-4 rounded-full border-2 border-white shadow transition-colors duration-300 ${
                      isReached
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-blue-600 ring-4 ring-blue-100"
                        : "bg-slate-300"
                    }`}
                  />
                </div>

                {/* Stop info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold leading-snug ${
                        isReached ? "text-emerald-700" : isCurrent ? "text-blue-800" : "text-slate-700"
                      }`}>
                        {stop.name}
                        {isPickup && (
                          <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {kannada ? "ನಿಮ್ಮ ನಿಲ್ದಾಣ" : "Your stop"}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {kannada ? "ನಿಲ್ದಾಣ" : "Stop"} {stop.sequence}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isReached
                        ? "bg-emerald-100 text-emerald-700"
                        : isCurrent
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {isReached
                        ? (kannada ? "✓ ದಾಟಲಾಗಿದೆ" : "✓ Reached")
                        : isCurrent
                        ? (eta ? formatEta(eta.etaSeconds) : state.label)
                        : (eta ? formatEta(eta.etaSeconds) : (kannada ? "ಕಾಯಲಾಗುತ್ತಿದೆ" : "Awaiting"))}
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-medium text-blue-600">
                        {state.label}
                        {eta && snapshot && ` · ${(snapshot.distanceToNextStopMeters / 1000).toFixed(1)} km away`}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
