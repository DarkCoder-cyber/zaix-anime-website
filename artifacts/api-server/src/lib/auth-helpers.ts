import jwt from "jsonwebtoken";
import type { Request } from "express";

const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";

export function extractUserId(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}
