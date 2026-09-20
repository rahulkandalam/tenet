/** Milliseconds a time zone is ahead of UTC at a given instant. */
function tzOffsetMs(tz: string, at: Date) {
  const inTz = new Date(at.toLocaleString("en-US", { timeZone: tz }));
  const inUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return inTz.getTime() - inUtc.getTime();
}

/** Midnight `daysBack` days ago in the given time zone, as a UTC Date. */
export function zonedMidnight(tz: string, daysBack = 0) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d - daysBack));
  return new Date(guess.getTime() - tzOffsetMs(tz, guess));
}

export function formatWhen(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
}
