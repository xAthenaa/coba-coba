"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { tokens } from "@/lib/tokens";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; href?: string };
const btnCls = (v: string) =>
  `flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.99] disabled:opacity-50 ${
    v === "primary" ? "bg-primary text-white" : v === "danger" ? "bg-danger text-white" : v === "ghost" ? "text-primary" : "border border-primary bg-white text-primary"
  }`;
export function Button({ variant = "primary", href, className = "", children, ...rest }: BtnProps) {
  if (href) return <Link href={href} className={`${btnCls(variant)} ${className}`}>{children}</Link>;
  return <button className={`${btnCls(variant)} ${className}`} {...rest}>{children}</button>;
}

export function BackButton({ href, className = "" }: { href?: string; className?: string }) {
  const r = useRouter();
  return (
    <button aria-label="Kembali" onClick={() => (href ? r.push(href) : history.length > 1 ? r.back() : r.push("/home"))}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow ${className}`}>
      <Icon name="back" />
    </button>
  );
}

export function Header({ title, back = true, backHref, right }: { title: string; back?: boolean; backHref?: string; right?: React.ReactNode }) {
  return (
    <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-6">
      {back && <BackButton href={backHref} className="!shadow-none -ml-2" />}
      <h1 className="flex-1 truncate text-xl font-semibold text-primary">{title}</h1>
      {right}
    </header>
  );
}

export function Field({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-ink">{label}</span>
      <input className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm outline-none focus:border-primary" {...rest} />
    </label>
  );
}

export function Toggle2<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
          className={`h-10 rounded-xl text-xs font-semibold ${value === o.v ? "bg-primary text-white" : "border border-primary bg-white text-primary"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, color, children, onClick, href }: { active?: boolean; color?: string; children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = `flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium ${active ? "bg-primary text-white" : "border border-line bg-white text-ink"}`;
  const inner = <>{color && !active && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}{children}</>;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function CatDot({ cat }: { cat: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tokens.category[cat] }} />;
}

export function Badge({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "green" | "gray" | "red" | "amber" }) {
  const map = { primary: "bg-primary-soft text-primary", green: "bg-green-100 text-green-800", gray: "bg-muted text-ink-2", red: "bg-red-100 text-red-800", amber: "bg-amber-100 text-amber-900" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-black/50 px-6" onClick={onClose} role="dialog" aria-modal>
      <div className="w-full max-w-[340px] rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[1500] flex items-end bg-black/50" onClick={onClose} role="dialog" aria-modal>
      <div className="w-full rounded-t-2xl bg-white p-6 pb-8" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Banner({ tone = "danger", children, action }: { tone?: "danger" | "info"; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${tone === "danger" ? "bg-red-50 text-red-800" : "bg-primary-soft text-primary"}`}>
      <span className="flex-1">{children}</span>{action}
    </div>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return <div className="py-12 text-center"><p className="text-base font-semibold text-ink">{title}</p>{sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}</div>;
}
