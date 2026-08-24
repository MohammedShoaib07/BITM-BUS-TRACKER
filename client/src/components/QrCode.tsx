import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }, (err: Error | null | undefined) => {
        if (err) console.error("QR render error:", err);
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}
