import { addDays, startOfMonth } from "./dateKeys";

export default function buildCalendarCells(monthDate) {
  const first = startOfMonth(monthDate);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startDate = addDays(first, -first.getDay());
  const endDate = addDays(last, 6 - last.getDay());

  const cells = [];
  for (
    let cursor = startDate;
    cursor.getTime() <= endDate.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const date = cursor;
    const isInMonth =
      date.getFullYear() === monthDate.getFullYear() &&
      date.getMonth() === monthDate.getMonth();
    const dayNum = date.getDate();
    cells.push({ index: cells.length, dayNum, isInMonth, date });
  }
  return cells;
}

