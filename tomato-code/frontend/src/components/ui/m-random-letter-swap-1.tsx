import { RandomLetterSwap } from "./random-letter-swap";

const links = ["Home", "Best Deals", "My Orders", "My Account"];

export default function RandomLetterSwapNav() {
  return (
    <div className="flex min-h-50 items-center justify-center px-6">
      <nav className="flex items-center gap-8">
        {links.map((link) => (
          <RandomLetterSwap
            className="cursor-pointer font-medium text-sm text-gray-500 hover:text-gray-950"
            key={link}
            label={link}
            staggerDuration={0.025}
            transition={{ duration: 0.6, type: "spring" }}
          />
        ))}
      </nav>
    </div>
  );
}
