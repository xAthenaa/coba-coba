import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { ALL_ROLES, asEnum } from "@/server/validate";

/** Daftar semua akun (Admin). ?q= nama/email, ?role=VISITOR|ORGANIZER|ADMIN */
export const GET = route(async (req) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const where: Record<string, unknown> = {};
  if (sp.get("role")) {
    const r = asEnum(sp.get("role"), ALL_ROLES);
    if (!r) throw E.validation({ role: "Peran tidak dikenal" });
    where.role = r;
  }
  const q = sp.get("q")?.trim().toLowerCase();
  const users = await db.user.findMany({ where, include: { organizer: true, _count: { select: { registrations: true } } }, orderBy: { createdAt: "asc" } });
  return ok(users
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))
    .map((u) => ({ ...userOut(u), organizerName: u.organizer?.name ?? null, registrationCount: u._count.registrations })));
});
