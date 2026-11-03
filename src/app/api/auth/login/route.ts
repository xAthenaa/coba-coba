import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ApiError, E, readJson, route } from "@/server/http";
import { startSession } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { REQ, isStr } from "@/server/validate";

export const POST = route(async (req) => {
  const b = await readJson(req);
  const f: Record<string, string> = {};
  if (!isStr(b.email)) f.email = REQ;
  if (!isStr(b.password)) f.password = REQ;
  if (Object.keys(f).length) throw E.validation(f);
  const user = await db.user.findUnique({ where: { email: (b.email as string).trim().toLowerCase() }, include: { organizer: true } });
  if (!user || !(await bcrypt.compare(b.password as string, user.passwordHash)))
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi salah");
  return startSession(NextResponse.json({ data: userOut(user) }), user);
});
