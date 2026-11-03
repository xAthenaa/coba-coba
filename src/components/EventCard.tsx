"use client";
import Link from "next/link";
import { eventStatus, fmtDate, campuses } from "@/lib/data";
import type { UIEvent } from "@/lib/api";
import { Icon } from "./Icon";
import { Poster } from "./Poster";

export function EventCard({ e, href, action = "Lihat Detail" }: { e: UIEvent; href?: string; action?: string }) {
  const pl = e.place;
  const st = eventStatus(e);
  const d = new Date(e.start);
  return (
    <article className={`overflow-hidden rounded-xl bg-primary text-white shadow ${st === "selesai" ? "opacity-70 grayscale" : ""}`}>
      <div className="relative">
        <Poster e={e} className="h-36" />
        <div className="absolute right-3 top-3 rounded-lg bg-primary px-2 py-1 text-center text-xs font-semibold leading-tight">
          {d.toLocaleDateString("id-ID", { day: "numeric", timeZone: "Asia/Makassar" })}<br />{d.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Makassar" })}
        </div>
        {st !== "akan datang" && <span className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold ${st === "selesai" ? "bg-ink-2" : "bg-success"}`}>{st === "selesai" ? "Selesai" : "Berlangsung"}</span>}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-base font-semibold leading-snug">{e.name}</h3>
        <p className="flex items-center gap-1 text-xs text-white/90"><Icon name="pin" size={14} />{pl?.name ?? "-"}, {pl ? campuses[pl.campus].name : ""}</p>
        <p className="text-xs text-white/90">{fmtDate(e.start)}</p>
        <Link href={href ?? `/event/${e.id}`} className="mt-2 flex h-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-primary">{action}</Link>
      </div>
    </article>
  );
}
