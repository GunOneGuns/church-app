import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchEvents } from "services/convo-broker";
import buildCalendarCells from "../utils/buildCalendarCells";
import computeCalendarPillLayout from "../utils/computeCalendarPillLayout";
import { startOfMonth, toDateKey, toMonthKey } from "../utils/dateKeys";
import { MAX_VISIBLE_EVENTS } from "../events.constants";

export default function useEventsMonthData({ fallbackColor, t, onError }) {
  const requestAbortController = useRef(null);

  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const abortInFlight = useCallback(() => {
    requestAbortController.current?.abort?.();
  }, []);

  const fetchMonth = useCallback(
    (date) => {
      const controller = new AbortController();
      setIsLoading(true);

      fetchEvents({ month: toMonthKey(date), signal: controller.signal })
        .then((payload) => {
          setEventsByDate(payload?.eventsByDate || {});
          setIsLoading(false);
          setIsInitialLoad(false);
        })
        .catch((error) => {
          if (error?.name === "AbortError") return;
          setIsLoading(false);
          setIsInitialLoad(false);
          onError?.(error);
        });

      requestAbortController.current = controller;
      return controller;
    },
    [onError],
  );

  useEffect(() => {
    fetchMonth(monthDate);
    return () => requestAbortController.current?.abort();
  }, [fetchMonth, monthDate]);

  const setActiveMonth = useCallback((nextMonth, nextSelectedDate = nextMonth) => {
    abortInFlight();
    setEventsByDate({});
    setMonthDate(nextMonth);
    setSelectedKey(toDateKey(nextSelectedDate));
  }, [abortInFlight]);

  const calendarCells = useMemo(() => buildCalendarCells(monthDate), [monthDate]);

  const calendarRange = useMemo(() => {
    if (!calendarCells.length) return null;
    return {
      startKey: toDateKey(calendarCells[0].date),
      endKey: toDateKey(calendarCells[calendarCells.length - 1].date),
    };
  }, [calendarCells]);

  const calendarDateKeyToIndex = useMemo(() => {
    const map = new Map();
    calendarCells.forEach((cell, idx) => {
      map.set(toDateKey(cell.date), idx);
    });
    return map;
  }, [calendarCells]);

  const calendarPillLayout = useMemo(() => {
    return computeCalendarPillLayout({
      calendarCells,
      calendarRange,
      calendarDateKeyToIndex,
      eventsByDate,
      fallbackColor,
      maxVisibleEvents: MAX_VISIBLE_EVENTS,
    });
  }, [calendarCells, calendarRange, calendarDateKeyToIndex, eventsByDate, fallbackColor]);

  const calendarRowCount = useMemo(
    () => Math.max(1, Math.ceil(calendarCells.length / 7)),
    [calendarCells.length],
  );

  const lastRowStartIndex = useMemo(
    () => (calendarRowCount - 1) * 7,
    [calendarRowCount],
  );

  const monthLabel = useMemo(
    () =>
      t(
        `months.${monthDate.getMonth()}`,
        monthDate.toLocaleString(undefined, { month: "long" }),
      ),
    [monthDate, t],
  );

  const yearLabel = useMemo(() => String(monthDate.getFullYear() || ""), [monthDate]);

  const weekdayLabels = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  return {
    monthDate,
    selectedKey,
    setSelectedKey,
    eventsByDate,
    isLoading,
    isInitialLoad,
    fetchMonth,
    abortInFlight,
    setActiveMonth,
    calendarCells,
    calendarPillLayout,
    calendarRowCount,
    lastRowStartIndex,
    monthLabel,
    yearLabel,
    weekdayLabels,
  };
}
