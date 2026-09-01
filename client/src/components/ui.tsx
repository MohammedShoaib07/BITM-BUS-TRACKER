import React from "react";

export function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "slate"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-blue-100 text-blue-900 border-slate-950",
    red: "bg-rose-100 text-rose-800 border-slate-950",
    amber: "bg-blue-50 text-blue-900 border-slate-950",
    slate: "bg-slate-100 text-slate-800 border-slate-950"
  };
  return <span className={`inline-block border-2 px-2.5 py-0.5 text-xs font-black uppercase ${tones[tone]}`}>{children}</span>;
}

export function Card({ title, children, right }: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight text-slate-900">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
      <div className="truncate text-lg font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}
