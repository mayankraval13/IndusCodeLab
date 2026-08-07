const styles = {
  EASY: "text-ll-easy bg-ll-easy/10 border-ll-easy/30",
  MEDIUM: "text-ll-medium bg-ll-medium/10 border-ll-medium/30",
  HARD: "text-ll-hard bg-ll-hard/10 border-ll-hard/30",
};

const labels = {
  EASY: "Easy",
  MEDIUM: "Med.",
  HARD: "Hard",
};

export default function DifficultyBadge({ difficulty, className = "" }) {
  const key = difficulty?.toUpperCase();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[key] ?? ""} ${className}`}
    >
      {labels[key] ?? difficulty}
    </span>
  );
}
