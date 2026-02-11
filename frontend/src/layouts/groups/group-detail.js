import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import TuneIcon from "@mui/icons-material/Tune";
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

const MOBILE_FAB_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 88px)";
const CELL_HEIGHT_MOBILE = 100;
const CELL_HEIGHT_DESKTOP = 104;
const MAX_VISIBLE_EVENTS = 3;
const SWIPE_THRESHOLD = 50;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (key) => {
  const [y, m, d] = String(key)
    .split("-")
    .map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, delta) =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

const daysInMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const addDays = (date, deltaDays) => {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
};

const EVENT_TITLES = [
  "Lord's Day Meeting",
  "Prayer Meeting",
  "Bible Study",
  "Gospel Meeting",
  "Fellowship",
  "Home Meeting",
  "Small Group",
];

const EVENT_COLORS = [
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#9C27B0",
  "#E91E63",
  "#00BCD4",
  "#FF5722",
];

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function fakeFetchMonthEvents(monthDate, { signal }) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      const monthStart = startOfMonth(monthDate);
      const total = daysInMonth(monthDate);
      const eventMap = {};
      const highlightDays = new Set();
      const daysWithEvents = Math.min(10, Math.max(4, Math.round(total / 3)));
      for (let i = 0; i < daysWithEvents; i++) {
        highlightDays.add(getRandomInt(1, total));
      }
      Array.from(highlightDays).forEach((dayNum) => {
        const count = getRandomInt(1, 7);
        const date = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth(),
          dayNum,
        );
        const key = toDateKey(date);
        eventMap[key] = Array.from({ length: count }).map((_, idx) => ({
          id: `${key}-${idx}`,
          title: EVENT_TITLES[getRandomInt(0, EVENT_TITLES.length - 1)],
          time: `${String(getRandomInt(9, 20)).padStart(2, "0")}:${String(
            getRandomInt(0, 1) ? 0 : 30,
          ).padStart(2, "0")}`,
          location: getRandomInt(0, 1) ? "Hall" : "Home",
          description: "",
          color: EVENT_COLORS[getRandomInt(0, EVENT_COLORS.length - 1)],
        }));
      });
      resolve({
        eventsByDate: eventMap,
      });
    }, 500);
    signal.onabort = () => {
      clearTimeout(timeout);
      reject(new DOMException("aborted", "AbortError"));
    };
  });
}

function buildCalendarCells(monthDate) {
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

function SearchFilterAdornment({ filter, onSelectFilter }) {
  const { t } = useTranslation();
  const menuIdRef = useRef(
    `event-filter-menu-${Math.random().toString(36).slice(2)}`,
  );
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const isActive = filter && filter !== "default";

  const handleOpen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    event?.stopPropagation?.();
    setAnchorEl(null);
  };

  return (
    <InputAdornment position="end">
      <Tooltip title={t("filters.label", "Filters")}>
        <IconButton
          size="small"
          aria-label={t("filters.label", "Filters")}
          aria-controls={open ? menuIdRef.current : undefined}
          aria-haspopup="menu"
          aria-expanded={open ? "true" : undefined}
          edge="end"
          onClick={handleOpen}
          sx={isActive ? { color: ACCENT_CYAN } : undefined}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuIdRef.current}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MDBox px={2} pt={1.25} pb={0.75}>
          <MDTypography variant="caption" fontWeight="bold">
            {t("filters.filterBy", "Filter By")}
          </MDTypography>
        </MDBox>
        <Divider />
        <MenuItem
          selected={filter === "location"}
          onClick={(event) => {
            onSelectFilter?.(filter === "location" ? "default" : "location");
            handleClose(event);
          }}
        >
          {t("filters.location", "Location")}
        </MenuItem>
        <MenuItem
          selected={filter === "date"}
          onClick={(event) => {
            onSelectFilter?.(filter === "date" ? "default" : "date");
            handleClose(event);
          }}
        >
          {t("filters.date", "Date")}
        </MenuItem>
      </Menu>
    </InputAdornment>
  );
}

function Events() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const { t } = useTranslation();
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
  });
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

  const searchPlaceholder = useMemo(() => {
    if (searchFilter === "location") {
      return t("search.byLocation", "Search by Location");
    }
    if (searchFilter === "date") {
      return t("search.byDate", "Search by Date");
    }
    return t("search.eventsPlaceholder", "Search events...");
  }, [searchFilter, t]);

  // Handle scroll to hide/show FAB
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      setFabVisible(false);
      hasScrolled.current = true;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        if (!isTouching.current) {
          setFabVisible(true);
        }
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
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [isMobile]);

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const selectedDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);
  const selectedEvents = useMemo(
    () => eventsByDate[selectedKey] || [],
    [eventsByDate, selectedKey],
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(monthDate),
    [monthDate],
  );
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
      fakeFetchMonthEvents(date, { signal: controller.signal })
        .then(({ eventsByDate: nextMap }) => {
          setEventsByDate(nextMap || {});
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

  const isSameMonth = (date) =>
    date &&
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth();

  const isSelected = (date) => {
    if (!date) return false;
    return toDateKey(date) === selectedKey;
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

  const closeMonthYearPicker = () => {
    setIsPickerOpen(false);
  };

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

      // If horizontal movement is dominant, mark as swiping
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;

      const deltaX = touchEndX.current - touchStartX.current;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && isSwiping.current) {
        if (deltaX > 0) {
          // Swipe right - previous month
          handleMonthChange(-1);
        } else {
          // Swipe left - next month
          handleMonthChange(1);
        }
      }

      // Reset after a small delay to prevent click from firing
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
    <>
      <MDBox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={2}
        py={1.5}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <IconButton
          onClick={() => handleMonthChange(-1)}
          size="small"
          aria-label={t("eventsPage.previousMonth", "Previous month")}
        >
          <Icon>chevron_left</Icon>
        </IconButton>
        <MDBox
          display="flex"
          alignItems="baseline"
          justifyContent="center"
          gap={0.75}
          sx={{ minWidth: 0 }}
        >
          <MDButton
            variant="text"
            color="info"
            onClick={openMonthPicker}
            sx={{ px: 1, minWidth: 0 }}
          >
            <MDTypography
              variant={isMobile ? "h5" : "h4"}
              fontWeight="bold"
              sx={{ lineHeight: 1.1, whiteSpace: "nowrap" }}
            >
              {monthLabel}
            </MDTypography>
          </MDButton>
          <MDButton
            variant="text"
            color="info"
            onClick={openYearPicker}
            sx={{ px: 1, minWidth: 0 }}
          >
            <MDTypography
              variant={isMobile ? "h5" : "h4"}
              fontWeight="bold"
              sx={{ lineHeight: 1.1, whiteSpace: "nowrap" }}
            >
              {yearLabel}
            </MDTypography>
          </MDButton>
        </MDBox>
        <IconButton
          onClick={() => handleMonthChange(1)}
          size="small"
          aria-label={t("eventsPage.nextMonth", "Next month")}
        >
          <Icon>chevron_right</Icon>
        </IconButton>
      </MDBox>
      <MDBox
        ref={calendarRef}
        p={isMobile ? 1 : 2}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          userSelect: "none",
          position: "relative",
          minHeight: isMobile
            ? calendarRowCount * CELL_HEIGHT_MOBILE + 50
            : calendarRowCount * CELL_HEIGHT_DESKTOP + 50,
        }}
      >
        {/* Loading overlay */}
        {isLoading && (
          <MDBox
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(255, 255, 255, 0.8)",
              zIndex: 10,
              borderRadius: 2,
            }}
          >
            <CircularProgress size={40} sx={{ color: ACCENT_CYAN }} />
          </MDBox>
        )}
        <MDBox
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0,
          }}
        >
          {weekdayLabels.map((label) => (
            <MDBox
              key={label}
              sx={{
                textAlign: "center",
                py: 0.75,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <MDTypography variant="caption" fontWeight="bold">
                {label}
              </MDTypography>
            </MDBox>
          ))}
        </MDBox>
        <MDBox
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: `repeat(${calendarRowCount}, ${
              isMobile ? CELL_HEIGHT_MOBILE : CELL_HEIGHT_DESKTOP
            }px)`,
            gap: 0,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            opacity: isInitialLoad ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {calendarCells.map(({ index, isInMonth, date, dayNum }) => {
            const selected = isSelected(date);
            const isTodayDate = isToday(date);
            const dayEvents = eventsByDate[toDateKey(date)] || [];
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS;
            const content = (
              <MDBox
                sx={{
                  width: "100%",
                  height: "100%",
                  p: 0.5,
                  cursor: "pointer",
                  bgcolor: selected
                    ? "rgba(0, 188, 212, 0.12)"
                    : isInMonth
                    ? "transparent"
                    : "grey.50",
                  color: isInMonth ? "text.primary" : "text.secondary",
                  opacity: isInMonth ? 1 : 0.6,
                  borderBottom:
                    index >= lastRowStartIndex ? "none" : "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    bgcolor: selected
                      ? "rgba(0, 188, 212, 0.12)"
                      : "rgba(0, 188, 212, 0.08)",
                  },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  gap: 0.25,
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                <MDBox
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: isMobile ? 24 : 28,
                    height: isMobile ? 24 : 28,
                    borderRadius: "50%",
                    bgcolor: isTodayDate ? ACCENT_CYAN : "transparent",
                    ml: 0.25,
                  }}
                >
                  <MDTypography
                    variant="button"
                    fontWeight={selected || isTodayDate ? "bold" : "regular"}
                    sx={{
                      fontSize: isMobile ? "0.85rem" : "0.95rem",
                      lineHeight: 1,
                      color: isTodayDate ? "#fff" : "inherit",
                    }}
                  >
                    {dayNum}
                  </MDTypography>
                </MDBox>
                {isInMonth && dayEvents.length > 0 && (
                  <MDBox
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.25,
                      width: "100%",
                      overflow: "hidden",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {visibleEvents.map((event) => (
                      <MDBox
                        key={event.id}
                        sx={{
                          bgcolor: event.color || ACCENT_CYAN,
                          color: "#fff",
                          borderRadius: "12px",
                          px: 0.75,
                          py: 0.2,
                          fontSize: isMobile ? "0.65rem" : "0.7rem",
                          fontWeight: 500,
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          minWidth: 0,
                          flexShrink: 0,
                        }}
                      >
                        {event.title}
                      </MDBox>
                    ))}
                    {remainingCount > 0 && (
                      <MDTypography
                        variant="caption"
                        sx={{
                          fontSize: isMobile ? "0.6rem" : "0.65rem",
                          fontWeight: 600,
                          color: "text.secondary",
                          pl: 0.5,
                          lineHeight: 1.2,
                        }}
                      >
                        +{remainingCount}
                      </MDTypography>
                    )}
                  </MDBox>
                )}
              </MDBox>
            );
            return (
              <MDBox
                key={`cell-${index}`}
                onClick={() => handleSelectDate(date)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectDate(date);
                  }
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                {content}
              </MDBox>
            );
          })}
        </MDBox>
      </MDBox>
    </>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["events"]} />
      <MDBox pt={isMobile ? 2 : 3} pb={3}>
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Search bar - mobile only */}
          {isMobile && (
            <Grid item xs={12}>
              <MDBox px={2}>
                <TextField
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
              </MDBox>
            </Grid>
          )}
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
              ) : selectedEvents.length ? (
                <MDBox display="flex" flexDirection="column" gap={1.5}>
                  {selectedEvents.map((eventItem) => (
                    <Card
                      key={eventItem.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2 }}
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
          <MDBox />
          <MDButton
            variant="text"
            color="secondary"
            onClick={closeMonthYearPicker}
          >
            {t("buttons.cancel", "Cancel")}
          </MDButton>
        </DialogActions>
      </Dialog>
      <Footer />
      {isMobile && (
        <IconButton
          onClick={() => navigate("/event/add")}
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
            opacity: fabVisible ? 1 : 0,
            transform: fabVisible ? "scale(1)" : "scale(0.8)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: fabVisible ? "auto" : "none",
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
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </DashboardLayout>
  );
}

export default Events;
