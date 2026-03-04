import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import Toast from "components/Toast";
import { ACCENT_CYAN } from "constants.js";
import { useTranslation } from "i18n";
import { useNavigate } from "react-router-dom";
import AddEventDrawer from "./components/AddEventDrawer";
import AddEventFab from "./components/AddEventFab";
import CalendarPanel from "./components/CalendarPanel";
import EventListPanel from "./components/EventListPanel";
import MobileSearchBar from "./components/MobileSearchBar";
import MonthYearPickerDialog from "./components/MonthYearPickerDialog";
import TimeWheelPicker from "./components/TimeWheelPicker";
import useAutoFocusOnOpen from "./hooks/useAutoFocusOnOpen";
import useEventDraftEditor from "./hooks/useEventDraftEditor";
import useEventsMonthData from "./hooks/useEventsMonthData";
import useMobileFabVisibility from "./hooks/useMobileFabVisibility";
import useSwipeMonthChange from "./hooks/useSwipeMonthChange";
import {
  SWIPE_THRESHOLD,
} from "./events.constants";
import {
  addMonths,
  fromDateKey,
  startOfMonth,
  toDateKey,
} from "./utils/dateKeys";
import sortEventsByTime from "./utils/sortEventsByTime";

function Events() {
  const navigate = useNavigate(); // (not used here, leaving as-is)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const { t, language } = useTranslation();

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

  const fabVisible = useMobileFabVisibility(isMobile);

  const listRef = useRef(null);
  const calendarRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("default");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const handleMonthLoadError = useCallback(
    (error) => {
      setToast({
        open: true,
        message:
          error?.message ||
          t("eventsPage.loadFailed", "Failed to load events."),
        severity: "error",
      });
    },
    [t],
  );

  const {
    monthDate,
    selectedKey,
    setSelectedKey,
    eventsByDate,
    isLoading,
    isInitialLoad,
    fetchMonth,
    setActiveMonth,
    calendarCells,
    calendarPillLayout,
    calendarRowCount,
    lastRowStartIndex,
    monthLabel,
    yearLabel,
    weekdayLabels,
  } = useEventsMonthData({
    fallbackColor: ACCENT_CYAN,
    t,
    onError: handleMonthLoadError,
  });

  const editor = useEventDraftEditor({
    selectedKey,
    monthDate,
    fetchMonth,
    t,
    theme,
    isMobile,
    setIsMobileSearchOpen,
  });

  const searchPlaceholder = useMemo(() => {
    if (searchFilter === "location") {
      return t("search.byLocation", "Search by Location");
    }
    if (searchFilter === "date") {
      return t("search.byDate", "Search by Date");
    }
    return t("search.eventsPlaceholder", "Search events...");
  }, [searchFilter, t]);

  const calendarLocale = language === "zh-CN" ? "zh-cn" : "en";

  useEffect(() => {
    dayjs.locale(calendarLocale);
  }, [calendarLocale]);

  const inlineCalendarValue = useMemo(() => {
    const key =
      editor.inlineCalendarOpenFor === "end"
        ? editor.draftEndDateKey
        : editor.draftStartDateKey;
    const fallback = editor.addSheetDate || new Date();
    return dayjs(fromDateKey(key) || fallback);
  }, [
    editor.inlineCalendarOpenFor,
    editor.draftEndDateKey,
    editor.draftStartDateKey,
    editor.addSheetDate,
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

  useAutoFocusOnOpen({
    enabled: isMobile,
    open: isMobileSearchOpen,
    inputRef: searchInputRef,
    delayMs: 0,
  });

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const selectedDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);
  const selectedEvents = useMemo(
    () => eventsByDate[selectedKey] || [],
    [eventsByDate, selectedKey],
  );
  const selectedEventsSortedByTime = useMemo(
    () => sortEventsByTime(selectedEvents),
    [selectedEvents],
  );

  const isToday = useCallback(
    (date) => {
      if (!date) return false;
      return toDateKey(date) === todayKey;
    },
    [todayKey],
  );

  const handleMonthChange = useCallback(
    (delta) => {
      const next = addMonths(monthDate, delta);
      setActiveMonth(next, next);
    },
    [monthDate, setActiveMonth],
  );

  const { isSwipingRef } = useSwipeMonthChange({
    enabled: isMobile,
    calendarRef,
    onChangeMonth: handleMonthChange,
    threshold: SWIPE_THRESHOLD,
  });

  const isSameMonth = (date) =>
    date &&
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth();

  const isSelected = (date) => {
    if (!date) return false;
    return toDateKey(date) === selectedKey;
  };

  const handleSelectDate = (date) => {
    if (isSwipingRef.current) return;
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

  const handleSaveEvent = useCallback(
    () => editor.handleSaveEvent({ setToast, setSelectedKey }),
    [editor, setSelectedKey],
  );

  const handleDeleteEvent = useCallback(
    () => editor.handleDeleteEvent({ setToast }),
    [editor],
  );

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
          <MobileSearchBar
            open={isMobileSearchOpen}
            inputRef={searchInputRef}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeValue={setSearchQuery}
            filter={searchFilter}
            onSelectFilter={setSearchFilter}
          />
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
            <EventListPanel
              isLoading={isLoading}
              selectedDate={selectedDate}
              events={selectedEventsSortedByTime}
              onSelectEvent={editor.openEditSheet}
              t={t}
            />
          </Grid>
        </Grid>
      </MDBox>

      <MonthYearPickerDialog
        open={isPickerOpen}
        view={pickerView}
        onClose={closeMonthYearPicker}
        monthDate={monthDate}
        onPickYear={handlePickYear}
        onPickMonth={handlePickMonth}
        t={t}
      />

      <AddEventDrawer
        closeAddSheet={editor.closeAddSheet}
        dateTimeButtonSx={dateTimeButtonSx}
        draftAllDay={editor.draftAllDay}
        draftEndTime={editor.draftEndTime}
        draftLocation={editor.draftLocation}
        draftRepeat={editor.draftRepeat}
        draftStartTime={editor.draftStartTime}
        draftTagColor={editor.draftTagColor}
        draftTitle={editor.draftTitle}
        endDateButtonLabel={editor.endDateButtonLabel}
        endInlinePanelMode={editor.endInlinePanelMode}
        formRowSx={formRowSx}
        onPrimaryAction={handleSaveEvent}
        primaryActionLabel={
          editor.editorMode === "edit"
            ? t("buttons.save", "Save")
            : t("buttons.add", "Add")
        }
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
        setDraftRepeat={editor.setDraftRepeat}
        setDraftTagColor={editor.setDraftTagColor}
        setDraftTitle={editor.setDraftTitle}
        setInlineCalendarOpenFor={editor.setInlineCalendarOpenFor}
        setInlineTimeOpenFor={editor.setInlineTimeOpenFor}
        sheetTitle={
          editor.editorMode === "edit"
            ? t("eventsForm.editTitle", "Edit Event")
            : t("eventsForm.title", "New Event")
        }
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

      <Footer />

      {isMobile && (
        <AddEventFab
          onClick={editor.openAddSheet}
          ariaLabel={t("eventsPage.addEvent", "Add event")}
          visible={fabVisible && !editor.isAddSheetOpen}
        />
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
