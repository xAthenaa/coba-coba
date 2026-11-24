import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";

/** Ringkasan untuk Dashboard Admin. */
export const GET = route(async () => {
  await requireAdmin();
  const [users, visitors, organizers, admins, inactive, events, places, facilities, registrations, pins, notifications] = await Promise.all([
    db.user.count(), db.user.count({ where: { role: "VISITOR" } }), db.user.count({ where: { role: "ORGANIZER" } }), db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { active: false } }), db.event.count(), db.place.count(), db.facility.count(), db.registration.count(), db.pin.count(), db.notification.count(),
  ]);
  return ok({ users, visitors, organizers, admins, inactive, events, places, facilities, registrations, pins, notifications });
});
