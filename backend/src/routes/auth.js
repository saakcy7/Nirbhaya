const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const { prisma } = require("../db");
const { signToken } = require("../auth");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  phone: z.string().trim().min(6),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) return res.status(400).json({ detail: "Email or phone already registered" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash },
    select: { id: true, name: true, email: true, phone: true },
  });

  const token = signToken({ sub: String(user.id), name: user.name });
  return res.json({ access_token: token, token_type: "bearer", user });
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const userRow = await prisma.user.findUnique({ where: { email } });
  if (!userRow) return res.status(401).json({ detail: "Invalid credentials" });

  const ok = await bcrypt.compare(password, userRow.passwordHash);
  if (!ok) return res.status(401).json({ detail: "Invalid credentials" });

  const user = { id: userRow.id, name: userRow.name, email: userRow.email, phone: userRow.phone };
  const token = signToken({ sub: String(user.id), name: user.name });

  return res.json({ access_token: token, token_type: "bearer", user });
});

module.exports = router;