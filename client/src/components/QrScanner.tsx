import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";

/*
  Expected QR format (comma-separated, 8 fields):
  2025-26/ECE , MD OWAIS S , 3BR24EC097 , ECE , II - YEAR , 3 & 4 SEM ONLY , Rs. 15000/- , 10.10.2026
  [0] Academic year / dept
  [1] Student name
  [2] Roll number
  [3] Department
  [4] Year
  [5] Semester
  [6] Fee amount
  [7] Expiry date  DD.MM.YYYY  ← verified against today
*/

interface ParsedPass {
  academicYear: string;
  name: string;
  rollNumber: string;
  department: string;
  year: string;
  semester: string;
  feeAmount: string;
  expiryDate: string;
  expiryDateObj: Date | null;
}

type VerifyResult =
  | { status: "valid"; pass: ParsedPass }
  | { status: "expired"; pass: ParsedPass }
  | { status: "invalid"; reason: string };

function parseQR(raw: string): VerifyResult {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length < 8) return { status: "invalid", reason: "QR code format not recognised. Not a BITM bus pass." };

  const [academicYear, name, rollNumber, department, year, semester, feeAmount, expiryRaw] = parts;

  // Parse DD.MM.YYYY
  const dateParts = expiryRaw?.split(".");
  let expiryDateObj: Date | null = null;
  if (dateParts?.length === 3) {
    const [dd, mm, yyyy] = dateParts.map(Number);
    if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
      expiryDateObj = new Date(yyyy, mm - 1, dd, 23, 59, 59);
    }
  }

  if (!expiryDateObj) return { status: "invalid", reason: `Cannot read expiry date "${expiryRaw}". Expected DD.MM.YYYY.` };

  const pass: ParsedPass = { academicYear, name, rollNumber, department, year, semester, feeAmount, expiryDate: expiryRaw, expiryDateObj };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiryDateObj >= today
    ? { status: "valid", pass }
    : { status: "expired", pass };
}

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [mode, setMode] = useState<"camera" | "manual">("camera");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
    } catch (e: any) {
      setCamError("Camera access denied. Use manual entry below.");
    }
  }, []);

  // Scan loop
  useEffect(() => {
    if (!scanning) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    function tick() {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas!.width = video.videoWidth;
      canvas!.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas!.width, canvas!.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        stopCamera();
        setResult(parseQR(code.data));
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scanning, stopCamera]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setResult(parseQR(manualInput.trim()));
  }

  function reset() {
    setResult(null);
    setManualInput("");
    setCamError(null);
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const isValid = result.status === "valid";
    const isExpired = result.status === "expired";
    const pass = result.status !== "invalid" ? result.pass : null;

    return (
      <div className={`rounded-2xl border-2 p-5 ${isValid ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
        {/* Status banner */}
        <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 ${isValid ? "bg-emerald-500" : "bg-rose-500"}`}>
          <span className="text-3xl">{isValid ? "✅" : "❌"}</span>
          <div>
            <p className="text-lg font-black text-white">
              {isValid ? "BOARDING AUTHORISED" : isExpired ? "FEE NOT PAID / PASS EXPIRED" : "INVALID QR CODE"}
            </p>
            <p className="text-xs font-medium text-white/80">
              {isValid
                ? `Valid until ${pass!.expiryDate}`
                : isExpired
                ? `Pass expired on ${pass!.expiryDate}`
                : (result as any).reason}
            </p>
          </div>
        </div>

        {/* Pass details */}
        {pass && (
          <div className="space-y-2">
            <Row label="Name" value={pass.name} highlight />
            <Row label="Roll No." value={pass.rollNumber} />
            <Row label="Department" value={pass.department} />
            <Row label="Year / Sem" value={`${pass.year} · ${pass.semester}`} />
            <Row label="Academic Year" value={pass.academicYear} />
            <Row label="Fee Paid" value={pass.feeAmount} />
            <Row
              label="Valid Until"
              value={pass.expiryDate}
              valueClass={isValid ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}
            />
          </div>
        )}

        <button
          onClick={reset}
          className="mt-5 w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 active:scale-95 transition-transform"
        >
          Scan Next Passenger
        </button>
      </div>
    );
  }

  // ── Scanner screen ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        {(["camera", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { stopCamera(); setMode(m); setCamError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {m === "camera" ? "📷  Camera Scan" : "⌨️  Manual Entry"}
          </button>
        ))}
      </div>

      {mode === "camera" && (
        <div className="space-y-3">
          {/* Viewfinder */}
          <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {!scanning && !camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80">
                <span className="text-5xl">📷</span>
                <p className="text-sm font-medium text-white">Camera not started</p>
              </div>
            )}

            {scanning && (
              <>
                {/* Corner brackets */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-48 sm:h-56 sm:w-56">
                    {["top-0 left-0 border-t-4 border-l-4 rounded-tl-lg",
                      "top-0 right-0 border-t-4 border-r-4 rounded-tr-lg",
                      "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg",
                      "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg"
                    ].map((cls, i) => (
                      <span key={i} className={`absolute h-8 w-8 border-white ${cls}`} />
                    ))}
                    {/* Scan line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400/80 animate-pulse" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                    Point at QR code on bus pass
                  </span>
                </div>
              </>
            )}

            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 px-6 text-center">
                <span className="text-3xl">🚫</span>
                <p className="text-sm font-medium text-rose-300">{camError}</p>
              </div>
            )}
          </div>

          {!scanning ? (
            <button
              onClick={startCamera}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 active:scale-95 transition-transform"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
            >
              Stop Camera
            </button>
          )}
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={handleManual} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Paste QR content
            </label>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              rows={4}
              placeholder="2025-26/ECE , MD OWAIS S , 3BR24EC097 , ECE , II - YEAR , 3 & 4 SEM ONLY , Rs. 15000/- , 10.10.2026"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-700 active:scale-95 transition-transform"
          >
            Verify Pass
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value, highlight, valueClass }: { label: string; value: string; highlight?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`text-right text-sm font-semibold ${valueClass ?? (highlight ? "text-slate-900" : "text-slate-700")}`}>
        {value}
      </span>
    </div>
  );
}
