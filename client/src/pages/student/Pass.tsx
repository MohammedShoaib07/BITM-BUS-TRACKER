import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Badge, Card } from "../../components/ui";
import QrCode from "../../components/QrCode";
import { useAuth } from "../../context/AuthContext";

export default function StudentPass() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get("/student/profile").then((res) => setProfile(res.data));
  }, []);

  if (!profile) return <p className="p-6 text-slate-500">Loading pass…</p>;
  const { pass, student, bus, route, fee } = profile;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Card title="Digital Bus Pass">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white">
          <div className="text-center">
            <p className="text-sm opacity-80">Ballari Institute of Technology and Management</p>
            <p className="text-lg font-bold">{user?.name}</p>
            <p className="text-xs opacity-80">{student?.rollNumber}</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <QrCode value={pass?.passNumber || "N/A"} />
          </div>
          <div className="text-center text-sm">
            <p>Pass No: {pass?.passNumber}</p>
            <p>Route: {route?.name} · Bus: {bus?.registrationNumber}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-100 p-3 text-center">
            <Badge tone={pass?.status === "valid" ? "green" : "red"}>{(pass?.status || "unknown").toUpperCase()}</Badge>
            <p className="mt-1 text-xs text-slate-500">Pass status</p>
          </div>
          <div className="rounded-lg border border-slate-100 p-3 text-center">
            <Badge tone={fee?.status === "PAID" ? "green" : "red"}>{fee?.status}</Badge>
            <p className="mt-1 text-xs text-slate-500">Fee status</p>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">Valid from {pass?.validFrom} to {pass?.validTo}</p>
      </Card>
    </div>
  );
}
