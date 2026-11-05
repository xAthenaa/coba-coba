import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteksi halaman per peran. Hanya memeriksa keberadaan cookie sesi + petunjuk peran (wayo_role);
 * validasi sesi yang sesungguhnya & otorisasi tetap di Route Handlers (/api/*).
 */
const PUBLIC = ["/", "/login", "/daftar", "/lupa-password"];
const ORGANIZER_ONLY = ["/panitia"];
const VISITOR_ONLY = ["/scan", "/event-saya"];
const starts = (p: string, list: string[]) => list.some((b) => p === b || p.startsWith(b + "/"));

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get("wayo_session")?.value;
  const role = req.cookies.get("wayo_role")?.value;
  // Halaman publik (termasuk "/" dan "/login") selalu lolos; jangan alihkan berdasar cookie yang belum divalidasi.
  if (starts(pathname, PUBLIC)) return NextResponse.next();
  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (starts(pathname, ORGANIZER_ONLY) && role !== "ORGANIZER") return NextResponse.redirect(new URL("/home", req.url));
  if (starts(pathname, VISITOR_ONLY) && role === "ORGANIZER") return NextResponse.redirect(new URL("/panitia", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|json|txt)$).*)"] };
