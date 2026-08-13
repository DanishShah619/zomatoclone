import { useMemo, useState } from "react";
import { motion, type Transition } from "motion/react";
import { cn } from "../../lib/utils";

interface RandomLetterSwapProps {
  label: string;
  className?: string;
  staggerDuration?: number;
  transition?: Transition;
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function RandomLetterSwap({
  label,
  className,
  staggerDuration = 0.025,
  transition,
}: RandomLetterSwapProps) {
  const [hovered, setHovered] = useState(false);
  const chars = useMemo(() => label.split(""), [label]);
  const swapChars = useMemo(
    () =>
      chars.map((char, index) => {
        if (char === " ") return char;
        return letters[(char.charCodeAt(0) + index * 7) % letters.length];
      }),
    [chars]
  );

  return (
    <motion.span
      className={cn("inline-flex items-center", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      transition={transition}
    >
      {chars.map((char, index) => (
        <span
          key={`${label}-${index}`}
          className="relative inline-grid min-w-[0.58em] place-items-center overflow-hidden text-center"
        >
          <motion.span
            className="col-start-1 row-start-1"
            animate={
              hovered
                ? { opacity: [1, 0.2, 1], y: [0, -5, 0], rotateX: [0, 70, 0] }
                : { opacity: 1, y: 0, rotateX: 0 }
            }
            transition={{
              duration: 0.82,
              delay: index * staggerDuration,
              ease: [0.22, 1, 0.36, 1],
              ...transition,
            }}
          >
            {char === " " ? "\u00a0" : char}
          </motion.span>
          <motion.span
            aria-hidden="true"
            className="col-start-1 row-start-1 text-[#E23744]"
            animate={
              hovered
                ? {
                    opacity: [0, 0.9, 0],
                    y: [5, 0, -5],
                    rotateX: [-70, 0, 70],
                  }
                : { opacity: 0, y: 5, rotateX: -70 }
            }
            transition={{
              duration: 0.82,
              delay: index * staggerDuration,
              ease: [0.22, 1, 0.36, 1],
              ...transition,
            }}
          >
            {swapChars[index] === " " ? "\u00a0" : swapChars[index]}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
