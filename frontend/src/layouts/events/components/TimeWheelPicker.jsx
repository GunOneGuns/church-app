import { useCallback, useEffect, useMemo, useRef } from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import {
  TIME_PICKER_ITEM_HEIGHT,
  TIME_PICKER_PANEL_HEIGHT,
  TIME_WHEEL_REPEAT,
} from "../events.constants";

const pad2 = (value) => String(value).padStart(2, "0");

const parseTimeValue = (timeValue) => {
  const [h, m] = String(timeValue || "").split(":");
  const hour = Number.isFinite(Number(h))
    ? Math.max(0, Math.min(23, Number(h)))
    : 0;
  const minute = Number.isFinite(Number(m))
    ? Math.max(0, Math.min(59, Number(m)))
    : 0;
  return { hour, minute };
};

export default function TimeWheelPicker({
  openFor,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
}) {
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const timeScrollRafRef = useRef(null);
  const timeScrollEndTimeoutRef = useRef(null);
  const isRecenteringWheelRef = useRef(false);
  const lastTimeScrollTargetRef = useRef(null);

  const hourWheelItems = useMemo(
    () => Array.from({ length: 24 * TIME_WHEEL_REPEAT }, (_, idx) => idx % 24),
    [],
  );

  const minuteWheelItems = useMemo(
    () => Array.from({ length: 60 * TIME_WHEEL_REPEAT }, (_, idx) => idx % 60),
    [],
  );

  const scrollToTimeValue = useCallback((hour, minute) => {
    const hourEl = hourScrollRef.current;
    const minuteEl = minuteScrollRef.current;
    const centerCycle = Math.floor(TIME_WHEEL_REPEAT / 2);
    if (hourEl) {
      hourEl.scrollTop = (centerCycle * 24 + hour) * TIME_PICKER_ITEM_HEIGHT;
    }
    if (minuteEl) {
      minuteEl.scrollTop =
        (centerCycle * 60 + minute) * TIME_PICKER_ITEM_HEIGHT;
    }
  }, []);

  useEffect(() => {
    if (!openFor) {
      lastTimeScrollTargetRef.current = null;
      return undefined;
    }
    if (lastTimeScrollTargetRef.current === openFor) return undefined;
    lastTimeScrollTargetRef.current = openFor;

    const { hour, minute } = parseTimeValue(openFor === "end" ? endTime : startTime);
    const id = requestAnimationFrame(() => scrollToTimeValue(hour, minute));
    return () => cancelAnimationFrame(id);
  }, [openFor, endTime, startTime, scrollToTimeValue]);

  const recenterWheelIfNeeded = useCallback((el, rangeSize) => {
    if (!el) return;
    const cycleSizePx = rangeSize * TIME_PICKER_ITEM_HEIGHT;
    const centerCycle = Math.floor(TIME_WHEEL_REPEAT / 2);
    const currentIndex = Math.round(el.scrollTop / TIME_PICKER_ITEM_HEIGHT);
    const currentCycle = Math.floor(currentIndex / rangeSize);

    if (currentCycle <= 1) {
      el.scrollTop = el.scrollTop + (centerCycle - currentCycle) * cycleSizePx;
      return;
    }
    if (currentCycle >= TIME_WHEEL_REPEAT - 2) {
      el.scrollTop = el.scrollTop - (currentCycle - centerCycle) * cycleSizePx;
    }
  }, []);

  const updateTimeFromScroll = useCallback(() => {
    const target = openFor;
    if (!target) return;
    const hourEl = hourScrollRef.current;
    const minuteEl = minuteScrollRef.current;
    if (!hourEl || !minuteEl) return;
    const hourIndex = Math.round(hourEl.scrollTop / TIME_PICKER_ITEM_HEIGHT);
    const minuteIndex = Math.round(
      minuteEl.scrollTop / TIME_PICKER_ITEM_HEIGHT,
    );
    const hour = ((hourIndex % 24) + 24) % 24;
    const minute = ((minuteIndex % 60) + 60) % 60;
    const nextTime = `${pad2(hour)}:${pad2(minute)}`;
    if (target === "end") {
      setEndTime((prev) => (prev === nextTime ? prev : nextTime));
    } else {
      setStartTime((prev) => (prev === nextTime ? prev : nextTime));
    }
  }, [openFor, setEndTime, setStartTime]);

  const scheduleWheelRecenter = useCallback(() => {
    if (timeScrollEndTimeoutRef.current) {
      clearTimeout(timeScrollEndTimeoutRef.current);
    }
    timeScrollEndTimeoutRef.current = setTimeout(() => {
      const hourEl = hourScrollRef.current;
      const minuteEl = minuteScrollRef.current;
      if (!hourEl || !minuteEl) return;
      isRecenteringWheelRef.current = true;
      recenterWheelIfNeeded(hourEl, 24);
      recenterWheelIfNeeded(minuteEl, 60);
      requestAnimationFrame(() => {
        updateTimeFromScroll();
        isRecenteringWheelRef.current = false;
      });
    }, 140);
  }, [recenterWheelIfNeeded, updateTimeFromScroll]);

  const handleTimeScroll = useCallback(() => {
    if (isRecenteringWheelRef.current) return;
    const hourEl = hourScrollRef.current;
    const minuteEl = minuteScrollRef.current;
    if (hourEl && minuteEl) {
      isRecenteringWheelRef.current = true;
      recenterWheelIfNeeded(hourEl, 24);
      recenterWheelIfNeeded(minuteEl, 60);
      isRecenteringWheelRef.current = false;
    }
    if (timeScrollRafRef.current)
      cancelAnimationFrame(timeScrollRafRef.current);
    timeScrollRafRef.current = requestAnimationFrame(updateTimeFromScroll);
    scheduleWheelRecenter();
  }, [updateTimeFromScroll, scheduleWheelRecenter, recenterWheelIfNeeded]);

  useEffect(
    () => () => {
      if (timeScrollRafRef.current) cancelAnimationFrame(timeScrollRafRef.current);
      if (timeScrollEndTimeoutRef.current)
        clearTimeout(timeScrollEndTimeoutRef.current);
    },
    [],
  );

  const readWheelValue = useCallback((el, rangeSize) => {
    if (!el) return 0;
    const index = Math.round(el.scrollTop / TIME_PICKER_ITEM_HEIGHT);
    return ((index % rangeSize) + rangeSize) % rangeSize;
  }, []);

  const readWheelTime = useCallback(() => {
    const hourEl = hourScrollRef.current;
    const minuteEl = minuteScrollRef.current;
    if (hourEl && minuteEl) {
      return {
        hour: readWheelValue(hourEl, 24),
        minute: readWheelValue(minuteEl, 60),
      };
    }
    return parseTimeValue(openFor === "end" ? endTime : startTime);
  }, [endTime, startTime, openFor, readWheelValue]);

  const handleHourItemClick = useCallback(
    (hour) => {
      if (!openFor) return;
      const { minute } = readWheelTime();
      scrollToTimeValue(hour, minute);
      requestAnimationFrame(updateTimeFromScroll);
      scheduleWheelRecenter();
    },
    [
      openFor,
      readWheelTime,
      scrollToTimeValue,
      scheduleWheelRecenter,
      updateTimeFromScroll,
    ],
  );

  const handleMinuteItemClick = useCallback(
    (minute) => {
      if (!openFor) return;
      const { hour } = readWheelTime();
      scrollToTimeValue(hour, minute);
      requestAnimationFrame(updateTimeFromScroll);
      scheduleWheelRecenter();
    },
    [
      openFor,
      readWheelTime,
      scrollToTimeValue,
      scheduleWheelRecenter,
      updateTimeFromScroll,
    ],
  );

  return (
    <MDBox sx={{ px: 2, pb: 1.25 }}>
      <MDBox
        sx={{
          position: "relative",
          height: TIME_PICKER_PANEL_HEIGHT,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <MDBox
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "99%",
            height: TIME_PICKER_ITEM_HEIGHT,
            borderRadius: 2,
            bgcolor: "rgba(0,0,0,0.06)",
            pointerEvents: "none",
          }}
        />

        <MDBox
          ref={hourScrollRef}
          onScroll={handleTimeScroll}
          sx={{
            width: 76,
            height: "100%",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            py: `${(TIME_PICKER_PANEL_HEIGHT - TIME_PICKER_ITEM_HEIGHT) / 2}px`,
            scrollbarWidth: "none",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            maskImage:
              "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {hourWheelItems.map((h, idx) => {
            return (
              <MDBox
                key={`h-${idx}`}
                onClick={() => handleHourItemClick(h)}
                sx={{
                  height: TIME_PICKER_ITEM_HEIGHT,
                  scrollSnapAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <MDTypography variant="h6" fontWeight="medium" sx={{ opacity: 0.9 }}>
                  {pad2(h)}
                </MDTypography>
              </MDBox>
            );
          })}
        </MDBox>

        <MDBox
          ref={minuteScrollRef}
          onScroll={handleTimeScroll}
          sx={{
            width: 76,
            height: "100%",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            py: `${(TIME_PICKER_PANEL_HEIGHT - TIME_PICKER_ITEM_HEIGHT) / 2}px`,
            scrollbarWidth: "none",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            maskImage:
              "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {minuteWheelItems.map((m, idx) => {
            return (
              <MDBox
                key={`m-${idx}`}
                onClick={() => handleMinuteItemClick(m)}
                sx={{
                  height: TIME_PICKER_ITEM_HEIGHT,
                  scrollSnapAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <MDTypography variant="h6" fontWeight="medium" sx={{ opacity: 0.9 }}>
                  {pad2(m)}
                </MDTypography>
              </MDBox>
            );
          })}
        </MDBox>
      </MDBox>
    </MDBox>
  );
}

