const express = require("express");
const { z } = require("zod");
const { Pool } = require("pg");

const router = express.Router();

// Initialize Neon Cloud Database connection pool 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

/**
 * 1. GET /heatmap/nearby
 * Returns raw incident objects within a circle radius for markers on the Map view
 */
router.get("/nearby", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius: z.coerce.number().optional().default(2.0),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { lat, lng, radius } = parsed.data;

  try {
    const query = `
      SELECT 
        id, 
        "incidentType" AS type, 
        severity, 
        description, 
        "timeOfDay" AS time_of_day, 
        "reportedAt" AS reported_at,
        latitude,
        longitude
      FROM "Incident"
      WHERE ST_DWithin(
        location, 
        ST_MakePoint($1, $2)::geography, 
        $3 * 1000
      )
      ORDER BY "reportedAt" DESC;
    `;

    const result = await pool.query(query, [lng, lat, radius]);
    return res.json(result.rows);
  } catch (error) {
    console.error("Nearby incidents query failed:", error);
    return res.status(500).json({ detail: "Database spatial query failed." });
  }
});

/**
 * 2. GET /heatmap/grid
 * Aggregates point density distributions and maps weights
 */
router.get("/grid", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius_km: z.coerce.number().optional().default(5.0),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { lat, lng, radius_km } = parsed.data;

  try {
    const query = `
      SELECT severity, latitude, longitude
      FROM "Incident"
      WHERE ST_DWithin(
        location, 
        ST_MakePoint($1, $2)::geography, 
        $3 * 1000
      );
    `;

    const result = await pool.query(query, [lng, lat, radius_km]);

    const heatmap = result.rows.map((i) => ({
      lat: i.latitude,
      lng: i.longitude,
      intensity: Math.min(1, Math.max(0.2, (i.severity || 1) / 3)),
    }));

    return res.json({ heatmap, total_incidents: result.rows.length });
  } catch (error) {
    console.error("Grid lookup failed:", error);
    return res.status(500).json({ detail: "Failed to compile grid data mappings." });
  }
});

/**
 * 3. GET /heatmap/risk-score
 * Computes localized risk analysis scoring for banners
 */
router.get("/risk-score", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    hour: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  let { lat, lng, hour } = parsed.data;
  if (hour === undefined) hour = new Date().getHours();

  try {
    // Looks inside an immediate 500 meter walking bubble
    const query = `
      SELECT "incidentType" AS type, severity
      FROM "Incident"
      WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, 500);
    `;

    const result = await pool.query(query, [lng, lat]);
    const incidents = result.rows;

    const types = ["harassment", "stalking", "assault", "unsafe_area", "poor_lighting", "landslide_risk", "traffic_accident"];
    let dominant_type = "unsafe_area";
    let avg_severity = 1;

    if (incidents.length) {
      const counts = Object.fromEntries(types.map((t) => [t, 0]));
      let sevSum = 0;

      for (const i of incidents) {
        if (counts[i.type] !== undefined) counts[i.type] += 1;
        sevSum += i.severity || 1;
      }
      dominant_type = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      avg_severity = sevSum / incidents.length;
    }

    const base = (incidents.length / 10) + (avg_severity / 10);
    const hourFactor = (hour >= 20 || hour <= 5) ? 0.15 : 0.0;
    const ml_score = Math.min(1.0, base + hourFactor);

    const report_count = incidents.length;
    const risk_level =
      report_count >= 5 || ml_score > 0.7 ? "high" :
      report_count >= 3 || ml_score > 0.4 ? "medium" :
      report_count >= 1 || ml_score > 0.2 ? "low" : "safe";

    return res.json({
      ml_score: Math.round(ml_score * 100),
      risk_level,
      report_count,
      hour,
      dominant_type,
    });
  } catch (error) {
    console.error("Risk calculation error:", error);
    return res.status(500).json({ detail: "Failed to calculate risk scoring." });
  }
});

module.exports = router;