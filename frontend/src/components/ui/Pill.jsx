export default function Pill({ children, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
        className
      }
    >
      {children}
    </span>
  );
}