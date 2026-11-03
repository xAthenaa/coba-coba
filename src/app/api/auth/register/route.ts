import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { E, readJson, route } from "@/server/http";
import { startSession } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { ROLES, REQ, asEnum, isEmail, isStr } from "@/server/validate";

export const POST = route(async (req) => {
  const b = await readJson(req);
  const f: Record<string, string> = {};
  if (!isStr(b.name)) f.name = REQ;
  if (!isStr(b.email)) f.email = REQ; else if (!isEmail(b.email)) f.email = "Format email tidak valid";
  if (typeof b.password !== "string" || !b.password) f.password = REQ; else if (b.password.length < 8) f.password = "Minimal 8 karakter";
  const role = b.role === undefined ? "VISITOR" : asEnum(b.role, ROLES);
  if (!role) f.role = "Peran harus VISITOR atau ORGANIZER";
  if (Object.keys(f).length) throw E.validation(f);
  const email = (b.email as string).trim().toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw E.conflict("Email sudah terdaftar");
  const passwordHash = await bcrypt.hash(b.password as string, 10);
  const user = await db.user.create({
    data: {
      name: (b.name as string).trim(), email, passwordHash, role: role!,
      ...(role === "ORGANIZER" ? { organizer: { create: { name: isStr(b.organizerName) ? b.organizerName.trim() : (b.name as string).trim() } } } : {}),
    },
    include: { organizer: true },
  });
  return startSession(NextResponse.json({ data: userOut(user) }, { status: 201 }), user);
});
