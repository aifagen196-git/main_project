import { api } from "./api";

/**
 * The WhatsApp community's invite link. The community is free; the link comes
 * from the server (COMMUNITY_WHATSAPP_URL) so it can change without a rebuild.
 */
export async function getCommunityLink() {
  const { link } = await api.get("/api/community");
  return link;
}
