export function matchHex(m) {
  return m >= 90
    ? "#16a34a"
    : m >= 80
    ? "#22c55e"
    : m >= 70
    ? "#f59e0b"
    : "#ef4444";
}