export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

/** `datetime-local` needs a local-time string with no timezone suffix. */
export const toDateTimeLocalValue = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const fromDateTimeLocalValue = (value) =>
  value ? new Date(value).toISOString() : null;

/** "in 3 days" / "2 days ago", for deadlines. */
export const relativeDeadline = (iso) => {
  if (!iso) return null;

  const diffMs = new Date(iso).getTime() - Date.now();
  const overdue = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60000);

  const describe = () => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  };

  return overdue ? `${describe()} overdue` : `due in ${describe()}`;
};
