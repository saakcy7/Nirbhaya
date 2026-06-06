const express = require("express");
const { z } = require("zod");
const { Pool } = require("pg");
const axios = require("axios");

const router = express.Router();

// Initialize Neon Cloud Database connection pool 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

/**
 * 1. GET /heatmap/nearby
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

/**
 * 4. GET /heatmap/safest-route
 * Evaluates OSRM alternative paths and orders them by localized corridor risk metrics
 */
router.get("/safest-route", async (req, res) => {
  const schema = z.object({
    start_lat: z.coerce.number(),
    start_lng: z.coerce.number(),
    end_lat: z.coerce.number(),
    end_lng: z.coerce.number(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { start_lat, start_lng, end_lat, end_lng } = parsed.data;

  try {
    // Call Open Source Routing Machine for coordinate geometries
    const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start_lng},${start_lat};${end_lng},${end_lat}?alternatives=true&geometries=geojson&overview=full`;
    const osrmResponse = await axios.get(osrmUrl);

    if (!osrmResponse.data.routes || osrmResponse.data.routes.length === 0) {
      return res.status(404).json({ detail: "No alternative walking paths found between locations." });
    }

    const alternatives = osrmResponse.data.routes;
    const processedRoutes = [];

    for (let index = 0; index < alternatives.length; index++) {
      const currentRoute = alternatives[index];
      const geometryJson = JSON.stringify(currentRoute.geometry);

      // Query database for incidents occurring inside a 75-meter buffer of this route coordinate line
      const analyticalQuery = `
        SELECT 
          COUNT(*)::int as incident_count,
          COALESCE(SUM(severity), 0)::int as total_severity
        FROM "Incident"
        WHERE ST_DWithin(
          location,
          ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography,
          75
        );
      `;

      const analysisResult = await pool.query(analyticalQuery, [geometryJson]);
      const { incident_count, total_severity } = analysisResult.rows[0];

      // Cost Calculation Weight Metrics
      const spatialRiskMetric = (incident_count * 2.5) + (total_severity * 1.5);

      processedRoutes.push({
        route_index: index,
        distance_meters: currentRoute.distance,
        duration_seconds: currentRoute.duration,
        geometry: currentRoute.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
        risk_score: spatialRiskMetric,
        incident_count
      });
    }

    // Sort by risk footprint ascending, then duration profile
    processedRoutes.sort((x, y) => {
      if (x.risk_score === y.risk_score) return x.duration_seconds - y.duration_seconds;
      return x.risk_score - y.risk_score;
    });

    return res.json({
      safest_route: processedRoutes[0],
      alternatives: processedRoutes.slice(1)
    });
  } catch (err) {
    console.error("Safest path calculation processing error:", err);
    return res.status(500).json({ detail: "Internal spatial routing algorithm failure." });
  }
});

module.exports = router;