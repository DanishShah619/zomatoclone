import axios from "axios";
import getBuffer from "../config/datauri.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
const MAX_NEARBY_RADIUS_METERS = 20000;
const MAX_SEARCH_LENGTH = 64;
const MAX_NEARBY_RESULTS = 50;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        return res.status(400).json({
            message: "No Restaurant found",
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
            $limit: safeLimit,
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
