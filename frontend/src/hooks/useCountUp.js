import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up from 0 to `value` over `duration` ms.
 * Non-numeric values (e.g. "--", "High") are returned as-is, unanimated.
 * Respects prefers-reduced-motion by jumping straight to the final value.
 */
export default function useCountUp(value, duration = 900) {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  const isNumeric = Number.isFinite(numeric) && String(value).trim() === String(numeric);

  const [display, setDisplay] = useState(isNumeric ? 0 : value);
  const frameRef = useRef();

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setDisplay(numeric);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (numeric - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeric, isNumeric, duration]);

  return display;
}
