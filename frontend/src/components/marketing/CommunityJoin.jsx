import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import { getCommunityLink } from "../../services/community";

const buttonStyle = (brand) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  marginTop: 26,
  background: brand,
  border: 0,
  borderRadius: 13,
  padding: "16px 28px",
  fontSize: 15,
  fontWeight: 700,
  color: "#fff",
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px -12px rgba(109,74,255,.45)",
  transition: "transform .18s,box-shadow .18s",
});

/* Join button for the landing page's community section. The community is
   free: the button opens the WhatsApp invite link in a new tab. */
export default function CommunityJoin({ brand, faint }) {
  const [link, setLink] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let live = true;
    getCommunityLink()
      .then((url) => live && setLink(url))
      .catch(() => live && setUnavailable(true));
    return () => {
      live = false;
    };
  }, []);

  const note = { marginTop: 12, fontSize: 12.5, color: faint };

  if (unavailable) {
    return (
      <>
        <span style={{ ...buttonStyle(brand), opacity: 0.6, cursor: "default" }}>
          <MessageSquare size={18} />
          Join Our Community
        </span>
        <div style={note}>The community link isn't available right now. Please check back soon.</div>
      </>
    );
  }

  return (
    <>
      <a
        href={link || undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!link}
        onClick={(e) => {
          if (!link) e.preventDefault();
        }}
        style={{ ...buttonStyle(brand), opacity: link ? 1 : 0.75 }}
        className="v3-join-cta"
      >
        <MessageSquare size={18} />
        Join Our Community
      </a>
      <div style={note}>Free to join on WhatsApp. No spam, ever.</div>
    </>
  );
}
