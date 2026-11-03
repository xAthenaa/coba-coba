"use client";
import { createContext, useCallback, useContext, useState } from "react";

const Ctx = createContext<(msg: string, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: string; id: number } | null>(null);
  const show = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    const id = Date.now();
    setT({ msg, kind, id });
    setTimeout(() => setT((c) => (c?.id === id ? null : c)), 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div role="status" className="pointer-events-none absolute inset-x-6 top-[72px] z-[2000] flex justify-center">
          <div className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.kind === "error" ? "bg-danger" : "bg-ink"}`}>
            {t.kind === "ok" ? "✓ " : "⚠ "}{t.msg}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
