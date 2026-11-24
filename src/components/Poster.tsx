"use client";
import { useState } from "react";
import type { WEvent } from "@/lib/types";
/** Poster event: gambar unggahan bila ada (fallback placeholder bila tidak ada / gagal dimuat). */
export function Poster({ e, className = "" }: { e: WEvent; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  if (e.poster && broken !== e.poster) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.poster} alt={`Poster ${e.name}`} onError={() => setBroken(e.poster)} className={`w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4 text-center ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">Poster (contoh)</span>
      <span className="mt-1 line-clamp-2 text-lg font-bold text-primary">{e.name.replace(" (contoh)", "")}</span>
    </div>
  );
}
