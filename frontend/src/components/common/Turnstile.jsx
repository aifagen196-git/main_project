import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Cloudflare Turnstile widget (the "are you human" check). Reports a token
// through onToken ("" when it expires or fails). A token works once, so the
// form calls ref.reset() after every submit to get a fresh one.
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => {
        loading = null;
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

const Turnstile = forwardRef(function Turnstile({ siteKey, action, onToken }, ref) {
  const box = useRef(null);
  const widget = useRef(null);
  const report = useRef(onToken);
  report.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      report.current("");
      if (widget.current != null) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    let gone = false;
    loadTurnstile()
      .then((ts) => {
        if (gone || !box.current) return;
        widget.current = ts.render(box.current, {
          sitekey: siteKey,
          action,
          theme: "auto",
          size: "flexible",
          callback: (token) => report.current(token),
          "expired-callback": () => report.current(""),
          "error-callback": () => report.current(""),
        });
      })
      .catch(() => report.current(""));
    return () => {
      gone = true;
      if (widget.current != null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  return <div ref={box} style={{ minHeight: 65 }} />;
});

export default Turnstile;
