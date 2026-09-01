import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Card } from "../../components/ui";

export default function StudentPass() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get("/student/profile").then((res) => setProfile(res.data));
  }, []);

  if (!profile) return <p className="p-6 text-slate-500">Loading tracking details…</p>;

  const { student, bus, route } = profile;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <Card title="Tracking Details">
        <div className="space-y-2 text-sm text-slate-700">
          <p><strong>Student:</strong> {student?.rollNumber || "—"}</p>
          <p><strong>Route:</strong> {route?.name || "—"}</p>
          <p><strong>Bus:</strong> {bus?.registrationNumber || "—"}</p>
          <p className="text-xs text-slate-500">This app is configured for live bus tracking only.</p>
        </div>
      </Card>
    </div>
  );
}
