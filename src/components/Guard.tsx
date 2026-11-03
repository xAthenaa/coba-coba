"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, type Role } from "@/lib/auth";
import { useToast } from "./Toast";

/** Pelindung halaman di sisi klien (lapisan kedua setelah middleware.ts). allow = peran yang boleh. */
export function Guard({ allow, children, msg }: { allow: Role[]; children: React.ReactNode; msg?: string }) {
  const s = useSession();
  const r = useRouter();
  const toast = useToast();
  const ok = s && allow.includes(s.role);
  useEffect(() => {
    if (s === undefined || ok) return;
    toast(msg ?? "Silakan masuk terlebih dahulu", "error");
    r.replace(!s ? `/login?next=${encodeURIComponent(location.pathname)}` : s.role === "panitia" ? "/panitia" : "/home");
  }, [s, ok, r, toast, msg]);
  if (!ok) return <div className="flex flex-1 items-center justify-center text-sm text-ink-2">Memuat…</div>;
  return <>{children}</>;
}
