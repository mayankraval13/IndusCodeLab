import { useMemo, useState } from "react";

const LEVEL_CLASSES = [
  "bg-ll-surface-2",
  "bg-ll-success/30",
  "bg-ll-success/55",
  "bg-ll-success/80",
  "bg-ll-success",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** YYYY-MM-DD to a local Date, sidestepping the UTC parse of the ISO form. */
const parseDay = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const intensity = (count, max) => {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  // Quartiles of the busiest day, so a light user still sees contrast.
  return Math.min(4, Math.ceil((count / max) * 4));
};

/**
 * GitHub/LeetCode-style contribution grid. `data` is oldest-first
 * `{ date, count }` with no gaps, exactly as the dashboard endpoint returns it.
 */
export default function ActivityHeatmap({ data, weeks = 26 }) {
  const [hovered, setHovered] = useState(null);

  const { columns, max, total } = useMemo(() => {
    const trimmed = data.slice(-(weeks * 7));

    // Pad the first column so rows line up with real weekdays.
    const leading = trimmed.length ? parseDay(trimmed[0].date).getDay() : 0;
    const cells = [...Array.from({ length: leading }, () => null), ...trimmed];

    const grouped = [];
    for (let i = 0; i < cells.length; i += 7) {
      grouped.push(cells.slice(i, i + 7));
    }

    return {
      columns: grouped,
      max: Math.max(1, ...trimmed.map((day) => day.count)),
      total: trimmed.reduce((sum, day) => sum + day.count, 0),
    };
  }, [data, weeks]);

  // A label above the first column of each new month.
  const monthLabels = columns.map((column, index) => {
    const first = column.find(Boolean);
    if (!first) return null;

    const date = parseDay(first.date);
    const previous = columns[index - 1]?.find(Boolean);
    const previousMonth = previous ? parseDay(previous.date).getMonth() : null;

    return date.getMonth() === previousMonth ? null : MONTHS[date.getMonth()];
  });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <p className="text-sm text-ll-muted">
          {hovered ? (
            <span className="text-ll-text">
              <span className="font-semibold">
                {hovered.count === 0 ? "No" : hovered.count}
              </span>{" "}
              {hovered.count === 1 ? "submission" : "submissions"} on{" "}
              {parseDay(hovered.date).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : (
            <>
              <span className="text-ll-text font-semibold">{total}</span>{" "}
              submissions in the last {weeks} weeks
            </>
          )}
        </p>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-ll-muted shrink-0">
          <span>Less</span>
          {LEVEL_CLASSES.map((className, level) => (
            <span
              key={level}
              className={`w-2.5 h-2.5 rounded-[3px] ${className}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1 min-w-full">
          <div className="flex gap-[3px]">
            {monthLabels.map((label, index) => (
              <div
                key={index}
                className="w-[11px] text-[10px] text-ll-muted whitespace-nowrap"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, rowIndex) => {
                  const day = column[rowIndex];

                  if (!day) {
                    return <div key={rowIndex} className="w-[11px] h-[11px]" />;
                  }

                  const level = intensity(day.count, max);
                  const isHovered = hovered?.date === day.date;

                  return (
                    <div
                      key={rowIndex}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      className={`w-[11px] h-[11px] rounded-[3px] transition-shadow ${
                        LEVEL_CLASSES[level]
                      } ${isHovered ? "ring-1 ring-ll-text" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
