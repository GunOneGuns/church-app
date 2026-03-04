import {
  clampDateKey,
  diffDateKeysInDaysInclusive,
  toDateKey,
} from "./dateKeys";

export default function computeCalendarPillLayout({
  calendarCells,
  calendarRange,
  calendarDateKeyToIndex,
  eventsByDate,
  fallbackColor,
  maxVisibleEvents,
}) {
  if (!calendarRange) return { segments: [], hiddenCountByDateKey: {} };
  const { startKey: gridStartKey, endKey: gridEndKey } = calendarRange;

  const uniqueEventsById = new Map();
  Object.values(eventsByDate || {}).forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach((eventItem) => {
      if (!eventItem?.id) return;
      if (!uniqueEventsById.has(eventItem.id)) {
        uniqueEventsById.set(eventItem.id, eventItem);
      }
    });
  });

  const segments = [];
  const coveredByDateKey = new Map(); // dateKey -> Set(eventId)

  uniqueEventsById.forEach((eventItem) => {
    const startDateKey = String(eventItem.startDateKey || "");
    const endDateKey = String(eventItem.endDateKey || "");
    if (!startDateKey || !endDateKey) return;

    const overlapStartKey = clampDateKey(startDateKey, gridStartKey, gridEndKey);
    const overlapEndKey = clampDateKey(endDateKey, gridStartKey, gridEndKey);
    if (!overlapStartKey || !overlapEndKey) return;
    if (overlapStartKey > overlapEndKey) return;

    const startIndex = calendarDateKeyToIndex.get(overlapStartKey);
    const endIndex = calendarDateKeyToIndex.get(overlapEndKey);
    if (startIndex === undefined || endIndex === undefined) return;

    for (let idx = startIndex; idx <= endIndex; idx += 1) {
      const dayKey = toDateKey(calendarCells[idx].date);
      const set = coveredByDateKey.get(dayKey) || new Set();
      set.add(eventItem.id);
      coveredByDateKey.set(dayKey, set);
    }

    const durationDays = diffDateKeysInDaysInclusive(startDateKey, endDateKey);
    const rowStart = Math.floor(startIndex / 7);
    const rowEnd = Math.floor(endIndex / 7);

    for (let row = rowStart; row <= rowEnd; row += 1) {
      const rowFirstIndex = row * 7;
      const rowLastIndex = rowFirstIndex + 6;
      const segStartIndex = row === rowStart ? startIndex : rowFirstIndex;
      const segEndIndex = row === rowEnd ? endIndex : rowLastIndex;
      const colStart = segStartIndex % 7;
      const colEnd = segEndIndex % 7;
      const colSpan = segEndIndex - segStartIndex + 1;
      segments.push({
        key: `${eventItem.id}-${row}-${segStartIndex}`,
        id: eventItem.id,
        title: eventItem.title || "",
        color: eventItem.color || fallbackColor,
        startTime: eventItem.startTime || "",
        durationDays,
        row,
        colStart,
        colEnd,
        colSpan,
      });
    }
  });

  const segmentsByRow = new Map();
  segments.forEach((segment) => {
    const rowSegments = segmentsByRow.get(segment.row) || [];
    rowSegments.push(segment);
    segmentsByRow.set(segment.row, rowSegments);
  });

  const placed = [];
  const shownByDateKey = new Map(); // dateKey -> Set(eventId)

  segmentsByRow.forEach((rowSegments) => {
    rowSegments.sort((a, b) => {
      if (b.durationDays !== a.durationDays) return b.durationDays - a.durationDays;
      if (b.colSpan !== a.colSpan) return b.colSpan - a.colSpan;
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return String(a.title).localeCompare(String(b.title));
    });

    const laneEnds = Array.from({ length: maxVisibleEvents }, () => -1);
    rowSegments.forEach((segment) => {
      const lane = laneEnds.findIndex((end) => segment.colStart > end);
      if (lane === -1) return;
      laneEnds[lane] = segment.colEnd;
      placed.push({ ...segment, lane });

      for (let col = segment.colStart; col <= segment.colEnd; col += 1) {
        const cellIndex = segment.row * 7 + col;
        const dayKey = toDateKey(calendarCells[cellIndex].date);
        const set = shownByDateKey.get(dayKey) || new Set();
        set.add(segment.id);
        shownByDateKey.set(dayKey, set);
      }
    });
  });

  const hiddenCountByDateKey = {};
  coveredByDateKey.forEach((coveredSet, dateKey) => {
    const shownSet = shownByDateKey.get(dateKey);
    const shownCount = shownSet ? shownSet.size : 0;
    const hiddenCount = Math.max(0, coveredSet.size - shownCount);
    if (hiddenCount > 0) hiddenCountByDateKey[dateKey] = hiddenCount;
  });

  return { segments: placed, hiddenCountByDateKey };
}

