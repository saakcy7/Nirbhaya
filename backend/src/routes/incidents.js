const express = require("express");
const { z } = require("zod");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

/**
 * POST /incidents/report
 */
router.post("/report", async (req, res) => {
  // Matches the exact keys sent by incidentsAPI.report in api.ts
  const schema = z.object({
    reporter_id: z.number().nullable().optional(),
    latitude: z.number(),
    longitude: z.number(),
    incident_type: z.string(), // Exact match for frontend key
    severity: z.coerce.number().min(1).max(5).optional().default(2),
    description: z.string().nullable().optional(),
    area_name: z.string().nullable().optional(),
    time_of_day: z.coerce.number().optional().default(new Date().getHours()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    // If Zod validation fails, it gives a clear 400 Bad Request instead of a generic 404
    return res.status(400).json({ detail: parsed.error.flatten() });
  }

  const {
    reporter_id,
    latitude,
    longitude,
    incident_type,
    severity,
    description,
    area_name,
    time_of_day
  } = parsed.data;

  try {
    // Maps the incoming frontend keys to your database column names ("incidentType", "reporterId")
    const query = `
      INSERT INTO "Incident" (
        "reporterId", 
        latitude, 
        longitude, 
        "incidentType", 
        severity, 
        description, 
        "areaName", 
        "timeOfDay"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, "incidentType", latitude, longitude;
    `;

    const result = await pool.query(query, [
      reporter_id || null,
      latitude,
      longitude,
      incident_type,
      severity,
      description || null,
      area_name || null,
      time_of_day
    ]);

    return res.status(201).json({
      message: "Success",
      incident: result.rows[0]
    });
  } catch (error) {
    console.error("Database insert crash:", error);
    return res.status(500).json({ detail: "Failed to insert record into database." });
  }
});

module.exports = router;