// Helper utilities for Philippine Standard Time (PST / PHT, UTC+8) calculations and formatting

export function getPhilippineDateParts(date: Date | string | number = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(validDate);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  return {
    year: parseInt(partMap.year, 10),
    month: parseInt(partMap.month, 10), // 1-12
    day: parseInt(partMap.day, 10),
    hour: parseInt(partMap.hour, 10) % 24,
    minute: parseInt(partMap.minute, 10),
    second: parseInt(partMap.second, 10),
  };
}

/**
 * Returns current date/time or formatted date as YYYY-MM-DD in Philippine Standard Time
 */
export function getPhilippineYMD(date: Date | string | number = new Date()): string {
  const { year, month, day } = getPhilippineDateParts(date);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Returns a normalized Date object representing midnight (00:00:00) on the PST calendar day.
 * Ideal for calculating elapsed days and months consistently regardless of user's browser timezone.
 */
export function getPhilippineMidnightDate(date: Date | string | number = new Date()): Date {
  const { year, month, day } = getPhilippineDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns current timestamp in PST
 */
export function getPhilippineNow(): Date {
  return new Date();
}

/**
 * Format a date as "MMM D, YYYY" (e.g., "Aug 9, 2026") in Philippine Standard Time
 */
export function formatPHTDate(date: Date | string | number): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date and time in Philippine Standard Time (e.g., "Aug 9, 2026, 08:30 AM")
 */
export function formatPHTDateTime(date: Date | string | number): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
