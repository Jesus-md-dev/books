// Formats the "fecha_reunion" value built by scripts/currentBookInfo.js:
// "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"; anything else is shown as written.
export function formatMeetingDate(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!match) return text;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const day = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
  const label = day.charAt(0).toUpperCase() + day.slice(1);
  return match[4] ? `${label}, ${match[4]}:${match[5]} h` : label;
}
