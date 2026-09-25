/**
 * Activity maths for the dashboards: day bucketing, streaks and heatmap series.
 *
 * Everything works in the server's local timezone. That is a deliberate
 * simplification for a single-campus deployment — a student's "day" is the
 * college's day. A multi-timezone deployment would need the user's offset.
 */

/** Local calendar day as YYYY-MM-DD, avoiding the UTC shift of toISOString. */
export const dayKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

/** Counts per day, oldest first, with zero-filled gaps so the grid is dense. */
export const buildHeatmap = (dates, days = 365, now = new Date()) => {
  const counts = new Map();
  for (const date of dates) {
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series = [];
  const today = startOfDay(now);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey(addDays(today, -offset));
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return series;
};

/**
 * Current and longest run of consecutive active days.
 *
 * The current streak also counts a run that ended yesterday, so it does not
 * read as broken until a full day has been missed — otherwise everyone's streak
 * shows zero every morning until they solve something.
 */
export const computeStreaks = (dates, now = new Date()) => {
  const unique = [...new Set(dates.map((date) => dayKey(date)))].sort();

  if (unique.length === 0) {
    return { current: 0, longest: 0, lastActiveOn: null, activeDays: 0 };
  }

  const dayNumber = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  };

  let longest = 1;
  let run = 1;

  for (let i = 1; i < unique.length; i += 1) {
    if (dayNumber(unique[i]) - dayNumber(unique[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  const today = dayNumber(dayKey(now));
  const last = dayNumber(unique[unique.length - 1]);

  let current = 0;
  if (today - last <= 1) {
    current = 1;
    for (let i = unique.length - 1; i > 0; i -= 1) {
      if (dayNumber(unique[i]) - dayNumber(unique[i - 1]) === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return {
    current,
    longest,
    lastActiveOn: unique[unique.length - 1],
    activeDays: unique.length,
  };
};

/** Daily totals for the last `days` days, used by the admin activity chart. */
export const buildDailySeries = (dates, days = 30, now = new Date()) =>
  buildHeatmap(dates, days, now);
