import { useState } from "react";
import type { IMenuItem } from "../types";
import { FiEyeOff } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
}

const getDiscountedPrice = (price: number, discountPercent = 0) =>
  Math.max(price - Math.round((price * discountPercent) / 100), 0);

const MenuItems = ({ items, onItemDeleted, isSeller }: MenuItemsProps) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [offerDrafts, setOfferDrafts] = useState<Record<string, string>>({});
  const [savingOfferId, setSavingOfferId] = useState<string | null>(null);
  const { fetchCart } = useAppData();

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this item");
    if (!confirm) return;

    try {
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Item deleted");
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete item");
    }
  };

  const toggleAvailability = async (itemId: string) => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onItemDeleted();
    } catch (error) {
      console.log(error);
      toast.error("Failed to update status");
    }
  };

  const saveItemOffer = async (
    itemId: string,
    isActive: boolean,
    discountPercent: number
  ) => {
    if (
      isActive &&
      (!Number.isFinite(discountPercent) ||
        discountPercent <= 0 ||
        discountPercent > 90)
    ) {
      toast.error("Offer must be between 1% and 90%");
      return;
    }

    try {
      setSavingOfferId(itemId);
      const { data } = await axios.put(
        `${restaurantService}/api/item/offer/${itemId}`,
        {
          isActive,
          discountPercent,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onItemDeleted();
    } catch (error: any) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update offer");
    } finally {
      setSavingOfferId(null);
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId,
          itemId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add item");
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const isLoading = loadingItemId === item._id;
        const offerActive = Boolean(
          item.offer?.isActive && item.offer.discountPercent > 0
        );
        const offerPercent = item.offer?.discountPercent || 0;
        const draftPercent =
          offerDrafts[item._id] ?? String(item.offer?.discountPercent || 10);
        const discountedPrice = getDiscountedPrice(item.price, offerPercent);

        return (
          <div
            className={`relative flex gap-4 rounded-lg bg-white p-4 shadow-sm transition ${
              !item.isAvailable ? "opacity-70" : ""
            }`}
            key={item._id}
          >
            <div className="relative shrink-0">
              <img
                src={item.image}
                alt=""
                className={`h-20 w-20 rounded object-cover ${
                  !item.isAvailable ? "grayscale brightness-75" : ""
                }`}
              />
              {!item.isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center rounded bg-black/60 text-xs font-semibold text-white">
                  Not Available
                </span>
              )}
              {offerActive && (
                <span className="absolute -left-2 -top-2 rounded-full bg-[#E23744] px-2 py-1 text-[10px] font-bold text-white shadow">
                  {offerPercent}% OFF
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">Rs. {discountedPrice}</p>
                  {offerActive && (
                    <p className="text-xs text-gray-400 line-through">
                      Rs. {item.price}
                    </p>
                  )}
                </div>

                {isSeller && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAvailability(item._id)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                    >
                      {item.isAvailable ? (
                        <BsEye size={18} />
                      ) : (
                        <FiEyeOff size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <BiTrash size={18} />
                    </button>
                  </div>
                )}

                {!isSeller && (
                  <button
                    disabled={!item.isAvailable || isLoading}
                    onClick={() => addToCart(item.restaurantId, item._id)}
                    className={`flex items-center justify-center rounded-lg p-2 ${
                      !item.isAvailable || isLoading
                        ? "cursor-not-allowed text-gray-400"
                        : "text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {isLoading ? (
                      <VscLoading size={18} className="animate-spin" />
                    ) : (
                      <BsCartPlus size={18} />
                    )}
                  </button>
                )}
              </div>

              {isSeller && (
                <div className="mt-3 rounded-lg border bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={draftPercent}
                      onChange={(e) =>
                        setOfferDrafts((prev) => ({
                          ...prev,
                          [item._id]: e.target.value,
                        }))
                      }
                      className="w-16 rounded border px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-gray-500">% off</span>
                    <button
                      onClick={() =>
                        saveItemOffer(item._id, true, Number(draftPercent))
                      }
                      disabled={savingOfferId === item._id}
                      className="ml-auto rounded bg-[#E23744] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => saveItemOffer(item._id, false, 0)}
                      disabled={savingOfferId === item._id || !offerActive}
                      className="rounded border px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
                    >
                      Off
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuItems;
