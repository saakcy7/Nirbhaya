require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const incidentsRoutes = require("./routes/incidents");
const heatmapRoutes = require("./routes/heatmap");
const contactsRoutes = require("./routes/contacts");
const sosRoutes = require("./routes/sos");

const app = express();
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "SafeGuard" }));
app.listen(8000, '0.0.0.0', () => console.log('API listening on 8000'));

app.use("/auth", authRoutes);
app.use("/incidents", incidentsRoutes);
app.use("/heatmap", heatmapRoutes);
app.use("/contacts", contactsRoutes);
app.use("/sos", sosRoutes);

const port = Number(process.env.PORT || 8000);
app.listen(port, () => console.log(`API running: http://localhost:${port}`));