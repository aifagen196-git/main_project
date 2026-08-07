import { LOGOS } from "../../data/jobs";

export default function Logo({
  lg,
  size = "h-11 w-11",
  text = "text-base",
}) {
  const ch =
    lg === "Sp"
      ? "S"
      : lg === "Ca"
      ? "C"
      : lg === "Am"
      ? "A"
      : lg;

  return (
    <div
      className={
        "flex items-center justify-center rounded-xl font-bold text-white shrink-0 " +
        size +
        " " +
        text
      }
      style={{
        background: LOGOS[lg] || "#6d4aff",
      }}
    >
      {ch}
    </div>
  );
}