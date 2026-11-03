import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { route } from "@/server/http";
import { clearCookies, currentToken, sha256 } from "@/server/auth";

export const POST = route(async () => {
  const t = await currentToken();
  if (t) await db.session.deleteMany({ where: { tokenHash: sha256(t) } });
  return clearCookies(new NextResponse(null, { status: 204 }));
});
