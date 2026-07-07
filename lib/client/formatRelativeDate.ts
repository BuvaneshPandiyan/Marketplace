// Define and export a function that converts an ISO timestamp into a friendly relative string
export function formatRelativeDate(isoTimestamp: string): string {
  // Parse the ISO string into a real Date object
  const then = new Date(isoTimestamp);
  // Get the current moment as a Date object
  const now = new Date();
  // Compute how many seconds have passed between then and now
  const secondsAgo = Math.floor((now.getTime() - then.getTime()) / 1000);

  // If it's been less than a minute, just say "Just now"
  if (secondsAgo < 60) {
    return "Just now";
  }
  // Compute how many whole minutes have passed
  const minutesAgo = Math.floor(secondsAgo / 60);
  // If it's been less than an hour, show minutes
  if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`;
  }
  // Compute how many whole hours have passed
  const hoursAgo = Math.floor(minutesAgo / 60);
  // If it's been less than a day, show hours
  if (hoursAgo < 24) {
    return `${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`;
  }
  // Compute how many whole days have passed
  const daysAgo = Math.floor(hoursAgo / 24);
  // If it's been less than a week, show days
  if (daysAgo < 7) {
    return `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  }
  // Compute how many whole weeks have passed
  const weeksAgo = Math.floor(daysAgo / 7);
  // If it's been less than a month-ish, show weeks
  if (weeksAgo < 5) {
    return `${weeksAgo} week${weeksAgo === 1 ? "" : "s"} ago`;
  }
  // Compute how many whole months have passed (approximated as 30-day chunks)
  const monthsAgo = Math.floor(daysAgo / 30);
  // If it's been less than a year, show months
  if (monthsAgo < 12) {
    return `${monthsAgo} month${monthsAgo === 1 ? "" : "s"} ago`;
  }
  // Otherwise, fall back to showing whole years
  const yearsAgo = Math.floor(monthsAgo / 12);
  return `${yearsAgo} year${yearsAgo === 1 ? "" : "s"} ago`;
}
