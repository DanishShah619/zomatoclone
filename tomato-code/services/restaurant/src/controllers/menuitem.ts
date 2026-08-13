import axios from "axios";
import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import mongoose from "mongoose";

const parseDiscountPercent = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 90) return null;
  return Math.round(parsed);
};

const getValidCuisine = (value: unknown, cuisines: string[]) => {
  if (typeof value !== "string") return null;

  const cuisine = value.trim();
  return cuisines.includes(cuisine) ? cuisine : null;
};

const getFallbackCuisine = (cuisines?: string[]) =>
  cuisines && cuisines.length > 0 ? cuisines[0] : "North Indian";

export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please login",
    });
  }

  const restaurant = await Restaurant.findOne({ ownerId: req.user._id });

  if (!restaurant) {
    return res.status(404).json({
      message: "NO Restaurant found",
    });
  }

  const { name, description, price, cuisine } = req.body;

  const numericPrice = Number(price);
  const safeCuisine = getValidCuisine(cuisine, restaurant.cuisines || []);

  if (!name || !Number.isFinite(numericPrice) || numericPrice <= 0 || !safeCuisine) {
    return res.status(400).json({
      message: "Name, valid price and cuisine are required",
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

  const { data: uploadResult } = await axios.post(
    `${process.env.UTILS_SERVICE}/api/upload`,
    {
      buffer: fileBuffer.content,
    },
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
      },
    }
  );

  const item = await MenuItems.create({
    name,
    description,
    cuisine: safeCuisine,
    price: numericPrice,
    restaurantId: restaurant._id,
    image: uploadResult.url,
  });

  res.json({
    message: "Item Added Successfully",
    item,
  });
});

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    return res.status(400).json({
      message: "Id is required",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Valid restaurant id is required",
    });
  }
  const restaurant = await Restaurant.findById(id).select("cuisines").lean();
  const fallbackCuisine = getFallbackCuisine(restaurant?.cuisines);

  await MenuItems.updateMany(
    {
      restaurantId: id,
      $or: [
        { cuisine: { $exists: false } },
        { cuisine: "" },
        { cuisine: null },
      ],
    },
    { $set: { cuisine: fallbackCuisine } }
  );

  const items = await MenuItems.find({ restaurantId: id }).lean();
  res.json(items);
});

export const updateMenuItemCuisine = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    const { cuisine } = req.body;

    if (
      typeof itemId !== "string" ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        message: "Valid item id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    const safeCuisine = getValidCuisine(cuisine, restaurant.cuisines || []);

    if (!safeCuisine) {
      return res.status(400).json({
        message: "Please choose a valid restaurant cuisine",
      });
    }

    item.cuisine = safeCuisine;
    await item.save();

    res.json({
      message: "Item cuisine updated",
      item,
    });
  }
);

export const updateMenuItemPrice = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    const { price } = req.body;

    if (
      typeof itemId !== "string" ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        message: "Valid item id is required",
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        message: "Please enter a valid price",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    item.price = Math.round(numericPrice);
    await item.save();

    res.json({
      message: "Item price updated",
      item,
    });
  }
);

export const deleteMenuItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (
      typeof itemId !== "string" ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        message: "Valid item id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    await item.deleteOne();

    res.json({
      message: "Menu item deleted successfully",
    });
  }
);

export const toggleMenuItemAvailability = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    if (
      typeof itemId !== "string" ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        message: "Valid item id is required",
      });
    }

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    res.json({
      message: `Item Marked as ${
        item.isAvailable ? "available" : "unavailable"
      }`,
      item,
    });
  }
);

export const updateMenuItemOffer = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Please login",
      });
    }

    const { itemId } = req.params;
    const { isActive, discountPercent } = req.body;

    if (
      typeof itemId !== "string" ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({
        message: "Valid item id is required",
      });
    }

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

    const item = await MenuItems.findById(itemId);

    if (!item) {
      return res.status(404).json({
        message: "No item found",
      });
    }

    const restaraunt = await Restaurant.findOne({
      _id: item.restaurantId,
      ownerId: req.user._id,
    });

    if (!restaraunt) {
      return res.status(404).json({
        message: "NO Restaurant found",
      });
    }

    item.offer = {
      isActive,
      discountPercent: isActive ? safeDiscount ?? 0 : 0,
    };
    await item.save();

    res.json({
      message: isActive ? "Item offer enabled" : "Item offer disabled",
      item,
    });
  }
);
