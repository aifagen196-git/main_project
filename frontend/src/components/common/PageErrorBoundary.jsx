import { Component } from "react";

/* Catches a crash inside one page so the rest of the app (sidebar, other
 * pages) keeps working. Without it, any render error blanked the whole
 * screen — e.g. the Resume page going white after "Improve resume".
 * AppShell remounts it per route (key = path), so moving to another page
 * clears the error. */
export default class PageErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          margin: "40px auto",
          maxWidth: 460,
          textAlign: "center",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "36px 28px",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
          Something went wrong on this page
        </div>
        <p style={{ margin: "10px 0 20px", fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>
          The rest of AIFAGen still works. Try reloading; if it keeps happening, email
          info@aifagenlabs.com and tell us which page it was.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            background: "#6D4AFF",
            border: "none",
            borderRadius: 12,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Reload page
        </button>
      </div>
    );
  }
}
