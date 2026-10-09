// Sends a generic 500 for a failed database call and logs the real error on
// the server. Raw database messages name tables, columns and constraints —
// useful to an attacker, useless to a user.
export function dbError(res, error, message = "Something went wrong. Please try again.") {
  console.error("Database error:", error?.message || error);
  return res.status(500).json({ success: false, message });
}
