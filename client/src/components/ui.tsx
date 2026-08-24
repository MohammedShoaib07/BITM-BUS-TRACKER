import React from "react";

export function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "slate"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200"
  };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold tracking-tight text-slate-900">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl px-3 py-3 text-center">
      <div className="truncate text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
