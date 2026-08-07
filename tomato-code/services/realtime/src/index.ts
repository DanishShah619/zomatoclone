import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import http from "http";
import { initSocket } from "./socket.js";
import internalRoute from "./routes/internal.js";

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

app.use("/api/v1/internal", internalRoute);

const server = http.createServer(app);

initSocket(server);

server.listen(process.env.PORT, () => {
  console.log(`Realtime service is running port ${process.env.PORT}`);
});
