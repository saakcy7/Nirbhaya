require("dotenv").config();
const express = require("express");
const cors = require("cors");

// 1. Core Route Module Imports
const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");
const heatmapRoutes = require("./routes/heatmap");
const contactsRoutes = require("./routes/contacts");
const sosRoutes = require("./routes/sos");

const app = express();

// 2. Global Middleware (Configured BEFORE routes so incoming requests are parsed properly)
app.use(cors({ 
  origin: "*", 
  credentials: false 
}));
app.use(express.json());

// 3. System Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "SafeGuard" 
  });
});

// 4. Mounting Domain Routers
app.use("/auth", authRoutes);
app.use("/incidents", incidentsRoutes);
app.use("/heatmap", heatmapRoutes); // Handles your PostGIS /grid and /risk-score routes
app.use("/contacts", contactsRoutes);
app.use("/sos", sosRoutes);

// 5. Single Network Initialization
const port = Number(process.env.PORT || 8000);

// Binding to '0.0.0.0' allows physical mobile devices (like your phone testing near KU) 
// to connect to your local computer server over Wi-Fi.
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 SafeGuard API running securely on: http://0.0.0.0:${port}`);
});