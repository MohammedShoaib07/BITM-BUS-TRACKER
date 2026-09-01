import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";

/*
  Expected QR format (comma-separated, 8 fields):
  2025-26/ECE , MD OWAIS S , 3BR24EC097 , ECE , II - YEAR , 3 & 4 SEM ONLY , Rs. 15000/- , 10.10.2026
  [7] Expiry date DD.MM.YYYY — verified against today
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
  expiryDateObj: Date;
}

type VerifyResult =
  | { status: "valid"; pass: ParsedPass }
  | { status: "expired"; pass: ParsedPass }
  | { status: "invalid"; reason: string };

function parseQR(raw: string): VerifyResult {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length < 8) return { status: "invalid", reason: "Not a BITM bus pass QR code." };

  const [academicYear, name, rollNumber, department, year, semester, feeAmount, expiryRaw] = parts;
  const dateParts = expiryRaw?.split(".");
  if (dateParts?.length !== 3) return { status: "invalid", reason: `Unreadable expiry date: "${expiryRaw}"` };

  const [dd, mm, yyyy] = dateParts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return { status: "invalid", reason: `Invalid date format: "${expiryRaw}"` };

  const expiryDateObj = new Date(yyyy, mm - 1, dd, 23, 59, 59);
  const pass: ParsedPass = { academicYear, name, rollNumber, department, year, semester, feeAmount, expiryDate: expiryRaw, expiryDateObj };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDateObj >= today ? { status: "valid", pass } : { status: "expired", pass };
}

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

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
    } catch {
      setCamError("Camera access denied. Please allow camera permission and try again.");
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

  useEffect(() => () => stopCamera(), [stopCamera]);

  function reset() {
    setResult(null);
    setCamError(null);
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const isValid = result.status === "valid";
    const pass = result.status !== "invalid" ? result.pass : null;

    return (
      <div className={`rounded-2xl border-2 overflow-hidden ${isValid ? "border-emerald-300" : "border-rose-300"}`}>
        {/* Status banner */}
        <div className={`px-5 py-4 ${isValid ? "bg-emerald-500" : "bg-rose-500"}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">
            {isValid ? "Pass Verification" : "Pass Verification"}
          </p>
          <p className="mt-1 text-xl font-black text-white">
            {isValid ? "BOARDING AUTHORISED" : result.status === "expired" ? "FEE NOT PAID / PASS EXPIRED" : "INVALID QR CODE"}
          </p>
          <p className="mt-0.5 text-sm font-medium text-white/80">
            {isValid
              ? `Valid until ${pass!.expiryDate}`
              : result.status === "expired"
              ? `Pass expired on ${pass!.expiryDate}`
              : result.reason}
          </p>
        </div>

        {/* Pass details */}
        {pass && (
          <div className={`divide-y px-5 py-3 ${isValid ? "bg-emerald-50 divide-emerald-100" : "bg-rose-50 divide-rose-100"}`}>
            <Row label="Name" value={pass.name} bold />
            <Row label="Roll No." value={pass.rollNumber} />
            <Row label="Department" value={pass.department} />
            <Row label="Year / Semester" value={`${pass.year} · ${pass.semester}`} />
            <Row label="Academic Year" value={pass.academicYear} />
            <Row label="Fee Amount" value={pass.feeAmount} />
            <Row
              label="Valid Until"
              value={pass.expiryDate}
              valueClass={isValid ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}
            />
          </div>
        )}

        <div className={`px-5 py-4 ${isValid ? "bg-emerald-50" : "bg-rose-50"}`}>
          <button
            onClick={reset}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 active:scale-95 transition-transform"
          >
            Scan Next Passenger
          </button>
        </div>
      </div>
    );
  }

  // ── Scanner screen ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Viewfinder */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!scanning && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900">
            <div className="h-12 w-12 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Camera not started</p>
          </div>
        )}

        {scanning && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-52 w-52 sm:h-60 sm:w-60">
                {[
                  "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                ].map((cls, i) => (
                  <span key={i} className={`absolute h-8 w-8 border-white ${cls}`} />
                ))}
                <div className="absolute inset-x-0 top-1/2 h-px bg-blue-400/70 animate-pulse" />
              </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="rounded-full bg-black/50 px-4 py-1.5 text-xs font-medium text-white tracking-wide">
                Point camera at QR code
              </span>
            </div>
          </>
        )}

        {camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/95 px-6 text-center">
            <p className="text-sm font-semibold text-rose-400">{camError}</p>
          </div>
        )}
      </div>

      {!scanning ? (
        <button
          onClick={startCamera}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-transform"
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
  );
}

function Row({ label, value, bold, valueClass }: { label: string; value: string; bold?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className={`text-right text-sm ${valueClass ?? (bold ? "font-bold text-slate-900" : "font-medium text-slate-700")}`}>
        {value}
      </span>
    </div>
  );
}
