import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";

const RestaurantPage = () => {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurant(data || null);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setMenuItems(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading restaurant...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">No Restaurant with this id</p>
      </div>
    );
  }

  const cuisineOptions = Array.from(
    new Set(
      [
        ...(restaurant.cuisines || []),
        ...menuItems.map((item) => item.cuisine).filter(Boolean),
      ] as string[]
    )
  );
  const visibleMenuItems =
    selectedCuisine === "All"
      ? menuItems
      : menuItems.filter((item) => item.cuisine === selectedCuisine);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 space-y-6">
      <RestaurantProfile
        restaurant={restaurant}
        onUpdate={setRestaurant}
        isSeller={false}
      />

      <div className="rounded-xl bg-white shadow-sm p-4">
        {cuisineOptions.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {["All", ...cuisineOptions].map((cuisine) => (
              <button
                type="button"
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedCuisine === cuisine
                    ? "border-[#E23744] bg-[#E23744] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#E23744]/40 hover:bg-red-50"
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        )}
        <MenuItems
          isSeller={false}
          items={visibleMenuItems}
          onItemDeleted={() => {}}
        />
        {visibleMenuItems.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No dishes found for this cuisine
          </p>
        )}
      </div>
    </div>
  );
};

export default RestaurantPage;
