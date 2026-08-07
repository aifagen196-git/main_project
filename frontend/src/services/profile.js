import { api } from "./api";

// userId args are kept for call-site compatibility; the backend derives the
// user from the verified JWT.

export async function getProfile() {
  const { profile } = await api.get("/api/profile");
  return profile;
}

export async function updateProfile(_userId, fields) {
  const { profile } = await api.patch("/api/profile", fields);
  return profile;
}
