import type { WEvent } from "@/lib/types";
/** Poster placeholder (tidak ada aset gambar asli — data contoh). */
export function Poster({ e, className = "" }: { e: WEvent; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4 text-center ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">Poster (contoh)</span>
      <span className="mt-1 line-clamp-2 text-lg font-bold text-primary">{e.name.replace(" (contoh)", "")}</span>
    </div>
  );
}
