import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Cart from "../models/Cart.js";

const getDiscountedUnitPrice = (item: any, restaurant: any) => {
  const itemOffer = item.offer;
  const restaurantOffer = restaurant.offer;
  const discountPercent =
    itemOffer?.isActive && itemOffer.discountPercent > 0
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

export const addToCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const { restaurantId, itemId } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(restaurantId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    return res.status(400).json({
      message: "Invalid restaurant and item id",
    });
  }

  const cartFromDifferentRestaurant = await Cart.findOne({
    userId,
    restaurantId: { $ne: restaurantId },
  });

  if (cartFromDifferentRestaurant) {
    return res.status(400).json({
      message:
        "You can order from only one restaurant at a time. Please clear your cart first to add items from this restaurant.",
    });
  }

  const cartItem = await Cart.findOneAndUpdate(
    { userId, restaurantId, itemId },
    {
      $inc: { quauntity: 1 },
      $setOnInsert: { userId, restaurantId, itemId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({
    message: "Item added to cart",
    cart: cartItem,
  });
});

export const fetchMyCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Please Login",
    });
  }

  const userId = req.user._id;

  const cartItems = await Cart.find({ userId })
    .populate("itemId")
    .populate("restaurantId");

  let subtotal = 0;
  let originalSubtotal = 0;
  let discountAmount = 0;
  let cartLength = 0;

  for (const cartItem of cartItems) {
    const item: any = cartItem.itemId;
    const restaurant: any = cartItem.restaurantId;
    const pricedItem = getDiscountedUnitPrice(item, restaurant);

    originalSubtotal += pricedItem.originalPrice * cartItem.quauntity;
    subtotal += pricedItem.price * cartItem.quauntity;
    discountAmount += pricedItem.discountAmount * cartItem.quauntity;
    cartLength += cartItem.quauntity;
  }

  return res.json({
    success: true,
    cartLength,
    originalSubtotal,
    subtotal,
    discountAmount,
    cart: cartItems,
  });
});

export const incrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

  const { itemId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemId },
      { $inc: { quauntity: 1 } },
      { new: true }
    );

    if (!cartItem) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    res.json({
      message: "Quantity increased",
      cartItem,
    });
  }
);

export const decrementCartItem = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

  const { itemId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const cartItem = await Cart.findOne({ userId, itemId });

    if (!cartItem) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (cartItem.quauntity === 1) {
      await Cart.deleteOne({ userId, itemId });

      return res.json({
        message: "Item removed from cart",
      });
    }

    cartItem.quauntity -= 1;
    await cartItem.save();

    res.json({
      message: "Quantity decreased",
      cartItem,
    });
  }
);

export const clearCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  await Cart.deleteMany({ userId });

  res.json({
    message: "Cart cleared successfully",
  });
});
