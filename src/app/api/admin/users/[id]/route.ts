import { db } from "@/server/db";
import { E, noContent, ok, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { ALL_ROLES, asEnum } from "@/server/validate";
import { removeProposal } from "@/server/files";

type P = { id: string };
async function target(id: string) {
  const u = await db.user.findUnique({ where: { id }, include: { organizer: true } });
  if (!u) throw E.notFound("Pengguna tidak ditemukan");
  return u;
}
/** Ubah peran / status aktif akun. Admin tidak bisa mengubah akunnya sendiri. Sesi target dicabut agar perubahan langsung berlaku. */
export const PATCH = route<P>(async (req, { id }) => {
  const me = await requireAdmin();
  const u = await target(id);
  const b = await readJson(req);
  if (u.id === me.id && ("role" in b || "active" in b)) throw E.bad("SELF_CHANGE", "Tidak bisa mengubah peran/status akun sendiri");
  const f: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  let role = u.role;
  if ("role" in b) { const r = asEnum(b.role, ALL_ROLES); if (!r) f.role = "Peran harus VISITOR, ORGANIZER, atau ADMIN"; else data.role = role = r; }
  if ("active" in b) { if (typeof b.active !== "boolean") f.active = "Harus true/false"; else data.active = b.active; }
  if (Object.keys(f).length) throw E.validation(f);
  const nu = await db.$transaction(async (tx) => {
    if (role === "ORGANIZER" && !u.organizer) await tx.organizer.create({ data: { name: u.name, ownerId: u.id } });
    const x = await tx.user.update({ where: { id }, data, include: { organizer: true } });
    if (data.role !== undefined && data.role !== u.role || data.active === false) await tx.session.deleteMany({ where: { userId: id } });
    return x;
  });
  return ok(userOut(nu));
});
/** Hapus akun beserta datanya (penyelenggara & event miliknya, pendaftaran, notifikasi). */
export const DELETE = route<P>(async (_r, { id }) => {
  const me = await requireAdmin();
  const u = await target(id);
  if (u.id === me.id) throw E.bad("SELF_CHANGE", "Tidak bisa menghapus akun sendiri");
  const events = u.organizer ? await db.event.findMany({ where: { organizerId: u.organizer.id }, select: { id: true, proposalFile: true } }) : [];
  await db.$transaction([
    db.notification.deleteMany({ where: { eventId: { in: events.map((e) => e.id) } } }),
    db.user.delete({ where: { id } }),
  ]);
  for (const e of events) await removeProposal(e.proposalFile);
  return noContent();
});
