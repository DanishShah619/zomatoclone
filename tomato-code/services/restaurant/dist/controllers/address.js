import mongoose from "mongoose";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
export const addAddress = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { mobile, formattedAddress, latitude, longitude } = req.body;
    const numericMobile = Number(mobile);
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);
    if (!Number.isFinite(numericMobile) ||
        !formattedAddress ||
        !Number.isFinite(numericLatitude) ||
        !Number.isFinite(numericLongitude)) {
        return res.status(400).json({
            message: "Please give all fields",
        });
    }
    const newAddress = await Address.create({
        userId: user._id.toString(),
        mobile: numericMobile,
        formattedAddress,
        location: {
            type: "Point",
            coordinates: [numericLongitude, numericLatitude],
        },
    });
    res.json({
        message: "Address Added successfully",
        address: newAddress,
    });
});
export const deleteAddress = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const { id } = req.params;
    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Valid address id is required",
        });
    }
    const address = await Address.findOne({
        _id: id,
        userId: user._id.toString(),
    });
    if (!address) {
        return res.status(404).json({
            message: "Address not found",
        });
    }
    await address.deleteOne();
    res.json({
        message: "Address deleted Successfully",
    });
});
export const getMyAddresses = TryCatch(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    const addresses = await Address.find({
        userId: user._id.toString(),
    })
        .sort({ createdAt: -1 })
        .lean();
    res.json(addresses);
});
