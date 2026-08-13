import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import type { IMenuItem, IRestaurant } from "../types";

interface ItemDeal extends IMenuItem {
  restaurant: IRestaurant & { distanceKm?: number };
}

const getDiscountedPrice = (price: number, discountPercent = 0) =>
  Math.max(price - Math.round((price * discountPercent) / 100), 0);

const BestDeals = () => {
  const { location } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const [restaurantOffers, setRestaurantOffers] = useState<
    Array<IRestaurant & { distanceKm?: number }>
  >([]);
  const [itemOffers, setItemOffers] = useState<ItemDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      if (!location?.latitude || !location?.longitude) return;

      try {
        setLoading(true);
        const { data } = await axios.get(
          `${restaurantService}/api/restaurant/deals`,
          {
            params: {
              latitude: location.latitude,
              longitude: location.longitude,
              search,
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setRestaurantOffers(data.restaurantOffers ?? []);
        setItemOffers(data.itemOffers ?? []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [location, search]);

  const hasDeals = restaurantOffers.length > 0 || itemOffers.length > 0;

  const carouselDeals = useMemo(
    () => [
      ...itemOffers.slice(0, 8).map((item) => ({
        id: item._id,
        title: item.name,
        subtitle: item.restaurant.name,
        image: item.image,
        discountPercent: item.offer?.discountPercent || 0,
        onClick: () => navigate(`/restaurant/${item.restaurant._id}`),
      })),
      ...restaurantOffers.slice(0, 8).map((restaurant) => ({
        id: restaurant._id,
        title: restaurant.name,
        subtitle: "Restaurant-wide offer",
        image: restaurant.image,
        discountPercent: restaurant.offer?.discountPercent || 0,
        onClick: () => navigate(`/restaurant/${restaurant._id}`),
      })),
    ],
    [itemOffers, navigate, restaurantOffers]
  );

  if (loading || !location) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Finding the best deals near you...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-8">
      <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3 border-b border-white pb-6 shadow-[0_1px_0_rgba(148,163,184,0.28)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#E23744] shadow-[5px_5px_12px_rgba(148,163,184,0.24),-5px_-5px_12px_rgba(255,255,255,0.95)]">
            Fresh savings
          </p>
          <h1 className="text-3xl font-black text-gray-950">Best Deals</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-gray-600">
            Active dish and restaurant-wide offers near your location.
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-[8px_8px_18px_rgba(148,163,184,0.3),-8px_-8px_18px_rgba(255,255,255,0.95)]">
          {itemOffers.length + restaurantOffers.length} live offers
        </div>
      </div>

      {!hasDeals ? (
        <p className="rounded-lg bg-white p-8 text-center font-medium text-gray-500 shadow-[10px_10px_24px_rgba(148,163,184,0.24),-10px_-10px_24px_rgba(255,255,255,0.9)]">
          No active deals found
        </p>
      ) : (
        <div className="space-y-8">
          {carouselDeals.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-950">
                  Featured offers
                </h2>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-[4px_4px_10px_rgba(148,163,184,0.22),-4px_-4px_10px_rgba(255,255,255,0.9)]">
                  Scroll sideways
                </span>
              </div>
              <div className="flex gap-5 overflow-x-auto px-1 pb-5 pt-2">
                {carouselDeals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={deal.onClick}
                    className="relative h-56 w-80 shrink-0 overflow-hidden rounded-lg bg-gray-950 text-left shadow-[12px_12px_26px_rgba(15,23,42,0.28),-10px_-10px_22px_rgba(255,255,255,0.95)] transition duration-300 hover:-translate-y-1 hover:shadow-[16px_16px_32px_rgba(15,23,42,0.32),-12px_-12px_26px_rgba(255,255,255,1)]"
                  >
                    <img
                      src={deal.image}
                      alt=""
                      className="h-full w-full object-cover opacity-80 transition duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
                    <div className="absolute left-4 top-4 rounded-full bg-[#E23744] px-4 py-1.5 text-xs font-black text-white shadow-[0_10px_22px_rgba(226,55,68,0.42)]">
                      {deal.discountPercent}% OFF
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="truncate text-xl font-black text-white">
                        {deal.title}
                      </h3>
                      <p className="truncate text-sm font-medium text-white/80">
                        {deal.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {itemOffers.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-black text-gray-950">
                Dish offers
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {itemOffers.map((item) => {
                  const discountPercent = item.offer?.discountPercent || 0;
                  const discountedPrice = getDiscountedPrice(
                    item.price,
                    discountPercent
                  );

                  return (
                    <button
                      key={item._id}
                      onClick={() => navigate(`/restaurant/${item.restaurant._id}`)}
                      className="flex gap-4 rounded-lg border border-white/80 bg-[#f9fafb] p-5 text-left shadow-[10px_10px_24px_rgba(148,163,184,0.28),-10px_-10px_24px_rgba(255,255,255,0.95),inset_1px_1px_0_rgba(255,255,255,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[14px_14px_30px_rgba(148,163,184,0.34),-12px_-12px_28px_rgba(255,255,255,1)]"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="h-28 w-28 rounded-lg object-cover shadow-[7px_7px_14px_rgba(148,163,184,0.32),-5px_-5px_12px_rgba(255,255,255,0.95)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 inline-flex rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-black text-[#E23744] shadow-[inset_2px_2px_5px_rgba(226,55,68,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
                          {discountPercent}% OFF
                        </div>
                        <h3 className="truncate text-lg font-black text-gray-950">{item.name}</h3>
                        <p className="truncate text-sm font-semibold text-gray-600">
                          {item.restaurant.name}
                        </p>
                        <p className="mt-3 text-base font-black text-gray-950">
                          Rs. {discountedPrice}
                          <span className="ml-2 text-xs font-semibold text-gray-400 line-through">
                            Rs. {item.price}
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {restaurantOffers.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-black text-gray-950">
                Restaurant-wide offers
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {restaurantOffers.map((restaurant) => (
                  <button
                    key={restaurant._id}
                    onClick={() => navigate(`/restaurant/${restaurant._id}`)}
                    className="group relative overflow-hidden rounded-lg border border-white/80 bg-[#f9fafb] text-left shadow-[12px_12px_26px_rgba(148,163,184,0.3),-10px_-10px_24px_rgba(255,255,255,0.95),inset_1px_1px_0_rgba(255,255,255,0.95)] transition duration-300 hover:-translate-y-1 hover:shadow-[16px_16px_34px_rgba(148,163,184,0.36),-12px_-12px_28px_rgba(255,255,255,1)]"
                  >
                    <div className="absolute left-4 top-4 z-10 rounded-full bg-[#E23744] px-3 py-1.5 text-xs font-black text-white shadow-[0_10px_20px_rgba(226,55,68,0.38)]">
                      {restaurant.offer?.discountPercent}% OFF BILL
                    </div>
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={restaurant.image ?? ""}
                        alt=""
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                          !restaurant.isOpen ? "grayscale" : ""
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      {!restaurant.isOpen && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-gray-950 px-3 py-1 text-xs font-bold text-white">
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <h3 className="truncate text-lg font-black text-gray-950">
                        {restaurant.name}
                      </h3>
                      <p className="truncate text-sm font-semibold text-[#E23744]">
                        {restaurant.cuisines?.length
                          ? restaurant.cuisines.slice(0, 3).join(", ")
                          : "Cuisine not listed"}
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        {restaurant.distanceKm ?? "--"} KM away
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default BestDeals;
