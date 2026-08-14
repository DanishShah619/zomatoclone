import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";
import CurrentOrderBanner from "../components/CurrentOrderBanner";

const HOME_REFRESH_INTERVAL_MS = 10000;

const Home = () => {
  const { location } = useAppData();
  const [searchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const fetchRestaurants = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const params: Record<string, string> = { search };
      if (location?.latitude && location?.longitude) {
        params.latitude = String(location.latitude);
        params.longitude = String(location.longitude);
      }

      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(true);

    const intervalId = window.setInterval(() => {
      fetchRestaurants();
    }, HOME_REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      if (!document.hidden) fetchRestaurants();
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [location, search]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <CurrentOrderBanner />
      <div className="mb-4 flex justify-end">
        <span className="text-xs font-medium text-gray-400">
          {refreshing ? "Refreshing restaurants..." : "Auto-refreshing"}
        </span>
      </div>
      {restaurants.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {restaurants.map((res) => {
            let distance: string | undefined;

            if (location?.latitude && location?.longitude) {
              const [resLng, resLat] = res.autoLocation.coordinates;
              distance = `${getDistanceKm(
                location.latitude,
                location.longitude,
                resLat,
                resLng
              )}`;
            }

            return (
              <RestaurantCard
                key={res._id}
                id={res._id}
                name={res.name}
                cuisines={res.cuisines}
                image={res.image ?? ""}
                distance={distance}
                isOpen={res.isOpen}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500">No restaurant found</p>
      )}
    </div>
  );
};

export default Home;
