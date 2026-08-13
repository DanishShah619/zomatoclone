import axios from "axios";
import getBuffer from "../config/datauri.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import MenuItems from "../models/MenuItems.js";
const MAX_NEARBY_RADIUS_METERS = 20000;
const MAX_SEARCH_LENGTH = 64;
const MAX_NEARBY_RESULTS = 50;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const parseDiscountPercent = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 90)
        return null;
    return Math.round(parsed);
};
export const addRestraunt = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const existingRestaunrant = await Restaurant.findOne({
        ownerId: user._id,
    });
    if (existingRestaunrant) {
        return res.status(400).json({
            message: "You already have a restaurant",
        });
    }
    const { name, description, latitude, longitude, formattedAddress, phone } = req.body;
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    const numericPhone = Number(phone);
    if (!name ||
        !Number.isFinite(numericLatitude) ||
        !Number.isFinite(numericLongitude) ||
        !Number.isFinite(numericPhone)) {
        return res.status(400).json({
            message: "Please give all details",
        });
    }
    const file = req.file;
    if (!file) {
        return res.status(400).json({
            message: "Please give image",
        });
    }
    const fileBuffer = getBuffer(file);
    if (!fileBuffer?.content) {
        return res.status(500).json({
            message: "Failed to create file buffer",
        });
    }
    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    }, {
        headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
    });
    const restaurant = await Restaurant.create({
        name,
        description,
        phone: numericPhone,
        image: uploadResult.url,
        ownerId: user._id,
        autoLocation: {
            type: "Point",
            coordinates: [numericLongitude, numericLatitude],
            formattedAddress,
        },
        isVerified: false,
    });
    return res.status(201).json({
        message: "Restaurant created successfully",
        restaurant,
    });
});
export const fetchMyRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Please Login",
        });
    }
    const restaurant = await Restaurant.findOne({ ownerId: req.user._id });
    if (!restaurant) {
        return res.json({
            restaurant: null,
            message: "No restaurant found",
        });
    }
    if (!req.user.restaurantId) {
        const token = jwt.sign({
            user: {
                _id: req.user._id,
                role: req.user.role,
                restaurantId: restaurant._id.toString(),
            },
        }, process.env.JWT_SEC, {
            expiresIn: "15d",
        });
        return res.json({ restaurant, token });
    }
    res.json({ restaurant });
});
export const updateStatusRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            message: "Please Login",
        });
    }
    const { status } = req.body;
    if (typeof status !== "boolean") {
        return res.status(400).json({
            message: "Status must be boolean",
        });
    }
    const restaurant = await Restaurant.findOneAndUpdate({
        ownerId: req.user._id,
    }, { isOpen: status }, { new: true });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    res.json({
        message: "Restaurant status Updated",
        restaurant,
    });
});
export const updateRestaurant = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            message: "Please Login",
        });
    }
    const { name, description } = req.body;
    if (name !== undefined && typeof name !== "string") {
        return res.status(400).json({
            message: "Name must be a string",
        });
    }
    if (description !== undefined && typeof description !== "string") {
        return res.status(400).json({
            message: "Description must be a string",
        });
    }
    const restaurant = await Restaurant.findOneAndUpdate({ ownerId: req.user._id }, { name: name, description: description }, { new: true });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    res.json({
        message: "Restaurant Updated",
        restaurant,
    });
});
export const updateRestaurantOffer = TryCatch(async (req, res) => {
    if (!req.user) {
        return res.status(403).json({
            message: "Please Login",
        });
    }
    const { isActive, discountPercent } = req.body;
    if (typeof isActive !== "boolean") {
        return res.status(400).json({
            message: "Offer status must be boolean",
        });
    }
    const safeDiscount = parseDiscountPercent(discountPercent);
    if (isActive && (!safeDiscount || safeDiscount <= 0)) {
        return res.status(400).json({
            message: "Discount must be between 1 and 90",
        });
    }
    const restaurant = await Restaurant.findOneAndUpdate({ ownerId: req.user._id }, {
        offer: {
            isActive,
            discountPercent: isActive ? safeDiscount : 0,
        },
    }, { new: true });
    if (!restaurant) {
        return res.status(404).json({
            message: "Restaurant not found",
        });
    }
    res.json({
        message: isActive ? "Restaurant offer enabled" : "Restaurant offer disabled",
        restaurant,
    });
});
export const getNearbyRestaurant = TryCatch(async (req, res) => {
    const { latitude, longitude, radius = 5000, search = "", limit = 25 } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({
            message: "Latitude and longitude are required",
        });
    }
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    const numericRadius = Number(radius);
    const numericLimit = Number(limit);
    if (!Number.isFinite(numericLatitude) ||
        !Number.isFinite(numericLongitude) ||
        !Number.isFinite(numericRadius) ||
        !Number.isFinite(numericLimit) ||
        numericRadius <= 0 ||
        numericLimit <= 0) {
        return res.status(400).json({
            message: "Valid latitude, longitude and radius are required",
        });
    }
    if (numericLatitude < -90 ||
        numericLatitude > 90 ||
        numericLongitude < -180 ||
        numericLongitude > 180) {
        return res.status(400).json({
            message: "Latitude or longitude is out of range",
        });
    }
    const query = {
        isVerified: true,
    };
    if (search && typeof search === "string") {
        const normalizedSearch = search.trim().slice(0, MAX_SEARCH_LENGTH);
        if (normalizedSearch) {
            query.name = { $regex: escapeRegex(normalizedSearch), $options: "i" };
        }
    }
    const safeRadius = Math.min(numericRadius, MAX_NEARBY_RADIUS_METERS);
    const safeLimit = Math.min(Math.trunc(numericLimit), MAX_NEARBY_RESULTS);
    const restaurants = await Restaurant.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [numericLongitude, numericLatitude],
                },
                distanceField: "distance",
                maxDistance: safeRadius,
                spherical: true,
                query,
            },
        },
        {
            $sort: {
                isOpen: -1,
                distance: 1,
            },
        },
        {
            $addFields: {
                distanceKm: {
                    $round: [{ $divide: ["$distance", 1000] }, 2],
                },
            },
        },
        {
            $limit: MAX_NEARBY_RESULTS,
        },
    ]);
    res.json({
        success: true,
        count: restaurants.length,
        restaurants,
    });
});
export const fetchSingleRestaurant = TryCatch(async (req, res) => {
    const { id } = req.params;
    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Valid restaurant id is required",
        });
    }
    const restaurant = await Restaurant.findById(id).lean();
    res.json(restaurant);
});
export const getBestDeals = TryCatch(async (req, res) => {
    const { latitude, longitude, radius = 5000, search = "", limit = 25 } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({
            message: "Latitude and longitude are required",
        });
    }
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    const numericRadius = Number(radius);
    const numericLimit = Number(limit);
    if (!Number.isFinite(numericLatitude) ||
        !Number.isFinite(numericLongitude) ||
        !Number.isFinite(numericRadius) ||
        !Number.isFinite(numericLimit) ||
        numericRadius <= 0 ||
        numericLimit <= 0) {
        return res.status(400).json({
            message: "Valid latitude, longitude and radius are required",
        });
    }
    let normalizedSearch = "";
    let searchRegex = null;
    if (search && typeof search === "string") {
        normalizedSearch = search.trim().slice(0, MAX_SEARCH_LENGTH);
        if (normalizedSearch) {
            searchRegex = new RegExp(escapeRegex(normalizedSearch), "i");
        }
    }
    const safeRadius = Math.min(numericRadius, MAX_NEARBY_RADIUS_METERS);
    const safeLimit = Math.min(Math.trunc(numericLimit), MAX_NEARBY_RESULTS);
    const nearbyRestaurants = await Restaurant.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [numericLongitude, numericLatitude],
                },
                distanceField: "distance",
                maxDistance: safeRadius,
                spherical: true,
                query: {
                    isVerified: true,
                },
            },
        },
        {
            $addFields: {
                distanceKm: {
                    $round: [{ $divide: ["$distance", 1000] }, 2],
                },
            },
        },
        {
            $limit: safeLimit,
        },
    ]);
    const nearbyIds = nearbyRestaurants.map((restaurant) => restaurant._id);
    const restaurantById = new Map(nearbyRestaurants.map((restaurant) => [restaurant._id.toString(), restaurant]));
    const itemOfferItems = await MenuItems.find({
        restaurantId: { $in: nearbyIds },
        isAvailable: true,
        "offer.isActive": true,
        "offer.discountPercent": { $gt: 0 },
    })
        .limit(MAX_NEARBY_RESULTS)
        .lean();
    const restaurantOffers = nearbyRestaurants
        .filter((restaurant) => restaurant.offer?.isActive && restaurant.offer?.discountPercent > 0)
        .filter((restaurant) => !searchRegex || searchRegex.test(restaurant.name))
        .slice(0, safeLimit);
    const itemOffers = itemOfferItems
        .map((item) => {
        const restaurant = restaurantById.get(item.restaurantId.toString());
        if (!restaurant)
            return null;
        return {
            ...item,
            restaurant,
        };
    })
        .filter((deal) => {
        if (!deal)
            return false;
        if (!searchRegex)
            return true;
        return searchRegex.test(deal.name) || searchRegex.test(deal.restaurant.name);
    })
        .slice(0, safeLimit);
    res.json({
        success: true,
        restaurantOffers,
        itemOffers,
    });
});
