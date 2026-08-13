import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { restaurantService } from "../main";
import { useAppData } from "../context/AppContext";
import type { IMenuItem, IRestaurant } from "../types";
import RestaurantCard from "../components/RestaurantCard";

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
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Best Deals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Active dish and restaurant-wide offers near your location.
        </p>
      </div>

      {!hasDeals ? (
        <p className="text-center text-gray-500">No active deals found</p>
      ) : (
        <div className="space-y-8">
          {carouselDeals.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Featured offers
                </h2>
                <span className="text-xs text-gray-500">
                  Scroll sideways
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3">
                {carouselDeals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={deal.onClick}
                    className="relative h-52 w-72 shrink-0 overflow-hidden rounded-xl bg-black text-left shadow-sm"
                  >
                    <img
                      src={deal.image}
                      alt=""
                      className="h-full w-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-[#E23744] px-3 py-1 text-xs font-bold text-white">
                      {deal.discountPercent}% OFF
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="truncate text-lg font-bold text-white">
                        {deal.title}
                      </h3>
                      <p className="truncate text-sm text-white/75">
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
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
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
                      className="flex gap-4 rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                    >
                      <img
                        src={item.image}
                        alt=""
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-[#E23744]">
                          {discountPercent}% OFF
                        </div>
                        <h3 className="truncate font-semibold">{item.name}</h3>
                        <p className="truncate text-sm text-gray-500">
                          {item.restaurant.name}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          Rs. {discountedPrice}
                          <span className="ml-2 text-xs text-gray-400 line-through">
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
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Restaurant-wide offers
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {restaurantOffers.map((restaurant) => (
                  <div key={restaurant._id} className="relative">
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-[#E23744] px-3 py-1 text-xs font-bold text-white shadow">
                      {restaurant.offer?.discountPercent}% OFF BILL
                    </div>
                    <RestaurantCard
                      id={restaurant._id}
                      name={restaurant.name}
                      image={restaurant.image ?? ""}
                      distance={`${restaurant.distanceKm ?? "--"}`}
                      isOpen={restaurant.isOpen}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default BestDeals;
