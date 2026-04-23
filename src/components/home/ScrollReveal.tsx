"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Extra delay in ms before the transition fires after entering the viewport */
  delay?: number;
}

/**
 * Wraps children in a div that fades + slides up when it enters the viewport.
 * Starts visible on the server (no layout shift), hides only after hydration,
 * then reveals on intersection.
 */
export function ScrollReveal({ children, className = "", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    // If the element is already in the viewport on mount, reveal immediately.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 40) {
      setTimeout(() => setVisible(true), delay);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={
        mounted
          ? {
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(26px)",
              transition: `opacity 0.65s ease, transform 0.65s ease`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
