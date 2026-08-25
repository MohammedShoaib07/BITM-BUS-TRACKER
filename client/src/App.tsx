import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import StudentDashboard from "./pages/student/Dashboard";
import StudentPass from "./pages/student/Pass";
import DriverDashboard from "./pages/driver/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  if (!user) return null;

  const studentLinks = [
    { to: "/", label: "Track Bus" },
    { to: "/pass", label: "Digital Pass" }
  ];

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-5">
      <div className="glass-panel mx-auto flex max-w-6xl items-center justify-between rounded-3xl px-4 py-3 sm:px-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/bitm-logo.jpg" alt="BITM" className="h-10 w-24 object-contain" />
          <span className="hidden border-l border-slate-300 pl-3 text-sm font-bold text-slate-800 sm:block">SmartBus</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user.role === "student" &&
            studentLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-2xl px-3 py-2 font-semibold ${location.pathname === l.to ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15" : "text-slate-600 hover:bg-white/70"}`}
              >
                {l.label}
              </Link>
            ))}
          <span className="mx-2 hidden h-6 w-px bg-slate-300 sm:block" />
          <span className="hidden text-right sm:block">
            <strong className="block text-xs text-slate-800">{user.name}</strong>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{user.role}</span>
          </span>
          <button onClick={logout} className="ml-1 rounded-2xl border border-slate-300/70 bg-white/50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white">
            Exit
          </button>
        </nav>
      </div>
    </header>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6 text-slate-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "student") return <StudentDashboard />;
  if (user.role === "driver") return <DriverDashboard />;
  return <AdminDashboard />;
}

export default function App() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        <div className="animate-pulse">
          <p className="text-3xl font-black tracking-tight">BITM SmartBus</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Developed by team Dotenv</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<RequireAuth><RoleHome /></RequireAuth>} />
        <Route path="/pass" element={<RequireAuth><StudentPass /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
