import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { adminService } from "../main";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";

const ADMIN_REFRESH_INTERVAL_MS = 10000;

const Admin = () => {
  const [restaurant, setRestaurant] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"restaurant" | "rider">("restaurant");

  const fetchData = useCallback(async (showInitialLoader = false) => {
    try {
      if (showInitialLoader) setLoading(true);
      else setRefreshing(true);

      const headers = {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      };

      const [restaurantResponse, riderResponse] = await Promise.all([
        axios.get(`${adminService}/api/v1/admin/restaurant/pending`, {
          headers,
        }),
        axios.get(`${adminService}/api/v1/admin/rider/pending`, {
          headers,
        }),
      ]);

      setRestaurant(restaurantResponse.data.restaurants || []);
      setRiders(riderResponse.data.riders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);

    const intervalId = window.setInterval(() => {
      fetchData();
    }, ADMIN_REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      if (!document.hidden) fetchData();
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading admin panel...</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <span className="text-xs font-medium text-gray-400">
          {refreshing ? "Refreshing..." : "Auto-refreshing"}
        </span>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setTab("restaurant")}
          className={`px-4 py-2 rounded ${
            tab === "restaurant" ? "bg-red-500 text-white" : "bg-gray-200"
          }`}
        >
          Restaurant
        </button>

        <button
          onClick={() => setTab("rider")}
          className={`px-4 py-2 rounded ${
            tab === "rider" ? "bg-red-500 text-white" : "bg-gray-200"
          }`}
        >
          Riders
        </button>
      </div>

      {tab === "restaurant" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {restaurant.length === 0 ? (
            <p>No pending restaurants</p>
          ) : (
            restaurant.map((r) => (
              <AdminRestaurantCard
                key={r._id}
                restaurant={r}
                onVerify={fetchData}
              />
            ))
          )}
        </div>
      )}
      {tab === "rider" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {riders.length === 0 ? (
            <p>No pending riders</p>
          ) : (
            riders.map((r) => (
              <RiderAdmin key={r._id} rider={r} onVerify={fetchData} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
