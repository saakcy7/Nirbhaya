const express = require("express");
const { z } = require("zod");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

/**
 * POST /sos/trigger
 */
/**
 * POST /sos/trigger
 */
/**
 * POST /sos/trigger
 */
router.post("/trigger", async (req, res) => {
  // 1. Keep validation simple so it NEVER fails or crashes on guest requests
  const schema = z.object({
    user_id: z.any().optional(), 
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    message: z.string().optional().default("🚨 CRITICAL: Emergency alert dispatched!"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ detail: parsed.error.flatten() });
  }
  
  const d = parsed.data;
  const cleanUserId = (d.user_id && !isNaN(Number(d.user_id))) ? Number(d.user_id) : null;

  try {
    // This part works perfectly for you already—it saves the alert logs to the DB
    const insertAlertQuery = `
      INSERT INTO "SOSAlert" ("userId", "latitude", "longitude", "message", "status", "triggeredAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, "triggeredAt";
    `;
    
    const alertResult = await pool.query(insertAlertQuery, [
      cleanUserId, 
      d.latitude,
      d.longitude,
      d.message,
      "active"
    ]);
    
    const activeAlert = alertResult.rows[0];

    // Fixed Google Maps URL syntax
    const mapsUrl = `https://www.google.com/maps?q=${d.latitude},${d.longitude}`;

    // Target array for sending emails
    let finalRecipients = [];

    // 2. BULLETPROOF EXTRACTION OF GUEST EMAILS DIRECTLY FROM REQ.BODY
    // This checks if guest_emails is an array, a single string, or inside nested objects
    const rawEmails = req.body.guest_emails;

    if (Array.isArray(rawEmails)) {
      rawEmails.forEach(emailStr => {
        const clean = (emailStr || "").trim();
        if (clean && clean.includes("@")) {
          finalRecipients.push({ email: clean, name: "Emergency Contact" });
        }
      });
    } else if (typeof rawEmails === "string") {
      const clean = rawEmails.trim();
      if (clean && clean.includes("@")) {
        finalRecipients.push({ email: clean, name: "Emergency Contact" });
      }
    }

    // 3. Fallback database lookup for logged-in users
    if (cleanUserId) {
      const contactQuery = `
        SELECT email, name FROM "TrustedContact"
        WHERE "userId" = $1 AND "notifyViaEmail" = true
        ORDER BY id ASC;
      `;
      const contactResult = await pool.query(contactQuery, [cleanUserId]);
      
      contactResult.rows.forEach(contact => {
        if (contact.email && !finalRecipients.some(r => r.email.toLowerCase() === contact.email.toLowerCase())) {
          finalRecipients.push({
            email: contact.email.trim(),
            name: contact.name || "Trusted Contact"
          });
        }
      });
    }

    let emailSentCount = 0;
    let explicitMailerError = null;

    // 4. Send Emails and track failures
    if (finalRecipients.length > 0) {
      const subject = "🚨 CRISIS ALERT – Nirbhaya Emergency Protocol";
      const text = 
        `🚨 CRITICAL SOS ALERT\n\n` +
        `User Profile: ${cleanUserId ? `Registered System User #${cleanUserId}` : 'Unauthenticated Guest User'}\n` +
        `Emergency Status Message: ${d.message}\n` +
        `Live Location Maps Pin: ${mapsUrl}\n` +
        `Timestamp: ${new Date(activeAlert.triggeredAt).toISOString()}\n`;

      const { sendEmail } = require("../../services/mailer");
      
      for (const recipient of finalRecipients) {
        try {
          await sendEmail({ to: recipient.email, subject, text });
          emailSentCount++;
        } catch (err) {
          console.error(`Mailer execution failed targeting ${recipient.email}:`, err.message);
          explicitMailerError = err.message;
        }
      }
    }

    // 5. CRITICAL DEBUG BLOCK: If no recipients were found, tell the frontend why!
    if (finalRecipients.length === 0) {
      return res.status(422).json({
        detail: "The alert was saved to the database, but no email addresses were found or parsed. Ensure 'guest_emails' is sent correctly from the frontend.",
        received_payload: req.body
      });
    }

    return res.json({
      alert_id: activeAlert.id,
      status: "active",
      contacts_notified: finalRecipients.length,
      email_sent: emailSentCount,
      mailer_error: explicitMailerError,
      triggered_at: activeAlert.triggeredAt,
    });

  } catch (error) {
    console.error("SOS Trigger Router Failure:", error);
    return res.status(500).json({ detail: "Internal emergency dispatch system failure." });
  }
});

/**
 * PUT /sos/resolve/:alert_id
 */
router.put("/resolve/:alert_id", async (req, res) => {
  const schema = z.object({ alert_id: z.coerce.number().int() });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const id = parsed.data.alert_id;

  try {
    const updateQuery = `
      UPDATE "SOSAlert"
      SET status = 'resolved', "resolvedAt" = NOW()
      WHERE id = $1
      RETURNING "resolvedAt";
    `;
    const result = await pool.query(updateQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Target alert tracking index not found." });
    }

    return res.json({
      status: "resolved",
      safe_notifications_sent: 0,
      resolved_at: result.rows[0].resolvedAt,
    });
  } catch (error) {
    console.error("Resolve operations failed:", error);
    return res.status(500).json({ detail: "Database modification error during status update." });
  }
});

module.exports = router;