/**
 * Returns a human-readable age string from an ISO birthday.
 * - < 4 weeks: "N weeks old"
 * - 4 weeks – 11 months: "N months old"
 * - ≥ 1 year: "N years old" (or "N years, M months")
 * Falls back to raw `age` string if no birthday.
 */
export function formatPetAge(birthday: string | undefined, ageFallback: string): string {
  if (!birthday) return ageFallback;
  const birth = new Date(birthday);
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays < 0) return ageFallback;
  const weeks = Math.floor(totalDays / 7);
  const months = Math.floor(totalDays / 30.4375);
  const years = Math.floor(totalDays / 365.25);
  if (weeks < 4) return weeks <= 1 ? '1 week old' : `${weeks} weeks old`;
  if (months < 12) return months === 1 ? '1 month old' : `${months} months old`;
  const remainingMonths = months - years * 12;
  if (remainingMonths === 0) return years === 1 ? '1 year old' : `${years} years old`;
  return `${years}y ${remainingMonths}mo old`;
}
