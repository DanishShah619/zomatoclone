import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import restaurantRoutes from "./routes/restaraunt.js";
import itemRoutes from "./routes/menuitem.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/address.js";
import orderRoutes from "./routes/order.js";
import cors from "cors";
import compression from "compression";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import { startPaymentConsumer } from "./config/payment.consumer.js";
dotenv.config();
await connectRabbitMQ();
startPaymentConsumer();
const app = express();
const corsOptions = process.env.FRONTEND_URL
    ? {
        origin: process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()),
        credentials: true,
    }
    : {};
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
const PORT = process.env.PORT || 5001;
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "restaurant" });
});
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/order", orderRoutes);
app.listen(PORT, () => {
    console.log(`Restaurant service is running on port ${PORT}`);
    connectDB();
});
