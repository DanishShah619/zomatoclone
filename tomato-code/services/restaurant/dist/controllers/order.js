import axios from "axios";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { publishEvent } from "../config/order.publisher.js";
import mongoose from "mongoose";
const PAYMENT_METHODS = ["stripe"];
const isValidObjectId = (value) => typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
const isValidPaymentMethod = (value) => typeof value === "string" &&
    PAYMENT_METHODS.includes(value);
const parseLimit = (value, defaultLimit = 25, maxLimit = 50) => {
    const parsed = typeof value === "string" ? Number(value) : defaultLimit;
    if (!Number.isInteger(parsed) || parsed <= 0)
        return defaultLimit;
    return Math.min(parsed, maxLimit);
};
const getDiscountedUnitPrice = (item, restaurant) => {
    const itemOffer = item.offer;
    const restaurantOffer = restaurant.offer;
    const discountPercent = itemOffer?.isActive && itemOffer.discountPercent > 0
        ? itemOffer.discountPercent
        : restaurantOffer?.isActive && restaurantOffer.discountPercent > 0
            ? restaurantOffer.discountPercent
            : 0;
    const discountAmount = Math.round((item.price * discountPercent) / 100);
    return {
        originalPrice: item.price,
        price: Math.max(item.price - discountAmount, 0),
        discountPercent,
        discountAmount,
    };
};
export const createOrder = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { paymentMethod, addressId } = req.body;
    if (!isValidObjectId(addressId)) {
        return res.status(400).json({
            message: "Valid address is required",
        });
    }
    if (!isValidPaymentMethod(paymentMethod)) {
        return res.status(400).json({
            message: "Valid payment method is required",
        });
    }
    const address = await Address.findOne({
        _id: addressId,
        userId: user._id,
    });
    if (!address) {
        return res.status(404).json({
            message: "Address Not found",
        });
    }
    const getDistanceKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return +(R * c).toFixed(2);
    };
    const cartItems = await Cart.find({ userId: user._id })
        .populate("itemId")
        .populate("restaurantId");
    if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
    }
    const firstCartItem = cartItems[0];
    if (!firstCartItem || !firstCartItem.restaurantId) {
        return res.status(400).json({
            message: "Invailid Cart Data",
        });
    }
    const restaurantId = firstCartItem.restaurantId._id;
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        return res.status(404).json({
            message: "No restaurant with this id",
        });
    }
    if (!restaurant.isOpen) {
        return res.status(404).json({
            message: "Sorry this restaurant is closed for now",
        });
    }
    const distance = getDistanceKm(address.location.coordinates[1], address.location.coordinates[0], restaurant.autoLocation.coordinates[1], restaurant.autoLocation.coordinates[0]);
    let originalSubtotal = 0;
    let subtotal = 0;
    let discountAmount = 0;
    const orderItems = cartItems.map((cart) => {
        const item = cart.itemId;
        if (!item) {
            throw new Error("Invalid cart item");
        }
        const pricedItem = getDiscountedUnitPrice(item, restaurant);
        const itemTotal = pricedItem.price * cart.quauntity;
        originalSubtotal += pricedItem.originalPrice * cart.quauntity;
        subtotal += itemTotal;
        discountAmount += pricedItem.discountAmount * cart.quauntity;
        return {
            itemId: item._id.toString(),
            name: item.name,
            price: pricedItem.price,
            originalPrice: pricedItem.originalPrice,
            discountPercent: pricedItem.discountPercent,
            discountAmount: pricedItem.discountAmount,
            quauntity: cart.quauntity,
        };
    });
    const deliveryFee = subtotal < 250 ? 49 : 0;
    const platfromFee = 7;
    const totalAmount = subtotal + deliveryFee + platfromFee;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const [longitude, latitude] = address.location.coordinates;
    const riderAmount = Math.ceil(distance) * 17;
    const order = await Order.create({
        userId: user._id.toString(),
        restaurantId: restaurantId.toString(),
        restaurantName: restaurant.name,
        riderId: null,
        distance,
        riderAmount,
        items: orderItems,
        originalSubtotal,
        subtotal,
        discountAmount,
        deliveryFee,
        platfromFee,
        totalAmount,
        addressId: address._id.toString(),
        deliveryAddress: {
            fromattedAddress: address.formattedAddress,
            mobile: address.mobile,
            latitude,
            longitude,
        },
        paymentMethod,
        paymentStatus: "pending",
        status: "placed",
        expiresAt,
    });
    await Cart.deleteMany({ userId: user._id });
    res.json({
        message: "Order created successfully",
        orderId: order._id.toString(),
        amount: totalAmount,
    });
});
export const fetchOrderForPayment = TryCatch(async (req, res) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            message: "Forbidden",
        });
    }
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Valid order id is required",
        });
    }
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
        return res.status(404).json({
            message: "Order not found",
        });
    }
    const userId = req.headers["x-user-id"];
    if (typeof userId === "string") {
        if (order.userId !== userId) {
            return res.status(403).json({
                message: "You are not allowed to pay for this order",
            });
        }
        if (order.paymentStatus !== "pending") {
            return res.status(400).json({
                message: "Order already paid",
            });
        }
    }
    res.json({
        orderId: order._id,
        amount: order.totalAmount,
        currency: "INR",
    });
});
export const fetchRestaurantOrders = TryCatch(async (req, res) => {
    const user = req.user;
    const { restaurantId } = req.params;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({
            message: "Valid restaurant id is required",
        });
    }
    const restaurant = await Restaurant.findOne({
        _id: restaurantId,
        ownerId: user._id.toString(),
    }).lean();
    if (!restaurant) {
        return res.status(403).json({
            message: "You are not allowed to view these orders",
        });
    }
    const limit = parseLimit(req.query.limit);
    const orders = await Order.find({
        restaurantId,
        paymentStatus: "paid",
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    return res.json({
        success: true,
        count: orders.length,
        orders,
    });
});
const ALLOWED_STATUSES = ["accepted", "preparing", "ready_for_rider"];
export const updateOrderStatus = TryCatch(async (req, res) => {
    const user = req.user;
    const { orderId } = req.params;
    const { status } = req.body;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
            message: "Invalid order status",
        });
    }
    if (!isValidObjectId(orderId)) {
        return res.status(400).json({
            message: "Valid order id is required",
        });
    }
    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({
            message: "Order not found",
        });
    }
    if (order.paymentStatus !== "paid") {
        return res.status(404).json({
            message: "Order not completed",
        });
    }
    const restaurant = await Restaurant.findById(order.restaurantId).lean();
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    if (restaurant.ownerId !== user._id.toString()) {
        return res.status(401).json({
            message: "You are not allowed to update this order",
        });
    }
    order.status = status;
    await order.save();
    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
        event: "order:update",
        room: `user:${order.userId}`,
        payload: {
            orderId: order._id,
            status: order.status,
        },
    }, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });
    // now assign riders
    if (status === "ready_for_rider") {
        console.log("Publishing Order ready for rider event for order", order._id);
        await publishEvent("ORDER_READY_FOR_RIDER", {
            orderId: order._id.toString(),
            restaurantId: restaurant._id.toString(),
            location: restaurant.autoLocation,
        });
        console.log("Event Published successfully");
    }
    res.json({
        message: "order status updated successfully",
        order,
    });
});
export const getMyOrders = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const orders = await Order.find({
        userId: req.user._id.toString(),
        paymentStatus: "paid",
    })
        .sort({ createdAt: -1 })
        .limit(parseLimit(req.query.limit))
        .lean();
    res.json({ orders });
});
export const fetchSingleOrder = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Valid order id is required",
        });
    }
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
        return res.status(404).json({
            message: "Order not found",
        });
    }
    if (order.userId !== req.user._id.toString()) {
        return res.status(401).json({
            message: "You are not allowed to view this order",
        });
    }
    res.json(order);
});
export const assignRiderToOrder = TryCatch(async (req, res) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            message: "Forbidden",
        });
    }
    const { orderId, riderId, riderName, riderPhone } = req.body;
    if (!isValidObjectId(orderId) ||
        !isValidObjectId(riderId) ||
        typeof riderName !== "string" ||
        typeof riderPhone !== "string") {
        return res.status(400).json({
            message: "Valid order and rider details are required",
        });
    }
    const orderAvailable = await Order.findOne({
        riderId,
        status: { $nin: ["delivered", "cancelled"] },
    });
    if (orderAvailable) {
        return res.status(400).json({
            message: "You already have an order",
        });
    }
    const orderUpdated = await Order.findOneAndUpdate({
        _id: orderId,
        riderId: null,
        paymentStatus: "paid",
        status: "ready_for_rider",
    }, {
        riderId,
        riderName,
        riderPhone,
        status: "rider_assigned",
    }, { new: true });
    if (!orderUpdated) {
        return res.status(409).json({
            message: "Order is not available for rider assignment",
        });
    }
    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
        event: "order:rider_assigned",
        room: `user:${orderUpdated.userId}`,
        payload: orderUpdated.toObject(),
    }, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });
    await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
        event: "order:rider_assigned",
        room: `restaurant:${orderUpdated.restaurantId}`,
        payload: orderUpdated.toObject(),
    }, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });
    res.json({
        message: "Rider Assigned Successfully",
        success: true,
        order: orderUpdated,
    });
});
export const getCurrentOrderForRider = TryCatch(async (req, res) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            message: "Forbidden",
        });
    }
    const { riderId } = req.query;
    if (typeof riderId !== "string" || !riderId) {
        return res.status(400).json({
            message: "Rider id is required",
        });
    }
    const order = await Order.findOne({
        riderId,
        status: { $nin: ["delivered", "cancelled"] },
    }).populate("restaurantId");
    if (!order) {
        return res.status(404).json({
            message: "Order not found",
        });
    }
    res.json(order);
});
export const updateOrderStatusRider = TryCatch(async (req, res) => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        return res.status(403).json({
            message: "Forbidden",
        });
    }
    const riderId = req.headers["x-rider-id"];
    const { orderId } = req.body;
    if (!isValidObjectId(orderId) || !isValidObjectId(riderId)) {
        return res.status(400).json({
            message: "Valid order and rider details are required",
        });
    }
    const order = await Order.findOne({
        _id: orderId,
        riderId,
        paymentStatus: "paid",
    });
    if (!order) {
        return res.status(404).json({
            message: "Order not found",
        });
    }
    if (order.status === "rider_assigned") {
        order.status = "picked_up";
        await order.save();
        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event: "order:rider_assigned",
            room: `restaurant:${order.restaurantId}`,
            payload: order.toObject(),
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event: "order:rider_assigned",
            room: `user:${order.userId}`,
            payload: order.toObject(),
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
        return res.json({
            message: "Order updated Successfully",
        });
    }
    if (order.status === "picked_up") {
        order.status = "delivered";
        await order.save();
        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event: "order:rider_assigned",
            room: `restaurant:${order.restaurantId}`,
            payload: order.toObject(),
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
        await axios.post(`${process.env.REALTIME_SERVICE}/api/v1/internal/emit`, {
            event: "order:rider_assigned",
            room: `user:${order.userId}`,
            payload: order.toObject(),
        }, {
            headers: {
                "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
            },
        });
        return res.json({
            message: "Order updated Successfully",
        });
    }
    return res.status(400).json({
        message: "Order cannot be updated from its current status",
    });
});
