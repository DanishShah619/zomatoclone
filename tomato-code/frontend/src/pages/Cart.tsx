import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

const Cart = () => {
  const {
    cart,
    subTotal,
    originalSubTotal,
    discountAmount,
    quauntity,
    fetchCart,
  } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platfromFee = 7;
  const grandTotal = subTotal + deliveryFee + platfromFee;
  const getEffectivePrice = (item: IMenuItem) => {
    const discountPercent =
      item.offer?.isActive && item.offer.discountPercent > 0
        ? item.offer.discountPercent
        : restaurant.offer?.isActive && restaurant.offer.discountPercent > 0
        ? restaurant.offer.discountPercent
        : 0;
    const discount = Math.round((item.price * discountPercent) / 100);

    return {
      discountPercent,
      price: Math.max(item.price - discount, 0),
    };
  };

  const increaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/inc`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchCart();
    } catch {
      toast.error("something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/dec`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await fetchCart();
    } catch {
      toast.error("something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear you cart?");
    if (!confirm) return;

    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      await fetchCart();
    } catch {
      toast.error("something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          {restaurant.autoLocation.formattedAddress}
        </p>
      </div>

      <div className="space-y-4">
        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          const isLoading = loadingItemId === item._id;
          const effectivePrice = getEffectivePrice(item);

          return (
            <div
              key={item._id}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
            >
              <img
                src={item.image}
                alt=""
                className="h-20 w-20 rounded object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">
                  Rs. {effectivePrice.price}
                  {effectivePrice.discountPercent > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      {effectivePrice.discountPercent}% off
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => decreaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiMinus size={16} />
                  )}
                </button>
                <span className="font-medium">{cartItem.quauntity}</span>
                <button
                  className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => increaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiPlus size={16} />
                  )}
                </button>
              </div>

              <p className="w-24 text-right font-medium">
                Rs. {effectivePrice.price * cartItem.quauntity}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span>Total Items</span>
          <span>{quauntity}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>Rs. {originalSubTotal}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Offer discount</span>
            <span>- Rs. {discountAmount}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Discounted subtotal</span>
          <span>Rs. {subTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee}`}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Platform fee</span>
          <span>Rs. {platfromFee}</span>
        </div>

        {subTotal < 250 && (
          <p className="text-xs text-gray-500">
            Add item worth Rs. {250 - subTotal} more to get free delivery
          </p>
        )}

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>Rs. {grandTotal}</span>
        </div>

        <button
          onClick={() => navigate("/checkout")}
          className={`mt-3 w-full rounded-lg bg-[#E23744] py-3 text-sm font-semibold text-white hover:bg-red-800 ${
            !restaurant.isOpen ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!restaurant.isOpen}
        >
          {!restaurant.isOpen ? "Restaurant is Closed" : "Proceed to Checkout"}
        </button>

        <button
          onClick={clearCart}
          className="mt-3 w-full rounded-lg bg-[#232222] py-3 text-sm font-semibold text-white hover:bg-gray-900 flex justify-center items-center gap-3"
          disabled={clearingCart}
        >
          Clear Cart <TbTrash size={16} />
        </button>
      </div>
    </div>
  );
};

export default Cart;
