import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Collapse from "@mui/material/Collapse";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import Toast from "components/Toast";
import { ACCENT_CYAN } from "constants.js";
import { useTranslation } from "i18n";
import { useNavigate } from "react-router-dom";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  restoreEvent,
  updateEvent,
} from "services/convo-broker";
import AddEventDrawer from "./components/AddEventDrawer";
import CalendarPanel from "./components/CalendarPanel";
import SearchFilterAdornment from "./components/SearchFilterAdornment";
import {
  CALENDAR_PILL_GAP,
  CALENDAR_PILL_HEIGHT,
  CALENDAR_PILL_TOP_OFFSET_DESKTOP,
  CALENDAR_PILL_TOP_OFFSET_MOBILE,
  CELL_HEIGHT_DESKTOP,
  CELL_HEIGHT_MOBILE,
  MAX_VISIBLE_EVENTS,
  MOBILE_FAB_BOTTOM_OFFSET,
  SWIPE_THRESHOLD,
  TIME_PICKER_ITEM_HEIGHT,
  TIME_PICKER_PANEL_HEIGHT,
  TIME_WHEEL_REPEAT,
} from "./events.constants";
import buildCalendarCells from "./utils/buildCalendarCells";
import {
  addDays,
  addMonths,
  clampDateKey,
  diffDateKeysInDaysInclusive,
  formatDateButton,
  fromDateKey,
  startOfMonth,
  toDateKey,
  toMonthKey,
} from "./utils/dateKeys";

function Events() {
  const navigate = useNavigate(); // (not used here, leaving as-is)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const { t, language } = useTranslation();

  const requestAbortController = useRef(null);

  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerView, setPickerView] = useState("year");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
    actionLabel: undefined,
    onAction: undefined,
    autoHideDuration: undefined,
  });

  const lastDeletedEventIdRef = useRef(null);

  const [fabVisible, setFabVisible] = useState(true);
  const scrollTimeout = useRef(null);
  const isTouching = useRef(false);
  const hasScrolled = useRef(false);

  const listRef = useRef(null);
  const calendarRef = useRef(null);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const isSwiping = useRef(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("default");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Add sheet state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("add"); // "add" | "edit"
  const [editingEventId, setEditingEventId] = useState(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftAllDay, setDraftAllDay] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState("09:00");
  const [draftEndTime, setDraftEndTime] = useState("10:00");
  const [draftTagColor, setDraftTagColor] = useState("info");
  const [draftRepeat, setDraftRepeat] = useState("never");
  const [draftStartDateKey, setDraftStartDateKey] = useState(selectedKey);
  const [draftEndDateKey, setDraftEndDateKey] = useState(selectedKey);
  const [inlineCalendarOpenFor, setInlineCalendarOpenFor] = useState(null); // "start" | "end" | null
  const [inlineTimeOpenFor, setInlineTimeOpenFor] = useState(null); // "start" | "end" | null

  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const timeScrollRafRef = useRef(null);
  const timeScrollEndTimeoutRef = useRef(null);
  const isRecenteringWheelRef = useRef(false);
  const lastTimeScrollTargetRef = useRef(null);

  const titleInputRef = useRef(null);
  const locationInputRef = useRef(null);

  const searchPlaceholder = useMemo(() => {
    if (searchFilter === "location") {
      return t("search.byLocation", "Search by Location");
    }
    if (searchFilter === "date") {
      return t("search.byDate", "Search by Date");
    }
    return t("search.eventsPlaceholder", "Search events...");
  }, [searchFilter, t]);

  const addSheetDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);

  const draftStartDate = useMemo(
    () => fromDateKey(draftStartDateKey) || addSheetDate,
    [draftStartDateKey, addSheetDate],
  );

  const draftEndDate = useMemo(
    () => fromDateKey(draftEndDateKey) || addSheetDate,
    [draftEndDateKey, addSheetDate],
  );

  const startDateButtonLabel = useMemo(
    () => formatDateButton(draftAllDay ? addSheetDate : draftStartDate),
    [draftAllDay, addSheetDate, draftStartDate],
  );

  const endDateButtonLabel = useMemo(
    () => formatDateButton(draftAllDay ? addSheetDate : draftEndDate),
    [draftAllDay, addSheetDate, draftEndDate],
  );

  const isInvalidDateTimeRange = useMemo(() => {
    const startDate = draftAllDay
      ? addSheetDate
      : fromDateKey(draftStartDateKey) || addSheetDate;
    const endDate = draftAllDay
      ? addSheetDate
      : fromDateKey(draftEndDateKey) || addSheetDate;

    if (!startDate || !endDate) return false;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (draftAllDay) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      const [sh, sm] = String(draftStartTime || "00:00").split(":");
      const [eh, em] = String(draftEndTime || "00:00").split(":");
      start.setHours(Number(sh) || 0, Number(sm) || 0, 0, 0);
      end.setHours(Number(eh) || 0, Number(em) || 0, 0, 0);
    }

    return start.getTime() > end.getTime();
  }, [
    addSheetDate,
    draftAllDay,
    draftEndDateKey,
    draftEndTime,
    draftStartDateKey,
    draftStartTime,
  ]);

  const openAddSheet = () => {
    setEditorMode("add");
    setEditingEventId(null);
    const baseDate = fromDateKey(selectedKey) || new Date();
    const nextDayKey = toDateKey(addDays(baseDate, 1));
    const now = new Date();
    const startHour = now.getHours();
    const endHour = (startHour + 1) % 24;
    const formatHour = (h) => String(h).padStart(2, "0");
    const defaultStartTime = `${formatHour(startHour)}:00`;
    const defaultEndTime = `${formatHour(endHour)}:00`;
    setDraftTitle("");
    setDraftLocation("");
    setDraftAllDay(false);
    setDraftStartTime(defaultStartTime);
    setDraftEndTime(defaultEndTime);
    setDraftTagColor("info");
    setDraftRepeat("never");
    setDraftStartDateKey(selectedKey);
    setDraftEndDateKey(endHour < startHour ? nextDayKey : selectedKey);
    setInlineCalendarOpenFor(null);
    setInlineTimeOpenFor(null);
    setIsSavingEvent(false);
    setIsAddSheetOpen(true);
    setIsMobileSearchOpen(false);
  };

  const openEditSheet = (eventItem) => {
    if (!eventItem?.id) return;
    setEditorMode("edit");
    setEditingEventId(String(eventItem.id));
    setDraftTitle(String(eventItem.title || ""));
    setDraftLocation(String(eventItem.location || ""));
    setDraftAllDay(Boolean(eventItem.allDay));
    setDraftStartTime(String(eventItem.startTime || "09:00"));
    setDraftEndTime(String(eventItem.endTime || "10:00"));
    setDraftTagColor(String(eventItem.tagColorKey || "info"));
    setDraftRepeat(String(eventItem.repeat || "never"));
    setDraftStartDateKey(String(eventItem.startDateKey || selectedKey));
    setDraftEndDateKey(String(eventItem.endDateKey || selectedKey));
    setInlineCalendarOpenFor(null);
    setInlineTimeOpenFor(null);
    setIsSavingEvent(false);
    setIsAddSheetOpen(true);
    setIsMobileSearchOpen(false);
  };

  const closeAddSheet = () => setIsAddSheetOpen(false);

  useEffect(() => {
    if (!draftAllDay) return;
    if (!selectedKey) return;
    setDraftStartDateKey(selectedKey);
    setDraftEndDateKey(selectedKey);
    setInlineCalendarOpenFor(null);
    setInlineTimeOpenFor(null);
  }, [draftAllDay, selectedKey]);

  const calendarLocale = language === "zh-CN" ? "zh-cn" : "en";

  useEffect(() => {
    dayjs.locale(calendarLocale);
  }, [calendarLocale]);

  const inlineCalendarValue = useMemo(() => {
    const key =
      inlineCalendarOpenFor === "end" ? draftEndDateKey : draftStartDateKey;
    const fallback = addSheetDate || new Date();
    return dayjs(fromDateKey(key) || fallback);
  }, [inlineCalendarOpenFor, draftEndDateKey, draftStartDateKey, addSheetDate]);

  const handleInlineCalendarChange = (newValue) => {
    const nextDate = newValue?.toDate?.();
    if (!nextDate) return;
    const nextKey = toDateKey(nextDate);
    if (inlineCalendarOpenFor === "end") {
      setDraftEndDateKey(nextKey);
    } else {
      const prevStartKey = draftStartDateKey;
      setDraftStartDateKey(nextKey);
      if (!draftAllDay) {
        const currentEndKey = draftEndDateKey;
        if (!currentEndKey || currentEndKey === prevStartKey || currentEndKey < nextKey) {
          setDraftEndDateKey(nextKey);
        }
      }
    }
    setInlineCalendarOpenFor(null);
  };

  const inlineCalendarContent = (
    <MDBox sx={{ px: 1, pb: 1.25 }}>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={calendarLocale}
      >
        <DateCalendar
          value={inlineCalendarValue}
          onChange={handleInlineCalendarChange}
          views={["year", "month", "day"]}
          showDaysOutsideCurrentMonth
          sx={{
            width: "100%",
            "& .MuiPickersDay-root.Mui-selected": {
              backgroundColor: `${ACCENT_CYAN} !important`,
              color: "#fff",
            },
            "& .MuiPickersDay-root.Mui-selected:hover": {
              backgroundColor: `${ACCENT_CYAN} !important`,
              filter: "brightness(0.95)",
            },
            "& .MuiPickersDay-root.Mui-selected:focus": {
              backgroundColor: `${ACCENT_CYAN} !important`,
            },
            "& .MuiPickersMonth-monthButton.Mui-selected": {
              backgroundColor: `${ACCENT_CYAN} !important`,
              color: "#fff",
            },
            "& .MuiPickersYear-yearButton.Mui-selected": {
              backgroundColor: `${ACCENT_CYAN} !important`,
              color: "#fff",
            },
          }}
        />
      </LocalizationProvider>
    </MDBox>
  );

  const pad2 = (value) => String(value).padStart(2, "0");

  const parseTimeValue = useCallback((timeValue) => {
    const [h, m] = String(timeValue || "").split(":");
    const hour = Number.isFinite(Number(h))
      ? Math.max(0, Math.min(23, Number(h)))
      : 0;
    const minute = Number.isFinite(Number(m))
      ? Math.max(0, Math.min(59, Number(m)))
      : 0;
    return { hour, minute };
  }, []);

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
    if (!inlineTimeOpenFor) {
      lastTimeScrollTargetRef.current = null;
      return;
    }
    if (lastTimeScrollTargetRef.current === inlineTimeOpenFor) return;
    lastTimeScrollTargetRef.current = inlineTimeOpenFor;

    const { hour, minute } = parseTimeValue(
      inlineTimeOpenFor === "end" ? draftEndTime : draftStartTime,
    );
    const id = requestAnimationFrame(() => scrollToTimeValue(hour, minute));
    return () => cancelAnimationFrame(id);
  }, [
    inlineTimeOpenFor,
    draftEndTime,
    draftStartTime,
    parseTimeValue,
    scrollToTimeValue,
  ]);

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
      return;
    }
  }, []);

  const updateTimeFromScroll = useCallback(() => {
    const target = inlineTimeOpenFor;
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
      setDraftEndTime((prev) => (prev === nextTime ? prev : nextTime));
    } else {
      setDraftStartTime((prev) => (prev === nextTime ? prev : nextTime));
    }
  }, [inlineTimeOpenFor]);

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
      if (timeScrollRafRef.current)
        cancelAnimationFrame(timeScrollRafRef.current);
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
    const fallback = parseTimeValue(
      inlineTimeOpenFor === "end" ? draftEndTime : draftStartTime,
    );
    return fallback;
  }, [
    draftEndTime,
    draftStartTime,
    inlineTimeOpenFor,
    parseTimeValue,
    readWheelValue,
  ]);

  const handleHourItemClick = useCallback(
    (hour) => {
      if (!inlineTimeOpenFor) return;
      const { minute } = readWheelTime();
      scrollToTimeValue(hour, minute);
      requestAnimationFrame(updateTimeFromScroll);
      scheduleWheelRecenter();
    },
    [
      inlineTimeOpenFor,
      readWheelTime,
      scrollToTimeValue,
      scheduleWheelRecenter,
      updateTimeFromScroll,
    ],
  );

  const handleMinuteItemClick = useCallback(
    (minute) => {
      if (!inlineTimeOpenFor) return;
      const { hour } = readWheelTime();
      scrollToTimeValue(hour, minute);
      requestAnimationFrame(updateTimeFromScroll);
      scheduleWheelRecenter();
    },
    [
      inlineTimeOpenFor,
      readWheelTime,
      scrollToTimeValue,
      scheduleWheelRecenter,
      updateTimeFromScroll,
    ],
  );

  const inlineTimeContent = (
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
                <MDTypography
                  variant="h6"
                  fontWeight="medium"
                  sx={{ opacity: 0.9 }}
                >
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
                <MDTypography
                  variant="h6"
                  fontWeight="medium"
                  sx={{ opacity: 0.9 }}
                >
                  {pad2(m)}
                </MDTypography>
              </MDBox>
            );
          })}
        </MDBox>
      </MDBox>
    </MDBox>
  );

  const toggleInlineCalendar = (target) => {
    if (draftAllDay) return;
    setInlineTimeOpenFor(null);
    if (inlineCalendarOpenFor === target) {
      setInlineCalendarOpenFor(null);
      return;
    }
    setInlineCalendarOpenFor(target);
  };

  const toggleInlineTime = (target) => {
    if (draftAllDay) return;
    setInlineCalendarOpenFor(null);
    if (inlineTimeOpenFor === target) {
      setInlineTimeOpenFor(null);
      return;
    }
    setInlineTimeOpenFor(target);
  };

  useEffect(() => {
    if (!isMobile) return;
    if (!isMobileSearchOpen) return;
    const id = setTimeout(() => searchInputRef.current?.focus?.(), 0);
    return () => clearTimeout(id);
  }, [isMobile, isMobileSearchOpen]);

  // Handle scroll to hide/show FAB
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      setFabVisible(false);
      hasScrolled.current = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        if (!isTouching.current) setFabVisible(true);
      }, 150);
    };

    const handleTouchStart = () => {
      isTouching.current = true;
      hasScrolled.current = false;
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
      if (hasScrolled.current) {
        setFabVisible(true);
        hasScrolled.current = false;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [isMobile]);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const selectedDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);
  const selectedEvents = useMemo(
    () => eventsByDate[selectedKey] || [],
    [eventsByDate, selectedKey],
  );
  const selectedEventsSortedByTime = useMemo(() => {
    const parseTimeToMinutes = (value) => {
      const [h, m] = String(value || "").split(":");
      const hour = Number(h);
      const minute = Number(m);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    };

    return [...selectedEvents].sort((a, b) => {
      const aMinutes = a?.allDay ? -1 : parseTimeToMinutes(a?.startTime);
      const bMinutes = b?.allDay ? -1 : parseTimeToMinutes(b?.startTime);

      const aKey = aMinutes === null ? Number.POSITIVE_INFINITY : aMinutes;
      const bKey = bMinutes === null ? Number.POSITIVE_INFINITY : bMinutes;
      if (aKey !== bKey) return aKey - bKey;

      const titleDiff = String(a?.title || "").localeCompare(
        String(b?.title || ""),
      );
      if (titleDiff) return titleDiff;

      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
  }, [selectedEvents]);

  const calendarCells = useMemo(
    () => buildCalendarCells(monthDate),
    [monthDate],
  );
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
          color: eventItem.color || ACCENT_CYAN,
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

      const laneEnds = Array.from({ length: MAX_VISIBLE_EVENTS }, () => -1);
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
  }, [
    ACCENT_CYAN,
    calendarCells,
    calendarDateKeyToIndex,
    calendarRange,
    eventsByDate,
  ]);
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

  const yearLabel = useMemo(
    () => String(monthDate.getFullYear() || ""),
    [monthDate],
  );

  const weekdayLabels = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    [],
  );

  const isToday = useCallback(
    (date) => {
      if (!date) return false;
      return toDateKey(date) === todayKey;
    },
    [todayKey],
  );

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
          setToast({
            open: true,
            message:
              error?.message ||
              t("eventsPage.loadFailed", "Failed to load events."),
            severity: "error",
          });
        });

      requestAbortController.current = controller;
    },
    [t],
  );

  useEffect(() => {
    fetchMonth(monthDate);
    return () => requestAbortController.current?.abort();
  }, [fetchMonth, monthDate]);

  const setActiveMonth = useCallback(
    (nextMonth, nextSelectedDate = nextMonth) => {
      requestAbortController.current?.abort?.();
      setEventsByDate({});
      setMonthDate(nextMonth);
      setSelectedKey(toDateKey(nextSelectedDate));
    },
    [],
  );

  const handleMonthChange = useCallback(
    (delta) => {
      const next = addMonths(monthDate, delta);
      setActiveMonth(next, next);
    },
    [monthDate, setActiveMonth],
  );

  const isSameMonth = (date) =>
    date &&
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth();

  const isSelected = (date) => {
    if (!date) return false;
    return toDateKey(date) === selectedKey;
  };

  const handleSelectDate = (date) => {
    if (isSwiping.current) return;
    if (!date) return;

    if (!isSameMonth(date)) {
      setActiveMonth(startOfMonth(date), date);
    } else {
      setSelectedKey(toDateKey(date));
    }

    if (isMobile) {
      setTimeout(
        () => listRef.current?.scrollIntoView?.({ behavior: "smooth" }),
        0,
      );
    }
  };

  const handleGoToToday = () => {
    const todayDate = new Date();
    const todayMonth = startOfMonth(todayDate);

    if (
      todayMonth.getFullYear() !== monthDate.getFullYear() ||
      todayMonth.getMonth() !== monthDate.getMonth()
    ) {
      setActiveMonth(todayMonth, todayDate);
    } else {
      setSelectedKey(toDateKey(todayDate));
    }
  };

  const yearOptions = useMemo(() => {
    const current = monthDate.getFullYear();
    const start = current - 30;
    const end = current + 30;
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [monthDate]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) =>
        t(
          `monthsShort.${idx}`,
          new Date(2000, idx, 1).toLocaleString(undefined, { month: "short" }),
        ),
      ),
    [t],
  );

  const openMonthPicker = () => {
    setPickerView("month");
    setIsPickerOpen(true);
  };

  const openYearPicker = () => {
    setPickerView("year");
    setIsPickerOpen(true);
  };

  const closeMonthYearPicker = () => setIsPickerOpen(false);

  const handlePickYear = (year) => {
    const next = new Date(year, monthDate.getMonth(), 1);
    setActiveMonth(next, next);
    setIsPickerOpen(false);
  };

  const handlePickMonth = (monthIndex) => {
    const next = new Date(monthDate.getFullYear(), monthIndex, 1);
    setActiveMonth(next, next);
    setIsPickerOpen(false);
  };

  // Swipe handlers for calendar - using native event listeners
  useEffect(() => {
    if (!isMobile) return;
    const calendarElement = calendarRef.current;
    if (!calendarElement) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchEndX.current = touch.clientX;
      isSwiping.current = false;
    };

    const handleTouchMove = (e) => {
      if (touchStartX.current === null) return;
      const touch = e.touches[0];
      touchEndX.current = touch.clientX;
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;
      const deltaX = touchEndX.current - touchStartX.current;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && isSwiping.current) {
        if (deltaX > 0) handleMonthChange(-1);
        else handleMonthChange(1);
      }

      setTimeout(() => {
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        isSwiping.current = false;
      }, 50);
    };

    calendarElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    calendarElement.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    calendarElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      calendarElement.removeEventListener("touchstart", handleTouchStart);
      calendarElement.removeEventListener("touchmove", handleTouchMove);
      calendarElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, handleMonthChange]);

  const calendarContent = (
    <CalendarPanel
      calendarCells={calendarCells}
      calendarPillLayout={calendarPillLayout}
      calendarRef={calendarRef}
      calendarRowCount={calendarRowCount}
      handleMonthChange={handleMonthChange}
      handleSelectDate={handleSelectDate}
      isInitialLoad={isInitialLoad}
      isLoading={isLoading}
      isMobile={isMobile}
      isSelected={isSelected}
      isToday={isToday}
      lastRowStartIndex={lastRowStartIndex}
      monthLabel={monthLabel}
      openMonthPicker={openMonthPicker}
      openYearPicker={openYearPicker}
      t={t}
      weekdayLabels={weekdayLabels}
      yearLabel={yearLabel}
    />
  );

  const ROW_HEIGHT = 57; // change this if you want denser: 44, bigger: 52

  const formRowSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    px: 2,
    height: ROW_HEIGHT,
    py: 0,
    boxSizing: "border-box",
  };

  // Keep py=0 here so the first/last row spacing matches the internal divider spacing
  const sectionCardSx = {
    bgcolor: "#fff",
    borderRadius: 3,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    py: 0,
  };

  const sectionDividerSx = { mx: 2, my: 0, flexShrink: 0 };

  // InputBase: center the actual input text vertically
  const inputRowFieldSx = {
    height: "100%",
    display: "flex",
    alignItems: "center",
    color: "text.secondary",
    "& .MuiInputBase-input": {
      height: "100%",
      boxSizing: "border-box",
      padding: 0,
      fontSize: "1rem",
      lineHeight: 1.2,
      display: "block",
      color: "inherit",
    },
    "& .MuiInputBase-input::placeholder": {
      color: "text.disabled",
      opacity: 1,
    },
  };

  // Buttons: keep them slightly smaller than row height
  const dateTimeButtonSx = {
    minWidth: 0,
    px: 1.25,
    height: 32,
    py: 0,
    textTransform: "none",
    borderRadius: 2,
    bgcolor: "grey.200",
    color: "text.primary",
    fontWeight: 400,
    fontSize: "0.875rem",
    "&:hover": { bgcolor: "grey.200", color: `${ACCENT_CYAN} !important` },
    "&:active": { color: `${ACCENT_CYAN} !important` },
    "&:focus": { color: `${ACCENT_CYAN} !important` },
    "&:focus:not(:hover)": { color: `${ACCENT_CYAN} !important` },
    "&.Mui-focusVisible": { color: `${ACCENT_CYAN} !important` },
  };

  const tagColorOptions = useMemo(
    () => [
      { key: "primary", label: "Primary", color: theme.palette.primary.main },
      {
        key: "secondary",
        label: "Secondary",
        color: theme.palette.secondary.main,
      },
      { key: "success", label: "Green", color: theme.palette.success.main },
      { key: "info", label: "Cyan", color: theme.palette.info.main },
      { key: "warning", label: "Orange", color: theme.palette.warning.main },
      { key: "error", label: "Red", color: theme.palette.error.main },
    ],
    [
      theme.palette.error.main,
      theme.palette.info.main,
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ],
  );

  const tagColorMap = useMemo(() => {
    const map = new Map();
    tagColorOptions.forEach((opt) => map.set(opt.key, opt));
    return map;
  }, [tagColorOptions]);

  const repeatOptions = useMemo(
    () => [
      { key: "never", label: t("eventsForm.repeat.never", "Never") },
      { key: "daily", label: t("eventsForm.repeat.daily", "Every Day") },
      { key: "weekly", label: t("eventsForm.repeat.weekly", "Every Week") },
      {
        key: "biweekly",
        label: t("eventsForm.repeat.biweekly", "Every 2 Weeks"),
      },
      { key: "monthly", label: t("eventsForm.repeat.monthly", "Every Month") },
      { key: "yearly", label: t("eventsForm.repeat.yearly", "Every Year") },
    ],
    [t],
  );

  const repeatOptionMap = useMemo(() => {
    const map = new Map();
    repeatOptions.forEach((opt) => map.set(opt.key, opt));
    return map;
  }, [repeatOptions]);

  const handleSaveEvent = useCallback(async () => {
    if (isSavingEvent) return;

    const trimmedTitle = String(draftTitle || "").trim();
    if (!trimmedTitle) {
      setToast({
        open: true,
        message: t("eventsForm.errors.titleRequired", "Title is required."),
        severity: "error",
      });
      titleInputRef.current?.focus?.();
      return;
    }

    if (isInvalidDateTimeRange) {
      setToast({
        open: true,
        message: t("eventsForm.errors.invalidRange", "End must be after start."),
        severity: "error",
      });
      return;
    }

    const colorHex = tagColorMap.get(draftTagColor)?.color || ACCENT_CYAN;

    setIsSavingEvent(true);
    try {
      if (editorMode === "edit") {
        if (!editingEventId) throw new Error("Missing event id");
        await updateEvent(editingEventId, {
          title: trimmedTitle,
          location: String(draftLocation || "").trim(),
          description: "",
          allDay: Boolean(draftAllDay),
          startDateKey: draftStartDateKey,
          endDateKey: draftEndDateKey,
          startTime: draftAllDay ? "" : draftStartTime,
          endTime: draftAllDay ? "" : draftEndTime,
          tagColorKey: draftTagColor,
          color: colorHex,
          repeat: draftRepeat,
        });
      } else {
        await createEvent({
          title: trimmedTitle,
          location: String(draftLocation || "").trim(),
          description: "",
          allDay: Boolean(draftAllDay),
          startDateKey: draftStartDateKey,
          endDateKey: draftEndDateKey,
          startTime: draftAllDay ? "" : draftStartTime,
          endTime: draftAllDay ? "" : draftEndTime,
          tagColorKey: draftTagColor,
          color: colorHex,
          repeat: draftRepeat,
        });
      }

      const toastKey =
        editorMode === "edit"
          ? "eventsForm.toasts.updated"
          : "eventsForm.toasts.created";
      const toastFallback =
        editorMode === "edit" ? "Event updated." : "Event added.";

      setInlineCalendarOpenFor(null);
      setInlineTimeOpenFor(null);
      setIsAddSheetOpen(false);
      setToast({
        open: true,
        message: t(toastKey, toastFallback),
        severity: "success",
      });
      setSelectedKey(draftStartDateKey);
      fetchMonth(monthDate);
    } catch (error) {
      setToast({
        open: true,
        message:
          error?.message ||
          (editorMode === "edit"
            ? t("eventsForm.errors.updateFailed", "Update failed.")
            : t("eventsForm.errors.addFailed", "Add failed.")),
        severity: "error",
      });
    } finally {
      setIsSavingEvent(false);
    }
  }, [
    draftAllDay,
    draftEndDateKey,
    draftEndTime,
    draftLocation,
    draftRepeat,
    draftStartDateKey,
    draftStartTime,
    draftTagColor,
    draftTitle,
    editingEventId,
    editorMode,
    fetchMonth,
    isInvalidDateTimeRange,
    isSavingEvent,
    monthDate,
    t,
    tagColorMap,
  ]);

  const handleDeleteEvent = useCallback(async () => {
    if (isSavingEvent) return;
    if (editorMode !== "edit") return;
    if (!editingEventId) return;

    setIsSavingEvent(true);
    try {
      await deleteEvent(editingEventId);
      lastDeletedEventIdRef.current = editingEventId;
      setInlineCalendarOpenFor(null);
      setInlineTimeOpenFor(null);
      setIsAddSheetOpen(false);
      setToast({
        open: true,
        message: t("eventsForm.toasts.deleted", "Event deleted."),
        severity: "success",
        actionLabel: t("actions.undo", "Undo"),
        onAction: async () => {
          const restoreId = lastDeletedEventIdRef.current;
          if (!restoreId) return;
          await restoreEvent(restoreId);
          fetchMonth(monthDate);
          lastDeletedEventIdRef.current = null;
        },
        autoHideDuration: 6000,
      });
      fetchMonth(monthDate);
    } catch (error) {
      setToast({
        open: true,
        message:
          error?.message ||
          t("eventsForm.errors.deleteFailed", "Delete failed."),
        severity: "error",
        actionLabel: undefined,
        onAction: undefined,
        autoHideDuration: undefined,
      });
    } finally {
      setIsSavingEvent(false);
    }
  }, [
    editingEventId,
    editorMode,
    fetchMonth,
    isSavingEvent,
    monthDate,
    t,
  ]);

  const startInlinePanelMode =
    inlineCalendarOpenFor === "start"
      ? "date"
      : inlineTimeOpenFor === "start"
        ? "time"
      : null;

  const endInlinePanelMode =
    inlineCalendarOpenFor === "end"
      ? "date"
      : inlineTimeOpenFor === "end"
      ? "time"
      : null;

  return (
    <DashboardLayout>
      <DashboardNavbar
        customRoute={["events"]}
        mobileRightIcon={isMobileSearchOpen ? "close" : "search"}
        mobileRightAriaLabel={
          isMobileSearchOpen
            ? t("buttons.close", "Close")
            : t("search.placeholder", "Search...")
        }
        onMobileRightIconClick={() => setIsMobileSearchOpen((prev) => !prev)}
      />

      <MDBox pt={isMobile ? 2 : 3} pb={3}>
        {isMobile && (
          <MDBox px={2} mb={2}>
            <Collapse in={isMobileSearchOpen} timeout={180} unmountOnExit>
              <TextField
                inputRef={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon sx={{ color: "text.secondary" }}>search</Icon>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <SearchFilterAdornment
                      filter={searchFilter}
                      onSelectFilter={setSearchFilter}
                    />
                  ),
                }}
                size="small"
                fullWidth
              />
            </Collapse>
          </MDBox>
        )}

        <Grid container spacing={isMobile ? 2 : 3}>
          <Grid item xs={12} sx={isMobile ? { px: 0 } : undefined}>
            {isMobile ? (
              <MDBox sx={{ width: "100%" }}>{calendarContent}</MDBox>
            ) : (
              <Card sx={{ overflow: "hidden" }}>{calendarContent}</Card>
            )}
          </Grid>

          <Grid item xs={12}>
            <MDBox
              display="flex"
              justifyContent="flex-start"
              alignItems="center"
              mb={1}
              px={isMobile ? 2 : 0}
            >
              <MDButton
                variant="outlined"
                color="info"
                size="small"
                onClick={handleGoToToday}
                startIcon={<Icon>today</Icon>}
              >
                {t("eventsPage.today", "Today")}
              </MDButton>
            </MDBox>
          </Grid>

          <Grid item xs={12} ref={listRef}>
            <Card sx={{ p: 2 }}>
              <MDBox display="flex" alignItems="baseline" gap={1} mb={1}>
                <MDTypography variant="h6" fontWeight="bold">
                  {t("nav.events", "Event")}
                </MDTypography>
                {selectedDate && (
                  <MDTypography variant="caption" color="text">
                    {selectedDate.toLocaleDateString()}
                  </MDTypography>
                )}
              </MDBox>

              <Divider sx={{ mb: 1.5 }} />

              {isLoading ? (
                <MDBox display="flex" flexDirection="column" gap={1}>
                  <Skeleton variant="rounded" height={72} />
                  <Skeleton variant="rounded" height={72} />
                </MDBox>
              ) : selectedEventsSortedByTime.length ? (
                <MDBox display="flex" flexDirection="column" gap={1.5}>
                  {selectedEventsSortedByTime.map((eventItem) => (
                    <Card
                      key={eventItem.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        cursor: "pointer",
                        "&:hover": { boxShadow: 5 },
                      }}
                      onClick={() => openEditSheet(eventItem)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEditSheet(eventItem);
                        }
                      }}
                    >
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={1}
                      >
                        <MDTypography
                          variant="button"
                          fontWeight="bold"
                          sx={{ color: eventItem.color || ACCENT_CYAN }}
                        >
                          {eventItem.title}
                        </MDTypography>
                        <MDTypography variant="caption" color="text">
                          {eventItem.time}
                        </MDTypography>
                      </MDBox>
                      <MDTypography variant="caption" color="text">
                        {eventItem.location}
                      </MDTypography>
                      {eventItem.description ? (
                        <MDTypography variant="body2" mt={0.75}>
                          {eventItem.description}
                        </MDTypography>
                      ) : null}
                    </Card>
                  ))}
                </MDBox>
              ) : (
                <MDTypography variant="body2" color="text">
                  {t("eventsPage.noEvents", "No events.")}
                </MDTypography>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <Dialog
        open={isPickerOpen}
        onClose={closeMonthYearPicker}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1 }}>
          {pickerView === "year"
            ? t("eventsPage.selectYear", "Select year")
            : t("eventsPage.selectMonth", "Select month")}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {pickerView === "year" ? (
            <List dense sx={{ maxHeight: 420, overflow: "auto" }}>
              {yearOptions.map((year) => (
                <ListItemButton
                  key={year}
                  selected={year === monthDate.getFullYear()}
                  onClick={() => handlePickYear(year)}
                >
                  <ListItemText primary={String(year)} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <MDBox
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                pt: 1,
              }}
            >
              {monthOptions.map((label, idx) => (
                <MDButton
                  key={label}
                  variant="outlined"
                  color="info"
                  onClick={() => handlePickMonth(idx)}
                  sx={{ py: 1.2 }}
                >
                  {label}
                </MDButton>
              ))}
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="text"
            color="secondary"
            onClick={closeMonthYearPicker}
          >
            {t("buttons.cancel", "Cancel")}
          </MDButton>
        </DialogActions>
      </Dialog>

      <AddEventDrawer
        closeAddSheet={closeAddSheet}
        dateTimeButtonSx={dateTimeButtonSx}
        draftAllDay={draftAllDay}
        draftEndTime={draftEndTime}
        draftLocation={draftLocation}
        draftRepeat={draftRepeat}
        draftStartTime={draftStartTime}
        draftTagColor={draftTagColor}
        draftTitle={draftTitle}
        endDateButtonLabel={endDateButtonLabel}
        endInlinePanelMode={endInlinePanelMode}
        formRowSx={formRowSx}
        onPrimaryAction={handleSaveEvent}
        primaryActionLabel={
          editorMode === "edit"
            ? t("buttons.save", "Save")
            : t("buttons.add", "Add")
        }
        showDelete={editorMode === "edit"}
        deleteLabel={t("eventsForm.delete", "Delete event")}
        onDelete={handleDeleteEvent}
        inlineCalendarContent={inlineCalendarContent}
        inlineCalendarOpenFor={inlineCalendarOpenFor}
        inlineTimeContent={inlineTimeContent}
        inlineTimeOpenFor={inlineTimeOpenFor}
        inputRowFieldSx={inputRowFieldSx}
        isAddSheetOpen={isAddSheetOpen}
        isInvalidDateTimeRange={isInvalidDateTimeRange}
        isSavingEvent={isSavingEvent}
        locationInputRef={locationInputRef}
        repeatOptionMap={repeatOptionMap}
        repeatOptions={repeatOptions}
        sectionCardSx={sectionCardSx}
        sectionDividerSx={sectionDividerSx}
        setDraftAllDay={setDraftAllDay}
        setDraftLocation={setDraftLocation}
        setDraftRepeat={setDraftRepeat}
        setDraftTagColor={setDraftTagColor}
        setDraftTitle={setDraftTitle}
        setInlineCalendarOpenFor={setInlineCalendarOpenFor}
        setInlineTimeOpenFor={setInlineTimeOpenFor}
        sheetTitle={
          editorMode === "edit"
            ? t("eventsForm.editTitle", "Edit Event")
            : t("eventsForm.title", "New Event")
        }
        startDateButtonLabel={startDateButtonLabel}
        startInlinePanelMode={startInlinePanelMode}
        t={t}
        tagColorMap={tagColorMap}
        tagColorOptions={tagColorOptions}
        theme={theme}
        titleInputRef={titleInputRef}
        toggleInlineCalendar={toggleInlineCalendar}
        toggleInlineTime={toggleInlineTime}
      />

      <Footer />

      {isMobile && (
        <IconButton
          onClick={openAddSheet}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: MOBILE_FAB_BOTTOM_OFFSET,
            width: 77,
            height: 77,
            borderRadius: "50%",
            background: ACCENT_CYAN,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            opacity: fabVisible && !isAddSheetOpen ? 1 : 0,
            transform:
              fabVisible && !isAddSheetOpen ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: fabVisible && !isAddSheetOpen ? "auto" : "none",
            "&:hover": {
              background: ACCENT_CYAN,
              filter: "brightness(0.9)",
            },
          })}
          aria-label={t("eventsPage.addEvent", "Add event")}
        >
          <Icon fontSize="large" sx={{ color: "#fff" }}>
            add
          </Icon>
        </IconButton>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        autoHideDuration={toast.autoHideDuration}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </DashboardLayout>
  );
}

export default Events;
