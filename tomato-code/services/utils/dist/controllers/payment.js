import axios from "axios";
import Stripe from "stripe";
import { publishPaymentSuccess } from "../config/payment.producer.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_CURRENCY = "inr";
const getFrontendUrl = () => {
    const frontendUrl = process.env.FRONTEND_URL?.split(",")[0]?.trim();
    if (!frontendUrl) {
        throw new Error("FRONTEND_URL is not configured");
    }
    return frontendUrl.replace(/\/$/, "");
};
const isValidObjectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const getAmountInSmallestUnit = (amount) => Math.round(amount * 100);
const getStripePaymentId = (session) => {
    const paymentIntent = session.payment_intent;
    if (typeof paymentIntent === "string") {
        return paymentIntent;
    }
    return session.id;
};
const fetchOrderForPayment = async (orderId, userId) => {
    const headers = {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY ?? "",
    };
    if (userId) {
        headers["x-user-id"] = userId;
    }
    const { data } = await axios.get(`${process.env.RESTAURANT_SERVICE}/api/order/payment/${orderId}`, { headers });
    return data;
};
export const createStripeCheckoutSession = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { orderId } = req.body;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({
                message: "Valid order id is required",
            });
        }
        const order = await fetchOrderForPayment(orderId, userId);
        const amount = getAmountInSmallestUnit(order.amount);
        const frontendUrl = getFrontendUrl();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            client_reference_id: orderId,
            line_items: [
                {
                    price_data: {
                        currency: STRIPE_CURRENCY,
                        product_data: {
                            name: "Tomato food order",
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                orderId,
                userId,
            },
            success_url: `${frontendUrl}/ordersuccess?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/checkout`,
        });
        res.json({
            url: session.url,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Stripe checkout session creation failed",
        });
    }
};
export const stripeWebhook = async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];
    if (!endpointSecret) {
        return res.status(500).json({
            message: "Stripe webhook secret is not configured",
        });
    }
    if (typeof signature !== "string") {
        return res.status(400).json({
            message: "Stripe signature is required",
        });
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    }
    catch (error) {
        return res.status(400).json({
            message: "Invalid Stripe webhook signature",
        });
    }
    if (event.type !== "checkout.session.completed" &&
        event.type !== "checkout.session.async_payment_succeeded") {
        return res.json({ received: true });
    }
    try {
        const eventSession = event.data.object;
        const session = await stripe.checkout.sessions.retrieve(eventSession.id);
        if (session.payment_status !== "paid") {
            return res.json({ received: true });
        }
        if (session.mode !== "payment" || typeof session.amount_total !== "number") {
            return res.status(400).json({
                message: "Stripe session is not a completed payment session",
            });
        }
        const orderId = session.metadata?.orderId;
        if (!isValidObjectId(orderId) || session.client_reference_id !== orderId) {
            return res.status(400).json({
                message: "Stripe session is missing a valid order id",
            });
        }
        const order = await fetchOrderForPayment(orderId);
        const expectedAmount = getAmountInSmallestUnit(order.amount);
        if (session.amount_total !== expectedAmount ||
            session.currency !== STRIPE_CURRENCY ||
            order.currency.toLowerCase() !== STRIPE_CURRENCY) {
            return res.status(400).json({
                message: "Stripe session amount or currency mismatch",
            });
        }
        await publishPaymentSuccess({
            orderId,
            paymentId: getStripePaymentId(session),
            provider: "stripe",
        });
        return res.json({ received: true });
    }
    catch (error) {
        return res.status(500).json({
            message: "Stripe webhook processing failed",
        });
    }
};
