import { useState } from "react";

const parseDay = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Daily submission volume. Bars are divs rather than an SVG so they stretch to
 * whatever width the panel gets without a viewBox recalculation.
 */
export default function ActivityBars({ data, height = 88 }) {
  const [hovered, setHovered] = useState(null);

  const max = Math.max(1, ...data.map((day) => day.count));
  const total = data.reduce((sum, day) => sum + day.count, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <p className="text-sm text-ll-muted">
          {hovered ? (
            <span className="text-ll-text">
              <span className="font-semibold">{hovered.count}</span> on{" "}
              {parseDay(hovered.date).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </span>
          ) : (
            <>
              <span className="text-ll-text font-semibold">{total}</span>{" "}
              submissions in {data.length} days
            </>
          )}
        </p>
        <span className="text-xs text-ll-muted shrink-0">peak {max}</span>
      </div>

      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((day) => (
          <div
            key={day.date}
            onMouseEnter={() => setHovered(day)}
            onMouseLeave={() => setHovered(null)}
            className="flex-1 flex items-end min-w-[3px] h-full group"
          >
            <div
              className={`w-full rounded-sm transition-colors ${
                hovered?.date === day.date
                  ? "bg-ll-accent"
                  : day.count === 0
                    ? "bg-ll-surface-2"
                    : "bg-ll-accent/45 group-hover:bg-ll-accent"
              }`}
              // A floor keeps empty days visible as a baseline tick.
              style={{
                height: `${Math.max(3, (day.count / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
