import express from "express";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import compression from "compression";

dotenv.config();

const app = express();
const corsOptions = process.env.FRONTEND_URL
  ? {
      origin: process.env.FRONTEND_URL.split(",").map((origin) =>
        origin.trim()
      ),
      credentials: true,
    }
  : {};

app.use(cors(corsOptions));
app.use(compression());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "admin" });
});

app.use("/api/v1", adminRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Admin Service is running on port ${process.env.PORT}`);
});
