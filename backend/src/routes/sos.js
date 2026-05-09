const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db");
const { sendEmail } = require("../../services/mailer");

const router = express.Router();

router.post("/trigger", async (req, res) => {
  const schema = z.object({
    user_id: z.number().int(),
    latitude: z.number(),
    longitude: z.number(),
    message: z.string().optional().default("I need help! Please check on me immediately."),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });
  const d = parsed.data;

  const alert = await prisma.sOSAlert.create({
    data: {
      userId: d.user_id,
      latitude: d.latitude,
      longitude: d.longitude,
      message: d.message,
      status: "active",
    },
  });

  const contacts = await prisma.trustedContact.findMany({
    where: { userId: d.user_id, notifyViaEmail: true },
    select: { email: true, name: true },
    orderBy: { id: "asc" },
  });

  const mapsUrl = `https://www.google.com/maps?q=${d.latitude},${d.longitude}`;

  const subject = "🚨 SOS Alert – Safeguard";
  const text =
    `SOS ALERT\n\n` +
    `User: ${d.user_id}\n` +
    `Message: ${d.message}\n` +
    `Location: ${mapsUrl}\n` +
    `Time: ${alert.triggeredAt.toISOString()}\n`;

  let emailSent = 0;
  for (const c of contacts) {
    const to = (c.email || "").trim();
    if (!to) continue;

    try {
      await sendEmail({ to, subject, text });
      emailSent++;
    } catch (err) {
      console.error("Email send failed for", to, err?.message || err);
    }
  }

  return res.json({
    alert_id: alert.id,
    status: "active",
    contacts_notified: contacts.length,
    email_sent: emailSent,
    sms_sent: 0,
    whatsapp_sent: 0,
    calls_made: 0,
    triggered_at: alert.triggeredAt.toISOString(),
  });
});

module.exports = router;

router.put("/resolve/:alert_id", async (req, res) => {
  const schema = z.object({ alert_id: z.coerce.number().int() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const id = parsed.data.alert_id;

  const alert = await prisma.sOSAlert.findUnique({ where: { id } });
  if (!alert) return res.json({ error: "Alert not found" });

  const updated = await prisma.sOSAlert.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  return res.json({
    status: "resolved",
    safe_notifications_sent: 0,
    resolved_at: updated.resolvedAt.toISOString(),
  });
});

module.exports = router;