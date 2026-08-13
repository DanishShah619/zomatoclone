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

  const { name, description, price } = req.body;

  const numericPrice = Number(price);

  if (!name || !Number.isFinite(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({
      message: "Name and valid price are required",
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
  const items = await MenuItems.find({ restaurantId: id }).lean();
  res.json(items);
});

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
