import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BiChevronRight, BiLoader } from "react-icons/bi";
import type { IOrder } from "../types";
import { restaurantService } from "../main";
import { useSocket } from "../context/SocketContext";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const STATUS_LABELS: Record<string, string> = {
  placed: "Order placed",
  accepted: "Restaurant accepted your order",
  preparing: "Your food is being prepared",
  ready_for_rider: "Waiting for rider pickup",
  rider_assigned: "Rider assigned",
  picked_up: "Out for delivery",
};

const ORDER_REFRESH_INTERVAL_MS = 15000;

const CurrentOrderBanner = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const intervalId = window.setInterval(fetchOrders, ORDER_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;

    socket.on("order:update", fetchOrders);
    socket.on("order:rider_assigned", fetchOrders);

    return () => {
      socket.off("order:update", fetchOrders);
      socket.off("order:rider_assigned", fetchOrders);
    };
  }, [socket, fetchOrders]);

  const currentOrder = useMemo(() => {
    return orders.find((order) => ACTIVE_STATUSES.includes(order.status));
  }, [orders]);

  if (loading || !currentOrder) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/order/${currentOrder._id}`)}
      className="mb-5 flex w-full flex-col gap-3 rounded-lg border border-red-100 bg-gradient-to-r from-red-50 via-white to-orange-50 px-4 py-3 text-left shadow-sm transition hover:border-[#E23744]/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#E23744]">
          {STATUS_LABELS[currentOrder.status] || "Order in progress"}
        </p>
        <p className="mt-1 truncate text-sm text-gray-700">
          {currentOrder.restaurantName} - Order #{currentOrder._id.slice(-6)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <BiLoader className="animate-spin text-[#E23744]" />
        Track order
        <BiChevronRight className="h-5 w-5 text-[#E23744]" />
      </div>
    </button>
  );
};

export default CurrentOrderBanner;
