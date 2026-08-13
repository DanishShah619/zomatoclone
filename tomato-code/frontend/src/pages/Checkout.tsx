import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { restaurantService, utilsService } from "../main";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const { cart, subTotal, originalSubTotal, discountAmount, quauntity } =
    useAppData();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const savedAddresses = data || [];
        setAddresses(savedAddresses);

        if (savedAddresses.length > 0) {
          setSelectedAddressId((current) => current || savedAddresses[0]._id);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] item-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;
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

  const createOrder = async () => {
    if (!selectedAddressId) return null;

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod: "stripe",
          addressId: selectedAddressId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      return data;
    } catch (error) {
      toast.error("Failed to create order");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder();
      if (!order) return;

      await stripePromise;

      const { data } = await axios.post(
        `${utilsService}/api/payment/stripe/create`,
        {
          orderId: order.orderId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      toast.error("Failed to create payment session");
    } catch (error) {
      console.log(error);
      toast.error("Payment failed");
    } finally {
      setLoadingStripe(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          {restaurant.autoLocation.formattedAddress}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Delivery Address</h3>

        {loadingAddress ? (
          <p className="text-sm text-gray-500">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <p className="text-sm text-gray-500">
              No address found. Add a delivery address before paying.
            </p>
            <button
              type="button"
              onClick={() => navigate("/address")}
              className="rounded-lg bg-[#E23744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d32f3a]"
            >
              Add delivery address
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <label
              key={address._id}
              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selectedAddressId === address._id
                  ? "border-[#e23744] bg-red-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                checked={selectedAddressId === address._id}
                onChange={() => setSelectedAddressId(address._id)}
              />
              <div>
                <p className="text-sm font-medium">
                  {address.formattedAddress}
                </p>
                <p className="text-xs text-gray-500">{address.mobile}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
        <h3 className="font-semibold">Order Summary</h3>

        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          const effectivePrice = getEffectivePrice(item);

          return (
            <div className="flex justify-between text-sm" key={cartItem._id}>
              <span>
                {item.name} x {cartItem.quauntity}
                {effectivePrice.discountPercent > 0 && (
                  <span className="ml-2 text-xs text-green-600">
                    {effectivePrice.discountPercent}% off
                  </span>
                )}
              </span>
              <span>Rs. {effectivePrice.price * cartItem.quauntity}</span>
            </div>
          );
        })}

        <hr />

        <div className="flex justify-between text-sm">
          <span>Items ({quauntity})</span>
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
          <span>Platform Fee</span>
          <span>Rs. {platformFee}</span>
        </div>

        {subTotal < 250 && (
          <p className="text-xs text-gray-500">
            Add items worth Rs. {250 - subTotal} more to get free delivery
          </p>
        )}

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>Rs. {grandTotal}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Payment Method</h3>
        {!selectedAddressId && (
          <p className="text-sm text-gray-500">
            Select or add a delivery address to enable Stripe payment.
          </p>
        )}

        <button
          disabled={!selectedAddressId || loadingStripe || creatingOrder}
          onClick={payWithStripe}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loadingStripe ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}
          Pay With Stripe
        </button>
      </div>
    </div>
  );
};

export default Checkout;
