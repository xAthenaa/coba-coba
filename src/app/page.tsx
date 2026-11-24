"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { roleHome, useSession } from "@/lib/auth";

/** S-00 Splash → L-01 (atau beranda jika sudah login) */
export default function Splash() {
  const r = useRouter();
  const s = useSession();
  useEffect(() => {
    if (s === undefined) return;
    const t = setTimeout(() => r.replace(s ? roleHome(s.role) : "/login"), 1200);
    return () => clearTimeout(t);
  }, [s, r]);
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-primary text-white">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold">WAYO</h1>
      <p className="text-sm text-white/90">Way To Go</p>
    </main>
  );
}
function Logo() {
  return <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15"><svg width="56" height="56" viewBox="0 0 24 24" fill="white"><path d="M2 11 22 3l-7 19-3-8z" /></svg></div>;
}
