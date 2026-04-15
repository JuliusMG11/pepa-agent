/**
 * Computes the next scheduled run time for a daily monitoring job.
 * Returns today at runHour:00 if that time hasn't passed yet,
 * otherwise tomorrow at runHour:00.
 */
export function computeNextRunAt(runHour: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(runHour, 0, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}
