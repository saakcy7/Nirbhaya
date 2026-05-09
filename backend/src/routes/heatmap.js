const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db");
const { bbox } = require("../utils/geo");

const router = express.Router();

router.get("/grid", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius_km: z.coerce.number().optional().default(5.0),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const { lat, lng, radius_km } = parsed.data;
  const { latMin, latMax, lngMin, lngMax } = bbox(lat, lng, radius_km);

  const incidents = await prisma.incident.findMany({
    where: {
      latitude: { gte: latMin, lte: latMax },
      longitude: { gte: lngMin, lte: lngMax },
    },
  });

  const heatmap = incidents.map((i) => ({
    lat: i.latitude,
    lng: i.longitude,
    intensity: Math.min(1, Math.max(0.2, (i.severity || 1) / 3)),
  }));

  return res.json({ heatmap, total_incidents: incidents.length });
});

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

  const { latMin, latMax, lngMin, lngMax } = bbox(lat, lng, 0.5);

  const incidents = await prisma.incident.findMany({
    where: {
      latitude: { gte: latMin, lte: latMax },
      longitude: { gte: lngMin, lte: lngMax },
    },
  });

  const types = ["harassment", "stalking", "assault", "unsafe_area", "poor_lighting"];
  let dominant_type = "unsafe_area";
  let avg_severity = 1;

  if (incidents.length) {
    const counts = Object.fromEntries(types.map((t) => [t, 0]));
    let sevSum = 0;
    for (const i of incidents) {
      if (counts[i.incidentType] != null) counts[i.incidentType] += 1;
      sevSum += i.severity || 1;
    }
    dominant_type = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    avg_severity = sevSum / incidents.length;
  }

  // Placeholder deterministic "ML score" so app works.
  const base = Math.min(1, incidents.length / 10 + avg_severity / 10);
  const hourFactor = hour >= 20 || hour <= 5 ? 0.15 : 0.0;
  const ml_score = Math.min(1, base + hourFactor);

  const report_count = incidents.length;
  const risk_level =
    report_count >= 5 || ml_score > 0.7 ? "high" :
    report_count >= 3 || ml_score > 0.4 ? "medium" :
    report_count >= 1 || ml_score > 0.2 ? "low" : "safe";

  return res.json({
    ml_score: Math.round(ml_score * 1000) / 10, // percent, 1 decimal
    risk_level,
    report_count,
    hour,
    dominant_type,
  });
});

module.exports = router;