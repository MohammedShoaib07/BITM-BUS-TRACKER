import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Badge, Card } from "../../components/ui";
import { BoardingRecord } from "../../types";

export default function StudentHistory() {
  const [history, setHistory] = useState<BoardingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/history").then((res) => setHistory(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Card title="Boarding History">
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && history.length === 0 && <p className="text-sm text-slate-500">No boarding events yet.</p>}
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-800">{new Date(h.timestamp).toLocaleString()}</p>
                <p className="text-xs text-slate-500">{h.reason}</p>
              </div>
              <Badge tone={h.result === "ALLOW" ? "green" : "red"}>{h.result === "ALLOW" ? "Authorized" : "Denied"}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
