const express = require("express");
const { z } = require("zod");
const { prisma } = require("../db");
const { bbox } = require("../utils/geo");

const router = express.Router();

router.post("/report", async (req, res) => {
  const schema = z.object({
    reporter_id: z.number().int().optional().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    incident_type: z.string(),
    severity: z.number().int().optional().default(1),
    description: z.string().optional().nullable(),
    area_name: z.string().optional().nullable(),
    time_of_day: z.number().int().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: parsed.error.flatten() });

  const d = parsed.data;

  const incident = await prisma.incident.create({
    data: {
      reporterId: d.reporter_id ?? null,
      latitude: d.latitude,
      longitude: d.longitude,
      incidentType: d.incident_type,
      severity: d.severity,
      description: d.description ?? null,
      areaName: d.area_name ?? null,
      timeOfDay: d.time_of_day ?? null,
    },
  });

  return res.json({ id: incident.id, status: "reported", message: "Thank you for keeping the community safe." });
});

router.get("/nearby", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius_km: z.coerce.number().optional().default(2.0),
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
    orderBy: { reportedAt: "desc" },
    take: 100,
  });

  return res.json(
    incidents.map((i) => ({
      id: i.id,
      latitude: i.latitude,
      longitude: i.longitude,
      type: i.incidentType,
      severity: i.severity,
      time_of_day: i.timeOfDay,
      description: i.description,
      reported_at: i.reportedAt.toISOString(),
    }))
  );
});

router.get("/location-history", async (req, res) => {
  const schema = z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    radius_km: z.coerce.number().optional().default(1.5),
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
    orderBy: { reportedAt: "desc" },
  });

  if (!incidents.length) {
    return res.json({ total: 0, incidents: [], risk_level: "safe", dominant_type: null, community_verdict: "No reports for this area" });
  }

  const type_counts = {};
  let severity_sum = 0;
  for (const inc of incidents) {
    type_counts[inc.incidentType] = (type_counts[inc.incidentType] || 0) + 1;
    severity_sum += inc.severity;
  }

  const total = incidents.length;
  const dominant = Object.entries(type_counts).sort((a, b) => b[1] - a[1])[0][0];
  const avg_severity = severity_sum / total;

  let risk_level = "safe";
  if (total >= 5 || avg_severity >= 2.5) risk_level = "high";
  else if (total >= 3 || avg_severity >= 1.8) risk_level = "medium";
  else risk_level = "low";

  const verdicts = {
    high: `🔴 Danger zone — ${total} reports. Avoid this area especially at night.`,
    medium: `🟡 Use caution — ${total} reports of ${dominant.replaceAll("_", " ")} in this area.`,
    low: `🟢 Mostly safe — ${total} report(s). Stay alert.`,
    safe: `✅ No reports for this area.`,
  };

  return res.json({
    total,
    risk_level,
    dominant_type: dominant,
    avg_severity: Math.round(avg_severity * 10) / 10,
    type_breakdown: type_counts,
    community_verdict: verdicts[risk_level],
    incidents: incidents.slice(0, 10).map((i) => ({
      id: i.id,
      type: i.incidentType,
      severity: i.severity,
      description: i.description,
      time_of_day: i.timeOfDay,
      reported_at: i.reportedAt.toISOString(),
    })),
  });
});

module.exports = router;