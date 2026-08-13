import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { restaurantService } from "../main";
import type { IOrder } from "../types";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage } from "react-icons/bi";
import { ServiceCards, type ServiceCardItem } from "../components/ui/services-card";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const firstLetter = user?.name?.charAt(0).toUpperCase() || "U";

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccountSummary = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const [addressResult, orderResult] = await Promise.allSettled([
          axios.get(`${restaurantService}/api/address/all`, { headers }),
          axios.get(`${restaurantService}/api/order/myorder`, { headers }),
        ]);

        if (addressResult.status === "fulfilled") {
          setAddresses(addressResult.value.data || []);
        }

        if (orderResult.status === "fulfilled") {
          setOrders(orderResult.value.data.orders || []);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchAccountSummary();
  }, []);

  const primaryAddress = addresses[0];

  const lastOrder = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [orders]);

  const lastOrderText = lastOrder
    ? `${lastOrder.restaurantName} - Rs. ${lastOrder.totalAmount}`
    : "No orders yet";

  const logoutHandler = () => {
    localStorage.setItem("token", "");
    setUser(null);
    setIsAuth(false);
    navigate("/login");
    toast.success("logout Success");
  };

  const accountCards: ServiceCardItem[] = [
    {
      title: "Your Orders",
      description: lastOrder
        ? `Track order #${lastOrder._id.slice(-6)} and view order history.`
        : "View orders after your first checkout.",
      icon: BiPackage,
      number: "01",
      gradient: "from-red-50 via-white to-orange-50",
      onClick: () => navigate("/orders"),
    },
    {
      title: "Addresses",
      description: primaryAddress
        ? "Manage saved delivery locations and phone numbers."
        : "Add a delivery address before checkout.",
      icon: BiMapPin,
      number: "02",
      gradient: "from-emerald-50 via-white to-cyan-50",
      onClick: () => navigate("/address"),
    },
    {
      title: "Logout",
      description: "Sign out from this device and return to login.",
      icon: BiLogOut,
      number: "03",
      gradient: "from-slate-50 via-white to-zinc-100",
      onClick: logoutHandler,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 md:min-w-[260px]">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#e23744] text-2xl font-bold text-white shadow-sm">
                {firstLetter}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e23744]">
                  My Account
                </p>
                <h1 className="truncate text-2xl font-bold text-gray-950">
                  {user?.name || "Customer"}
                </h1>
                <p className="truncate text-sm text-gray-500">
                  {user?.email || "Email not available"}
                </p>
              </div>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-4">
              <InfoBlock label="Name" value={user?.name || "Customer"} />
              <InfoBlock
                label="Email"
                value={user?.email || "Email not available"}
              />
              <InfoBlock
                label="Address"
                value={
                  loadingSummary
                    ? "Loading address..."
                    : primaryAddress?.formattedAddress || "No saved address"
                }
              />
              <InfoBlock
                label="Last Order"
                value={loadingSummary ? "Loading order..." : lastOrderText}
              />
            </div>
          </div>
        </section>

        <ServiceCards items={accountCards} />
      </div>
    </div>
  );
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="min-w-0 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-gray-800">
        {value}
      </p>
    </div>
  );
};

export default Account;
