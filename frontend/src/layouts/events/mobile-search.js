import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import SearchFilterAdornment from "./components/SearchFilterAdornment";
import { useTranslation } from "i18n";
import { useNavigate } from "react-router-dom";
import { fetchEvents } from "services/convo-broker";
import { ACCENT_CYAN } from "constants.js";
import Toast from "components/Toast";
import AddEventDrawer from "./components/AddEventDrawer";
import TimeWheelPicker from "./components/TimeWheelPicker";
import useEventDraftEditor from "./hooks/useEventDraftEditor";
import sortEventsByTime from "./utils/sortEventsByTime";
import {
  fromDateKey,
  startOfMonth,
  toDateKey,
  toMonthKey,
} from "./utils/dateKeys";

export default function EventsMobileSearch() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("default");
  const inputRef = useRef(null);

  const [monthDate] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));
  const [eventsByDate, setEventsByDate] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
    actionLabel: undefined,
    onAction: undefined,
    autoHideDuration: undefined,
  });

  const fetchMonth = useCallback((date) => {
    const controller = new AbortController();
    setIsLoading(true);

    fetchEvents({ month: toMonthKey(date), signal: controller.signal })
      .then((payload) => {
        setEventsByDate(payload?.eventsByDate || {});
        setIsLoading(false);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setIsLoading(false);
      });

    return controller;
  }, []);

  const editor = useEventDraftEditor({
    selectedKey,
    monthDate,
    fetchMonth,
    t,
    theme,
    isMobile,
  });

  const placeholder = useMemo(() => {
    if (searchFilter === "location") {
      return t("search.byLocation", "Search by Location");
    }
    if (searchFilter === "date") {
      return t("search.byDate", "Search by Date");
    }
    return t("search.eventsPlaceholder", "Search events...");
  }, [searchFilter, t]);

  useEffect(() => {
    const controller = fetchMonth(monthDate);
    return () => controller?.abort?.();
  }, [fetchMonth, monthDate]);

  useEffect(() => {
    if (!isMobile) navigate("/events", { replace: true });
  }, [isMobile, navigate]);

  if (!isMobile) return null;

  const calendarLocale = language === "zh-CN" ? "zh-cn" : "en";

  useEffect(() => {
    dayjs.locale(calendarLocale);
  }, [calendarLocale]);

  const inlineCalendarValue = useMemo(() => {
    const key =
      editor.inlineCalendarOpenFor === "end"
        ? editor.draftEndDateKey
        : editor.draftStartDateKey;
    const fallback = fromDateKey(selectedKey) || new Date();
    return dayjs(fromDateKey(key) || fallback);
  }, [
    editor.draftEndDateKey,
    editor.draftStartDateKey,
    editor.inlineCalendarOpenFor,
    selectedKey,
  ]);

  const handleInlineCalendarChange = (newValue) => {
    const nextDate = newValue?.toDate?.();
    if (!nextDate) return;
    const nextKey = toDateKey(nextDate);
    if (editor.inlineCalendarOpenFor === "end") {
      editor.setDraftEndDateKey(nextKey);
    } else {
      const prevStartKey = editor.draftStartDateKey;
      editor.setDraftStartDateKey(nextKey);
      if (!editor.draftAllDay) {
        const currentEndKey = editor.draftEndDateKey;
        if (
          !currentEndKey ||
          currentEndKey === prevStartKey ||
          currentEndKey < nextKey
        ) {
          editor.setDraftEndDateKey(nextKey);
        }
      }
    }
    editor.setInlineCalendarOpenFor(null);
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

  const inlineTimeContent = (
    <TimeWheelPicker
      openFor={editor.inlineTimeOpenFor}
      startTime={editor.draftStartTime}
      endTime={editor.draftEndTime}
      setStartTime={editor.setDraftStartTime}
      setEndTime={editor.setDraftEndTime}
    />
  );

  const ROW_HEIGHT = 57;

  const formRowSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    px: 2,
    height: ROW_HEIGHT,
    py: 0,
    boxSizing: "border-box",
  };

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

  const handleSaveEvent = useCallback(
    () => editor.handleSaveEvent({ setToast, setSelectedKey }),
    [editor],
  );

  const handleDeleteEvent = useCallback(
    () => editor.handleDeleteEvent({ setToast }),
    [editor],
  );

  const monthEvents = useMemo(() => {
    const byId = new Map();
    const itemsWithoutId = [];

    Object.entries(eventsByDate || {}).forEach(([dateKey, dayItems]) => {
      (dayItems || []).forEach((eventItem) => {
        const id = eventItem?.id ? String(eventItem.id) : "";
        const primaryDateKey = String(eventItem?.startDateKey || dateKey || "");
        const normalized = { ...eventItem, dateKey: primaryDateKey };

        if (!id) {
          itemsWithoutId.push(normalized);
          return;
        }

        const existing = byId.get(id);
        if (!existing) {
          byId.set(id, normalized);
          return;
        }

        if (
          primaryDateKey &&
          (!existing?.dateKey || primaryDateKey < String(existing.dateKey))
        ) {
          byId.set(id, normalized);
        }
      });
    });

    return [...byId.values(), ...itemsWithoutId];
  }, [eventsByDate]);

  const searchResults = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return [];

    const matches = monthEvents.filter((eventItem) => {
      const title = String(eventItem?.title || "").toLowerCase();
      const location = String(eventItem?.location || "").toLowerCase();

      if (searchFilter === "location") return location.includes(q);

      if (searchFilter === "date") {
        const date = fromDateKey(eventItem?.dateKey);
        if (!date) return false;
        const dateText = date.toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return dateText.toLowerCase().includes(q);
      }

      return title.includes(q) || location.includes(q);
    });

    matches.sort((a, b) => String(a?.dateKey).localeCompare(String(b?.dateKey)));

    const grouped = new Map();
    matches.forEach((eventItem) => {
      const key = String(eventItem?.dateKey || "");
      const list = grouped.get(key) || [];
      list.push(eventItem);
      grouped.set(key, list);
    });

    const flattened = [];
    Array.from(grouped.entries()).forEach(([dateKey, items]) => {
      flattened.push(...sortEventsByTime(items));
    });

    return flattened.slice(0, 50);
  }, [monthEvents, searchFilter, searchQuery]);

  return (
    <MDBox
      sx={{
        minHeight: "100vh",
        px: 2,
        py: 1.5,
      }}
    >
      <MDBox
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <IconButton
          aria-label={t("buttons.back", "Back")}
          onClick={() => navigate("/events")}
          sx={{ flexShrink: 0 }}
        >
          <Icon>arrow_back</Icon>
        </IconButton>

        <TextField
          inputRef={inputRef}
          autoFocus
          placeholder={placeholder}
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

        <MDBox mt={2} display="flex" alignItems="baseline" gap={1} mb={1}>
          <MDTypography variant="h6" fontWeight="bold">
            {t("search.results")}
          </MDTypography>
      {searchQuery ? (
          <MDTypography variant="caption" color="text">
            {searchResults.length}
          </MDTypography>
        ) : null}
      </MDBox>

      <Divider sx={{ mb: 1.5 }} />

      {isLoading ? (
        <MDBox display="flex" flexDirection="column" gap={1}>
          <Skeleton variant="rounded" height={72} />
          <Skeleton variant="rounded" height={72} />
        </MDBox>
      ) : !searchQuery ? (
        <MDTypography variant="body2" color="text">
          {t("search.typeToSearch")}
        </MDTypography>
      ) : searchResults.length ? (
        <MDBox display="flex" flexDirection="column" gap={1.25}>
          {searchResults.map((eventItem) => (
            (() => {
              const eventDate = fromDateKey(eventItem?.dateKey);
              const dateLabel = eventDate
                ? eventDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : String(eventItem?.dateKey || "");
              const descriptionText = String(eventItem?.description || "").trim();
              const notesText = String(
                eventItem?.notes || eventItem?.description || "",
              ).trim();
              const descriptionPreview =
                notesText.length > 90
                  ? `${notesText.slice(0, 90)}…`
                  : notesText;
              const timeLabel =
                eventItem?.allDay
                  ? t("eventsPage.allDay", "All day")
                  : String(eventItem?.time || "");

              return (
                <Card
                  key={`${eventItem?.dateKey || ""}-${eventItem?.id}`}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { boxShadow: 5 },
                  }}
                  onClick={() => {
                    setSelectedKey(String(eventItem?.dateKey || selectedKey));
                    editor.openEditSheet(eventItem);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedKey(String(eventItem?.dateKey || selectedKey));
                      editor.openEditSheet(eventItem);
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
                  noWrap
                  sx={{ color: eventItem?.color || ACCENT_CYAN }}
                >
                  {eventItem?.title}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {timeLabel}
                </MDTypography>
              </MDBox>
              <MDTypography variant="caption" color="text">
                {dateLabel}
              </MDTypography>
              <MDTypography variant="caption" color="text">
                {eventItem?.location}
              </MDTypography>
              {descriptionPreview ? (
                <MDTypography variant="body2" mt={0.75}>
                  {descriptionPreview}
                </MDTypography>
              ) : null}
            </Card>
              );
            })()
          ))}
        </MDBox>
      ) : (
        <MDTypography variant="body2" color="text">
          {t("search.noResults", "No results.")}
        </MDTypography>
      )}

      <AddEventDrawer
        closeAddSheet={editor.closeAddSheet}
        dateTimeButtonSx={dateTimeButtonSx}
        draftAllDay={editor.draftAllDay}
        draftEndTime={editor.draftEndTime}
        draftLocation={editor.draftLocation}
        draftNotes={editor.draftNotes}
        draftRepeat={editor.draftRepeat}
        draftStartTime={editor.draftStartTime}
        draftTagColor={editor.draftTagColor}
        draftTitle={editor.draftTitle}
        endDateButtonLabel={editor.endDateButtonLabel}
        endInlinePanelMode={editor.endInlinePanelMode}
        formRowSx={formRowSx}
        onPrimaryAction={handleSaveEvent}
        primaryActionLabel={t("buttons.save", "Save")}
        showDelete={editor.editorMode === "edit"}
        deleteLabel={t("eventsForm.delete", "Delete event")}
        onDelete={handleDeleteEvent}
        inlineCalendarContent={inlineCalendarContent}
        inlineCalendarOpenFor={editor.inlineCalendarOpenFor}
        inlineTimeContent={inlineTimeContent}
        inlineTimeOpenFor={editor.inlineTimeOpenFor}
        inputRowFieldSx={inputRowFieldSx}
        isAddSheetOpen={editor.isAddSheetOpen}
        isInvalidDateTimeRange={editor.isInvalidDateTimeRange}
        isSavingEvent={editor.isSavingEvent}
        locationInputRef={editor.locationInputRef}
        repeatOptionMap={editor.repeatOptionMap}
        repeatOptions={editor.repeatOptions}
        sectionCardSx={sectionCardSx}
        sectionDividerSx={sectionDividerSx}
        setDraftAllDay={editor.setDraftAllDay}
        setDraftLocation={editor.setDraftLocation}
        setDraftNotes={editor.setDraftNotes}
        setDraftRepeat={editor.setDraftRepeat}
        setDraftTagColor={editor.setDraftTagColor}
        setDraftTitle={editor.setDraftTitle}
        setInlineCalendarOpenFor={editor.setInlineCalendarOpenFor}
        setInlineTimeOpenFor={editor.setInlineTimeOpenFor}
        sheetTitle={t("eventsForm.editTitle", "Edit Event")}
        startDateButtonLabel={editor.startDateButtonLabel}
        startInlinePanelMode={editor.startInlinePanelMode}
        t={t}
        tagColorMap={editor.tagColorMap}
        tagColorOptions={editor.tagColorOptions}
        theme={theme}
        titleInputRef={editor.titleInputRef}
        toggleInlineCalendar={editor.toggleInlineCalendar}
        toggleInlineTime={editor.toggleInlineTime}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        autoHideDuration={toast.autoHideDuration}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </MDBox>
  );
}
