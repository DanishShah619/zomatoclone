import { useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { BiEdit, BiMapPin, BiSave } from "react-icons/bi";
import { useAppData } from "../context/AppContext";

interface props {
  restaurant: IRestaurant;
  isSeller: boolean;
  onUpdate: (restaurant: IRestaurant) => void;
}

const RestaurantProfile = ({ restaurant, isSeller, onUpdate }: props) => {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [offerActive, setOfferActive] = useState(
    restaurant.offer?.isActive ?? false
  );
  const [offerPercent, setOfferPercent] = useState(
    String(restaurant.offer?.discountPercent ?? 10)
  );
  const [loading, setLoading] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);

  const toggleOpenStatus = async () => {
    try {
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/status`,
        { status: !isOpen },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      setIsOpen(data.restaurant.isOpen);
    } catch (error: any) {
      console.log(error);
      toast.error(error.response.data.message);
    }
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/edit`,
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onUpdate(data.restaurant);
      setEditMode(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const saveRestaurantOffer = async () => {
    const discountPercent = Number(offerPercent);

    if (offerActive && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 90)) {
      toast.error("Offer must be between 1% and 90%");
      return;
    }

    try {
      setSavingOffer(true);
      const { data } = await axios.put(
        `${restaurantService}/api/restaurant/offer`,
        {
          isActive: offerActive,
          discountPercent,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success(data.message);
      onUpdate(data.restaurant);
    } catch (error: any) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to update offer");
    } finally {
      setSavingOffer(false);
    }
  };

  const { setIsAuth, setUser } = useAppData();

  const logoutHandler = async () => {
    await axios.put(
      `${restaurantService}/api/restaurant/status`,
      { status: false },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    localStorage.setItem("token", "");
    setIsAuth(false);
    setUser(null);
    toast.success("loggedOut successfully");
  };
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white shadow-sm overflow-hidden">
      {restaurant.image && (
        <img
          src={restaurant.image}
          alt=""
          className="h-48 w-full object-cover"
        />
      )}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-2 py-1 text-lg font-semibold"
              />
            ) : (
              <h2 className="text-xl font-semibold">{restaurant.name}</h2>
            )}

            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <BiMapPin className="h-4 w-4 text-red-500" />
              {restaurant.autoLocation.formattedAddress ||
                "Location unavalable"}
            </div>
          </div>

          {isSeller && (
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-gray-500 hover:text-black"
            >
              <BiEdit size={18} />
            </button>
          )}
        </div>

        {editMode ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        ) : (
          <p className="text-sm text-gray-600">
            {restaurant.description || "No description added"}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <span
            className={`text-sm font-medium ${
              isOpen ? "text-green-600" : "text-red-500"
            }`}
          >
            {isOpen ? "OPEN" : "CLOSED"}
          </span>

          <div className="flex gap-3">
            {editMode && (
              <button
                onClick={saveChanges}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                <BiSave size={16} />
                Save
              </button>
            )}

            {isSeller && (
              <button
                onClick={toggleOpenStatus}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${
                  isOpen
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isOpen ? "Close Restaurant" : "Open Restaurant"}
              </button>
            )}

            {isSeller && (
              <button
                onClick={logoutHandler}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700
                `}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {isSeller && (
          <div className="rounded-lg border bg-red-50/50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Restaurant-wide offer
                </p>
                <p className="text-xs text-gray-500">
                  Applies to final bill items without item-specific offers.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={offerActive}
                  onChange={(e) => setOfferActive(e.target.checked)}
                />
                Active
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={offerPercent}
                onChange={(e) => setOfferPercent(e.target.value)}
                disabled={!offerActive}
                className="w-28 rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
              />
              <span className="flex items-center text-sm text-gray-500">
                % off
              </span>
              <button
                onClick={saveRestaurantOffer}
                disabled={savingOffer}
                className="ml-auto rounded-lg bg-[#E23744] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingOffer ? "Saving..." : "Save Offer"}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Created on {new Date(restaurant.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default RestaurantProfile;
