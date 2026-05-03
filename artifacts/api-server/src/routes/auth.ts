import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { notifyNewUser } from "../utils/discord";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";
const SALT_ROUNDS = 10;
const ADMIN_USERNAME = "zaix";
const ADMIN_PASSWORD = "darkdevil_300";

function signToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

router.post("/auth/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, email, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash })
    .returning();

  const token = signToken(user.id);

  notifyNewUser(user.username, user.email).catch(() => {});

  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      totalXp: user.totalXp ?? 0,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      totalXp: user.totalXp ?? 0,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/admin-login", async (req: Request, res: Response) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (username.toLowerCase() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }

  const token = jwt.sign(
    { admin: true, username: ADMIN_USERNAME, role: "admin" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    adminToken: token,
    admin: {
      username: ADMIN_USERNAME,
      role: "admin",
    },
  });
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  let payload: { userId: number };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    totalXp: user.totalXp ?? 0,
    createdAt: user.createdAt,
  });
});

export default router;
