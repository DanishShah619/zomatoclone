import type { IconType } from "react-icons";
import { BiChevronRight } from "react-icons/bi";
import { cn } from "../../lib/utils";

export interface ServiceCardItem {
  number: string;
  title: string;
  description: string;
  icon: IconType;
  gradient: string;
  onClick: () => void;
}

interface ServiceCardsProps {
  items: ServiceCardItem[];
  className?: string;
}

export function ServiceCards({ items, className }: ServiceCardsProps) {
  return (
    <section className={cn("grid gap-4 md:grid-cols-3", className)}>
      {items.map((item) => (
        <button
          key={item.title}
          type="button"
          onClick={item.onClick}
          className={cn(
            "group relative flex min-h-[280px] w-full flex-col justify-between overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br p-7 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e23744]/30",
            item.gradient
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.82),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div className="flex items-start justify-between">
            <span className="font-mono text-sm font-medium text-gray-400">
              ( {item.number} )
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-sm transition group-hover:scale-105">
              <item.icon className="h-5 w-5" />
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-gray-950">
                {item.title}
              </h2>
              <BiChevronRight className="h-5 w-5 shrink-0 text-gray-500 transition group-hover:translate-x-1 group-hover:text-[#e23744]" />
            </div>
            <p className="text-sm leading-6 text-gray-600">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </section>
  );
}
