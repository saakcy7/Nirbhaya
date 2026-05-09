const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db");

const router = express.Router();

router.post("/add", async (req, res) => {
  const schema = z.object({
    user_id: z.number().int(),
    name: z.string().min(1),

    // phone optional for now
    phone: z.string().min(3).optional().nullable(),

    // email required now
    email: z.string().email(),

    notify_via_email: z.boolean().optional().default(true),
    notify_via_sms: z.boolean().optional().default(false),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const d = parsed.data;

  const contact = await prisma.trustedContact.create({
  data: {
    name: d.name,
    email: d.email,
    phone: d.phone??null,
    notifyViaSms: d.notify_via_sms,
    notifyViaEmail: d.notify_via_email,

    // IMPORTANT: connect required relation
    user: { connect: { id: d.user_id } },
  },
});

  return res.json({ id: contact.id, name: contact.name, status: "added" });
});

router.get("/:user_id", async (req, res) => {
  const schema = z.object({ user_id: z.coerce.number().int() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const userId = parsed.data.user_id;

  const contacts = await prisma.trustedContact.findMany({
    where: { userId },
    orderBy: { id: "asc" },
  });

return res.json(contacts.map((c) => ({ id: c.id, name: c.name, email: c.email })));
});

router.delete("/:contact_id", async (req, res) => {
  const schema = z.object({ contact_id: z.coerce.number().int() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const id = parsed.data.email;

  try {
    await prisma.trustedContact.delete({ where: { id } });
  } catch {
    // ignore if not found, match your python behavior
  }
  return res.json({ status: "deleted" });
});

module.exports = router;