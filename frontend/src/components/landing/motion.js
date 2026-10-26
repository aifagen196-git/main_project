import { useState, useEffect, useRef } from "react";

import { prefersReducedMotion } from "./theme";

// Eased 0→1 ramp that drives the match rings filling on first paint.
export function useRamp(duration = 1050) {
  const [t, setT] = useState(prefersReducedMotion() ? 1 : 0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // rAF is throttled to zero in a backgrounded or non-compositing tab, which
    // would otherwise leave every ring drawn at 0. Land on the final value
    // regardless once the ramp should have finished.
    const settle = setTimeout(() => setT(1), duration + 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [duration]);
  return t;
}

// Fraction of the page scrolled, for the progress bar pinned to the viewport top.
export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

// Staggers a container's direct children in as it enters the viewport.
// "flip" swings cards around their Y axis; "stagger" is a softer pop.
export function useRevealChildren(mode = "stagger") {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const kids = Array.from(el.children);
    kids.forEach((k) => {
      k.style.opacity = "0";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          kids.forEach((k, i) => {
            k.style.animation =
              mode === "flip"
                ? `cardFlip .7s cubic-bezier(.2,.7,.2,1) ${i * 110}ms both`
                : `pop .6s cubic-bezier(.2,.7,.2,1) ${i * 90}ms both`;
          });
          io.unobserve(e.target);
        });
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);
  return ref;
}
