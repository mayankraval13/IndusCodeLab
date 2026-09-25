/** Small completion ring — used for per-section progress on the faculty view. */
export default function ProgressRing({
  value,
  size = 56,
  thickness = 5,
  color = "var(--color-ll-accent)",
  label,
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="relative shrink-0 grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ll-surface-2)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <span className="absolute text-xs font-semibold tabular-nums">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
