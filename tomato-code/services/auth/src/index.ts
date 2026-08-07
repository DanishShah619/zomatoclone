import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoute from "./routes/auth.js";
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

app.use(express.json());

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Auth service is running on port ${PORT}`);
  connectDB();
});
