import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { RandomLetterSwap } from "./ui/random-letter-swap";

const logoSrc = "/Gemini_Generated_Image_wjibu7wjibu7wjib.png";

const navLinks = [
  { label: "Home", to: "/restaurants" },
  { label: "Best Deals", to: "/best-deals" },
  { label: "My Orders", to: "/orders" },
  { label: "My Account", to: "/account" },
];

const Navbar = () => {
  const { isAuth, city, quauntity } = useAppData();
  const currLocation = useLocation();

  const isHomePage = currLocation.pathname === "/restaurants";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);
  return (
    <div className="w-full bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          to={isAuth ? "/restaurants" : "/"}
          className="flex min-w-[260px] items-center gap-4 cursor-pointer"
        >
          <img
            src={logoSrc}
            alt="Tomato logo"
            className="h-14 w-auto max-w-[128px] shrink-0 object-contain"
          />
          <span className="shiny-brand-text brand-logo-text">
            Tomato
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => {
            const active = currLocation.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link-type text-[15px] ${
                  active ? "text-[#E23744]" : "text-slate-600"
                }`}
              >
                <RandomLetterSwap
                  label={item.label}
                  staggerDuration={0.045}
                  transition={{
                    duration: 0.82,
                  }}
                  className="hover:text-[#E23744]"
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Link to={"/cart"} className="relative">
            <CgShoppingCart className="h-6 w-6 text-[#E23744]" />
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E23744] text-xs font-semibold text-white">
              {quauntity}
            </span>
          </Link>

          {!isAuth && (
            <Link to="/Login" className="font-medium text-[#E23744]">
              Login
            </Link>
          )}
        </div>
      </div>

      {isAuth && (
        <nav className="flex gap-4 overflow-x-auto border-t px-4 py-3 md:hidden">
          {navLinks.map((item) => {
            const active = currLocation.pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link-type shrink-0 text-sm ${
                  active ? "text-[#E23744]" : "text-slate-600"
                }`}
              >
                <RandomLetterSwap
                  label={item.label}
                  staggerDuration={0.04}
                  transition={{ duration: 0.78 }}
                />
              </Link>
            );
          })}
        </nav>
      )}

      {/* search bar */}
      {isHomePage && (
        <div className="border-t px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r text-gray-700">
              <BiMapPin className="h-4 w-4 text-[#E23744]" />
              <span className="text-sm truncate max-w-35">{city}</span>
            </div>
            <div className="flex flex-1 items-center gap-2 px-3">
              <BiSearch className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for restaurant"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
