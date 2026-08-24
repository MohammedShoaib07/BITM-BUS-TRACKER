import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      // error already surfaced via context
    } finally {
      setSubmitting(false);
    }
  }

  function fill(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="glass-panel relative w-full max-w-md rounded-[2rem] p-7 sm:p-9">
        <div className="mb-7 text-center">
          <img src="/bitm-logo.svg" alt="BITM logo" className="mx-auto mb-4 h-24 w-64 object-contain" />
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-700">Campus mobility, simplified</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Welcome to SmartBus</h1>
          <p className="mt-1 text-sm text-slate-500">Track every campus journey in real time.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm shadow-inner outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="you@bitm.edu"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm shadow-inner outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="brand-gradient w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-white/70 bg-white/40 p-3 text-xs text-slate-600">
          <p className="mb-2 font-semibold text-slate-700">Demo accounts (seeded data):</p>
          <div className="grid grid-cols-1 gap-1.5">
            <button onClick={() => fill("admin@bitm.edu", "admin123")} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-left hover:bg-white">
              Admin — admin@bitm.edu / admin123
            </button>
            <button onClick={() => fill("driver1@bitm.edu", "driver123")} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-left hover:bg-white">
              Driver — driver1@bitm.edu / driver123 (Bus 05)
            </button>
            <button onClick={() => fill("shoaib@bitm.edu", "student123")} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-left hover:bg-white">
              Student — shoaib@bitm.edu / student123 (fee PAID)
            </button>
            <button onClick={() => fill("arjun@bitm.edu", "student123")} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-left hover:bg-white">
              Student — arjun@bitm.edu / student123 (fee PENDING → denied demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
