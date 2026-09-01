import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "driver">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const kannada = language === "kn";

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-md sm:p-9">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setLanguage(kannada ? "en" : "kn")}
            className="rounded-full border border-slate-300 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white"
            aria-label={kannada ? "Switch to English" : "ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"}
          >
            {kannada ? "English" : "ಕನ್ನಡ"}
          </button>
        </div>
        <div className="mb-7 text-center">
          <img src="/bitm-logo.jpg" alt="BITM logo" className="mx-auto mb-4 h-24 w-64 object-contain" />
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-700">Campus mobility, simplified</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{kannada ? "SmartBus ಗೆ ಸ್ವಾಗತ" : "Welcome to SmartBus"}</h1>
          <p className="mt-1 text-sm text-slate-500">{kannada ? "ಪ್ರತಿ ಕ್ಯಾಂಪಸ್ ಪ್ರಯಾಣವನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ." : "Track every campus journey in real time."}</p>
        </div>

        {mode === "choose" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => navigate("/student")} className="rounded-2xl bg-cyan-500 px-4 py-4 text-lg font-black text-white shadow-lg shadow-cyan-900/20 hover:-translate-y-0.5 hover:bg-cyan-600">Student</button>
            <button type="button" onClick={() => setMode("driver")} className="rounded-2xl bg-slate-900 px-4 py-4 text-lg font-black text-white shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800">Driver</button>
          </div>
        ) : <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{kannada ? "ಇಮೇಲ್" : "Email"}</label>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">{kannada ? "ಪಾಸ್‌ವರ್ಡ್" : "Password"}</label>
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
            {submitting ? (kannada ? "ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ…" : "Signing in…") : (kannada ? "ಲಾಗಿನ್" : "Sign in")}
          </button>
          <button type="button" onClick={() => setMode("choose")} className="w-full text-sm font-semibold text-slate-500 hover:text-slate-800">Back</button>
        </form>}


      </div>
    </div>
  );
}
