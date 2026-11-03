"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useSession } from "@/lib/auth";

const visitor = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/peta", label: "Peta", icon: "map" },
  { href: "/event-saya", label: "Event Saya", icon: "star" },
  { href: "/profil", label: "Profil", icon: "user" },
];
const panitia = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/peta", label: "Peta", icon: "map" },
  { href: "/panitia", label: "Kelola", icon: "grid" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function BottomNav() {
  const path = usePathname();
  const s = useSession();
  const items = s?.role === "panitia" ? panitia : visitor;
  return (
    <nav aria-label={s?.role === "panitia" ? "Navbar Panitia" : "Navbar Pengunjung"} className="z-30 shrink-0 border-t border-line bg-white px-6 pb-3 pt-2">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/home" && path.startsWith(it.href));
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 text-xs ${active ? "font-semibold text-primary" : "text-ink-2"}`}>
                <Icon name={it.icon} size={22} />{it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
