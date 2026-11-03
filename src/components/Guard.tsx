"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, type Role } from "@/lib/auth";
import { useToast } from "./Toast";

/** Melindungi halaman: allow = peran yang boleh. Tamu tidak boleh scan QR. */
export function Guard({ allow, children, msg }: { allow: Role[]; children: React.ReactNode; msg?: string }) {
  const s = useSession();
  const r = useRouter();
  const toast = useToast();
  const ok = s && allow.includes(s.role);
  useEffect(() => {
    if (s === undefined || ok) return;
    toast(msg ?? "Silakan masuk terlebih dahulu", "error");
    r.replace(s?.role === "pengunjung" || s?.role === "tamu" ? (s.role === "tamu" ? "/login?perlu=login" : "/home") : "/login");
  }, [s, ok, r, toast, msg]);
  if (!ok) return <div className="flex flex-1 items-center justify-center text-sm text-ink-2">Memuat…</div>;
  return <>{children}</>;
}
