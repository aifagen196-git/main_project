import { api, apiUpload } from "./api";

// userId args are kept for call-site compatibility; the backend derives the
// user from the verified JWT.

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function getProfile() {
  const { profile } = await api.get("/api/profile");
  return profile;
}

export async function updateProfile(_userId, fields) {
  const { profile } = await api.patch("/api/profile", fields);
  return profile;
}

// Client-side pre-check for instant feedback; the backend re-validates.
export function validateAvatarFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Please upload a JPG, PNG or WEBP image.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Photos must be 5 MB or smaller.");
  }
}

export async function uploadAvatar(file) {
  validateAvatarFile(file);
  const form = new FormData();
  form.append("file", file);
  const { profile } = await apiUpload("/api/profile/avatar", form);
  return profile;
}

export async function removeAvatar() {
  const { profile } = await api.del("/api/profile/avatar");
  return profile;
}
