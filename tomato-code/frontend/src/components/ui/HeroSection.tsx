import { Link } from "react-router-dom";
import {
  BiCycling,
  BiMapPin,
  BiRestaurant,
  BiSearch,
  BiShieldQuarter,
  BiTimeFive,
} from "react-icons/bi";
import type { IconType } from "react-icons";

const foodImages = [
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
];

const journeyItems: Array<[IconType, string]> = [
  [BiRestaurant, "Restaurant onboarding and menu management"],
  [BiTimeFive, "Order status updates from kitchen to doorstep"],
  [BiMapPin, "Address selection with interactive maps"],
];

export default function HeroSection() {
  return (
    <main className="bg-white text-[#191919]">
      <section className="relative min-h-[92vh] overflow-hidden bg-black text-white">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=2200&q=85"
          alt="A table filled with fresh restaurant dishes"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/58" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-2xl font-bold tracking-normal">
            Tomato
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-white/45 px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-[#191919]"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-[#E23744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c92734]"
            >
              Order now
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(92vh-84px)] max-w-7xl items-center px-5 pb-20 pt-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 py-2 text-sm backdrop-blur">
              <BiMapPin className="h-4 w-4 text-[#E23744]" />
              Live restaurant discovery, cart, checkout, and rider tracking
            </div>
            <h1 className="text-6xl font-extrabold leading-[0.96] tracking-normal sm:text-7xl lg:text-8xl">
              Tomato
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/88 sm:text-xl">
              A full-stack food delivery app for finding nearby restaurants,
              ordering meals, paying securely, and tracking delivery updates in
              real time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#E23744] px-7 py-4 text-sm font-bold text-white hover:bg-[#c92734]"
              >
                Start ordering
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-white/50 px-7 py-4 text-sm font-bold text-white hover:bg-white hover:text-[#191919]"
              >
                Explore features
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-14">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            {
              icon: BiSearch,
              title: "Nearby restaurant search",
              copy: "Find open restaurants using your location and search by name.",
            },
            {
              icon: BiShieldQuarter,
              title: "Stripe test checkout",
              copy: "Create orders and confirm payment using a secure checkout flow.",
            },
            {
              icon: BiCycling,
              title: "Realtime delivery flow",
              copy: "Socket updates connect restaurants, riders, and customers.",
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <Icon className="h-8 w-8 text-[#E23744]" />
                <h2 className="mt-4 text-lg font-bold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {feature.copy}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#f8f6f3] px-5 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase text-[#E23744]">
              Built for the whole order journey
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">
              From menu discovery to rider handoff.
            </h2>
            <div className="mt-7 grid gap-4">
              {journeyItems.map(([ItemIcon, text]) => {
                return (
                  <div key={text} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#E23744] shadow-sm">
                      <ItemIcon className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-gray-800">{text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {foodImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt="Restaurant food preview"
                className={`h-72 w-full rounded-lg object-cover shadow-sm ${
                  index === 1 ? "mt-10" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
