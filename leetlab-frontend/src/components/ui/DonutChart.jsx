import { useState } from "react";

/**
 * Hover-interactive donut. Segments are drawn as dashed circle strokes, which
 * keeps the whole thing to one SVG element per slice and avoids arc-path maths.
 *
 * `children` renders in the hole. It receives the hovered segment (or null) so
 * the caller decides what the centre says at rest versus on hover.
 */
export default function DonutChart({
  segments,
  size = 168,
  thickness = 12,
  children,
}) {
  const [hovered, setHovered] = useState(null);

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let consumed = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ll-surface-2)"
          strokeWidth={thickness}
        />

        {total > 0 &&
          segments.map((segment) => {
            const fraction = segment.value / total;
            const length = fraction * circumference;
            const offset = consumed;
            consumed += length;

            if (segment.value === 0) return null;

            const isDimmed = hovered && hovered.label !== segment.label;

            return (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={hovered?.label === segment.label ? thickness + 4 : thickness}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
                strokeDashoffset={-offset}
                opacity={isDimmed ? 0.25 : 1}
                onMouseEnter={() => setHovered(segment)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-default transition-all duration-200"
              />
            );
          })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {children?.(hovered)}
      </div>
    </div>
  );
}
