import { Link } from "react-router-dom";
import { Code2 } from "lucide-react";

export default function Logo({ to = "/", showText = true, size = "md" }) {
  const iconSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const textSize = size === "sm" ? "text-lg" : "text-xl";

  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <div
        className={`${iconSize} rounded-lg bg-ll-accent flex items-center justify-center shadow-lg shadow-ll-accent/20`}
      >
        <Code2 className="w-4 h-4 text-ll-bg" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={`${textSize} font-bold tracking-tight`}>
          Leet<span className="text-ll-accent">Lab</span>
        </span>
      )}
    </Link>
  );
}
