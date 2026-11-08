/**
 * Formats a Date object to the Xochat design format:
 * Time: "10.28 A.M." / "3.15 P.M."
 * Date: "28th OCT 2026"
 * DateStr: "10.28.2026"
 */

export function formatChatTime(date: Date = new Date()): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
  const formattedHour = hours % 12 || 12;
  return `${formattedHour}.${minutes} ${ampm}`;
}

export function formatChatDate(date: Date = new Date()): string {
  const day = date.getDate();
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  const month = monthNames[date.getMonth()];
  return `${dayStr}${suffix} ${month} ${date.getFullYear()}`;
}

export function formatChatDateStr(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}.${dd}.${yyyy}`;
}

export function formatMessageTime(timeFormatted?: string, timestamp?: string): string {
  if (timeFormatted && timeFormatted.trim()) {
    return timeFormatted;
  }
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return formatChatTime(d);
    }
  }
  return formatChatTime(new Date());
}

export function formatMessageDate(dateFormatted?: string, timestamp?: string): string {
  if (dateFormatted && dateFormatted.trim()) {
    // If it is single digit day like "1st NOV 2026", standardize to "01st NOV 2026"
    const match = dateFormatted.trim().match(/^(\d)(st|nd|rd|th)\s+([A-Za-z]+)\s+(\d{4})$/);
    if (match) {
      return `0${match[1]}${match[2]} ${match[3].toUpperCase()} ${match[4]}`;
    }
    return dateFormatted;
  }
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return formatChatDate(d);
    }
  }
  return formatChatDate(new Date());
}
