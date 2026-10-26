import { MessageSquare } from "lucide-react";
import { COMMUNITY_WHATSAPP_URL } from "../../data/site";

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

/* Join button for the landing page's community section: opens the WhatsApp
   invite link in a new tab. */
export default function CommunityJoin({ brand, faint }) {
  return (
    <>
      <a
        href={COMMUNITY_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={buttonStyle(brand)}
        className="v3-join-cta"
      >
        <MessageSquare size={18} />
        Join Our Community
      </a>
      <div style={{ marginTop: 12, fontSize: 12.5, color: faint }}>Free to join on WhatsApp. No spam, ever.</div>
    </>
  );
}
