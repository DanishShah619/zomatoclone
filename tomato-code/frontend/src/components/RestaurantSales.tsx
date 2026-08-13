import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { IOrder } from "../types";
import { restaurantService } from "../main";

const SALES_REFRESH_INTERVAL_MS = 10000;

const RestaurantSales = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const { data } = await axios.get(
        `${restaurantService}/api/order/restaurant/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders(true);

    const intervalId = window.setInterval(() => {
      fetchOrders();
    }, SALES_REFRESH_INTERVAL_MS);

    const refreshOnFocus = () => {
      if (!document.hidden) fetchOrders();
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [fetchOrders]);

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered"),
    [orders]
  );

  const activeOrders = orders.filter((order) => order.status !== "delivered");
  const deliveredRevenue = deliveredOrders.reduce(
    (total, order) => total + order.totalAmount,
    0
  );
  const averageOrderValue =
    deliveredOrders.length > 0
      ? Math.round(deliveredRevenue / deliveredOrders.length)
      : 0;

  if (loading) {
    return <p className="text-sm text-gray-500">Loading sales...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Sales Overview</h3>
          <p className="text-sm text-gray-500">
            Delivered orders are counted as completed sales.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400">
          {refreshing ? "Refreshing..." : "Auto-refreshing"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SalesMetric label="Delivered Revenue" value={`Rs. ${deliveredRevenue}`} />
        <SalesMetric label="Delivered Orders" value={String(deliveredOrders.length)} />
        <SalesMetric label="Average Order" value={`Rs. ${averageOrderValue}`} />
      </div>

      <div className="rounded-lg border bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-800">
          Active paid orders: {activeOrders.length}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          These will move into sales after they are delivered.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold">Recent Delivered Orders</h4>
        {deliveredOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No delivered orders yet</p>
        ) : (
          deliveredOrders.slice(0, 8).map((order) => (
            <div
              key={order._id}
              className="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold">
                  Order #{order._id.slice(-6)}
                </p>
                <p className="text-xs text-gray-500">
                  {order.items
                    .map((item) => `${item.name} x ${item.quauntity}`)
                    .join(", ")}
                </p>
              </div>
              <div className="text-sm font-semibold">Rs. {order.totalAmount}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SalesMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
      {label}
    </p>
    <p className="mt-2 text-xl font-bold text-gray-950">{value}</p>
  </div>
);

export default RestaurantSales;
