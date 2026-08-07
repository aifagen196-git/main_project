export default function Ring({
  value,
  size = 120,
  stroke = 12,
  color = "#6d4aff",
  label,
  sub,
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: "rotate(-90deg)",
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eceaf6"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1s ease",
          }}
        />
      </svg>

      <div className="absolute flex flex-col items-center leading-none">
        <span
          className="num font-extrabold text-slate-900"
          style={{
            fontSize: size * 0.26,
          }}
        >
          {label ?? value}
        </span>

        {sub && (
          <span
            className="text-slate-400 mt-1"
            style={{
              fontSize: size * 0.11,
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}