"use client";
import { BottomNav } from "./BottomNav";
/** Kerangka layar: header tetap (opsional), konten scroll, navbar bawah tetap (opsional). */
export function Screen({ header, nav = false, children, className = "", padded = true }: { header?: React.ReactNode; nav?: boolean; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <>
      {header}
      <main className={`relative min-h-0 flex-1 overflow-y-auto ${padded ? "px-6 py-4" : ""} ${className}`}>{children}</main>
      {nav && <BottomNav />}
    </>
  );
}
