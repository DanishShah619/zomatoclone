import { useLocation, useNavigate } from "react-router-dom";
import { BiCart, BiChevronRight } from "react-icons/bi";
import { useAppData } from "../context/AppContext";
import type { IRestaurant } from "../types";

const HOME_PATH = "/restaurants";

const CartBottomBanner = () => {
  const { cart, quauntity, subTotal, discountAmount } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  if (!cart || cart.length === 0 || quauntity <= 0) return null;
  if (location.pathname !== HOME_PATH) return null;

  const restaurant = cart[0].restaurantId as IRestaurant;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] border-t border-red-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
      <button
        type="button"
        onClick={() => navigate("/cart")}
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-lg bg-[#E23744] px-4 py-3 text-left text-white transition hover:bg-[#d32f3a]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <BiCart size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {quauntity} {quauntity === 1 ? "item" : "items"} in your cart
            </p>
            <p className="truncate text-xs text-white/80">
              {restaurant?.name || "Restaurant"}
              {discountAmount > 0 ? ` - Rs. ${discountAmount} saved` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm font-bold">
          Rs. {subTotal}
          <BiChevronRight size={22} />
        </div>
      </button>
    </div>
  );
};

export default CartBottomBanner;
