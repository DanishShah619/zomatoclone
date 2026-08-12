import axios from "axios";
import { getChannel } from "./rabbitmq.js";
import { Rider } from "../model/Rider.js";
export const startOrderReadyConsumer = async () => {
    const channel = getChannel();
    console.log("Starting to consume from:", process.env.ORDER_READY_QUEUE);
    channel.consume(process.env.ORDER_READY_QUEUE, async (msg) => {
        if (!msg)
            return;
        try {
            const event = JSON.parse(msg.content.toString());
            if (event.type !== "ORDER_READY_FOR_RIDER") {
                channel.ack(msg);
                return;
            }
            const { orderId, restaurantId, location } = event.data ?? {};
            if (!orderId || !restaurantId || !location) {
                console.log("Skipping invalid order-ready event");
                channel.ack(msg);
                return;
            }
            const riders = await Rider.find({
                isAvailble: true,
                isVerified: true,
                location: {
                    $near: {
                        $geometry: location,
                        $maxDistance: 500,
                    },
                },
            })
                .select("userId")
                .limit(20)
                .lean();
            if (riders.length === 0) {
                channel.ack(msg);
                return;
            }
            for (const rider of riders) {
                try {
                    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
                        event: "order:available",
                        room: `user:${rider.userId}`,
                        payload: { orderId, restaurantId },
                    }, {
                        headers: {
                            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                        },
                    });
                }
                catch (error) {
                    console.log(`Failed to notify rider ${rider.userId}`);
                }
            }
            channel.ack(msg);
        }
        catch (error) {
            console.log("Order-ready consumer error:", error);
            channel.nack(msg, false, false);
        }
    });
};
