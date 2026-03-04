function parseTimeToMinutes(value) {
  const [h, m] = String(value || "").split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export default function sortEventsByTime(events) {
  return [...(events || [])].sort((a, b) => {
    const aMinutes = a?.allDay ? -1 : parseTimeToMinutes(a?.startTime);
    const bMinutes = b?.allDay ? -1 : parseTimeToMinutes(b?.startTime);

    const aKey = aMinutes === null ? Number.POSITIVE_INFINITY : aMinutes;
    const bKey = bMinutes === null ? Number.POSITIVE_INFINITY : bMinutes;
    if (aKey !== bKey) return aKey - bKey;

    const titleDiff = String(a?.title || "").localeCompare(String(b?.title || ""));
    if (titleDiff) return titleDiff;

    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}
