import { Link } from "react-router-dom";

export default function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = "text-ll-accent",
  accentBg = "bg-ll-accent/15",
  to,
}) {
  const body = (
    <div
      className={`ll-panel rounded-xl p-4 sm:p-5 h-full transition-colors ${
        to ? "hover:border-ll-border-light" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ll-muted font-medium">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-ll-muted mt-1.5 truncate">{hint}</p>
          )}
        </div>

        {Icon && (
          <div
            className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${accentBg} ${accent}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
