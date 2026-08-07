export default function Card({
  children,
  className = "",
  hover = false,
  style,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={
        "rounded-2xl bg-white border border-slate-100 shadow-sm " +
        (hover ? "card cursor-pointer " : "") +
        className
      }
    >
      {children}
    </div>
  );
}
