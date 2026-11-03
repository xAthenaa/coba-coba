import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export const E = {
  unauth: () => new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu"),
  forbidden: (m = "Akses ditolak") => new ApiError(403, "FORBIDDEN", m),
  notFound: (m = "Data tidak ditemukan") => new ApiError(404, "NOT_FOUND", m),
  validation: (fields: Record<string, string>) => new ApiError(400, "VALIDATION", "Data tidak valid", fields),
  conflict: (m: string) => new ApiError(409, "CONFLICT", m),
  bad: (code: string, m: string) => new ApiError(400, code, m),
};

export const ok = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
export const noContent = () => new NextResponse(null, { status: 204 });

type Ctx<P> = { params: Promise<P> };
export function route<P = Record<string, string>>(fn: (req: Request, params: P) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      return await fn(req, (await ctx?.params) as P);
    } catch (e) {
      if (e instanceof ApiError)
        return NextResponse.json({ error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: { code: "INTERNAL", message: "Terjadi kesalahan server" } }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = JSON.parse(await req.text()); } catch { throw E.bad("BAD_JSON", "Body bukan JSON yang valid"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw E.bad("BAD_JSON", "Body harus berupa objek JSON");
  return body as Record<string, unknown>;
}
