import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import compression from "compression";
import riderRoutes from "./routes/rider.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startOrderReadyConsumer } from "./config/orderReady.consumer.js";
dotenv.config();
await connectRabbitMQ();
startOrderReadyConsumer();
const app = express();
app.use(express.json());
const corsOptions = process.env.FRONTEND_URL
    ? {
        origin: process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()),
        credentials: true,
    }
    : {};
app.use(cors(corsOptions));
app.use(compression());
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "rider" });
});
app.use("/api/rider", riderRoutes);
app.listen(process.env.PORT, () => {
    console.log(`Rider service is running on port ${process.env.PORT}`);
    connectDB();
});
