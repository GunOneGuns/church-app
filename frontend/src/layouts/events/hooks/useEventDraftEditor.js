import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEvent, deleteEvent, restoreEvent, updateEvent } from "services/convo-broker";
import { ACCENT_CYAN } from "constants.js";
import { addDays, formatDateButton, fromDateKey, toDateKey } from "../utils/dateKeys";

export default function useEventDraftEditor({
  selectedKey,
  monthDate,
  fetchMonth,
  t,
  theme,
  isMobile,
  setIsMobileSearchOpen,
}) {
  const lastDeletedEventIdRef = useRef(null);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("add"); // "add" | "edit"
  const [editingEventId, setEditingEventId] = useState(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftPeopleInvolved, setDraftPeopleInvolved] = useState([]);
  const [draftAllDay, setDraftAllDay] = useState(false);
  const [draftStartTime, setDraftStartTime] = useState("09:00");
  const [draftEndTime, setDraftEndTime] = useState("10:00");
  const [draftTagColor, setDraftTagColor] = useState("info");
  const [draftRepeat, setDraftRepeat] = useState("never");
  const [draftStartDateKey, setDraftStartDateKey] = useState(selectedKey);
  const [draftEndDateKey, setDraftEndDateKey] = useState(selectedKey);
  const [inlineCalendarOpenFor, setInlineCalendarOpenFor] = useState(null); // "start" | "end" | null
  const [inlineTimeOpenFor, setInlineTimeOpenFor] = useState(null); // "start" | "end" | null

  const titleInputRef = useRef(null);
  const locationInputRef = useRef(null);

  const addSheetDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);

  useEffect(() => {
    if (!draftAllDay) return;
    if (!selectedKey) return;
    setDraftStartDateKey(selectedKey);
    setDraftEndDateKey(selectedKey);
    setInlineCalendarOpenFor(null);
    setInlineTimeOpenFor(null);
  }, [draftAllDay, selectedKey]);

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

  const openAddSheet = useCallback(() => {
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
    setDraftNotes("");
    setDraftPeopleInvolved([]);
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
    setIsMobileSearchOpen?.(false);
  }, [selectedKey, setIsMobileSearchOpen]);

  const openEditSheet = useCallback(
    (eventItem) => {
      if (!eventItem?.id) return;
      setEditorMode("edit");
      setEditingEventId(String(eventItem.id));
      setDraftTitle(String(eventItem.title || ""));
      setDraftLocation(String(eventItem.location || ""));
      setDraftNotes(String(eventItem.notes || eventItem.description || ""));
      setDraftPeopleInvolved(
        Array.isArray(eventItem.peopleInvolved) ? eventItem.peopleInvolved : [],
      );
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
      setIsMobileSearchOpen?.(false);
    },
    [selectedKey, setIsMobileSearchOpen],
  );

  const closeAddSheet = useCallback(() => setIsAddSheetOpen(false), []);

  const toggleInlineCalendar = useCallback(
    (target) => {
      if (draftAllDay) return;
      setInlineTimeOpenFor(null);
      if (inlineCalendarOpenFor === target) {
        setInlineCalendarOpenFor(null);
        return;
      }
      setInlineCalendarOpenFor(target);
    },
    [draftAllDay, inlineCalendarOpenFor],
  );

  const toggleInlineTime = useCallback(
    (target) => {
      if (draftAllDay) return;
      setInlineCalendarOpenFor(null);
      if (inlineTimeOpenFor === target) {
        setInlineTimeOpenFor(null);
        return;
      }
      setInlineTimeOpenFor(target);
    },
    [draftAllDay, inlineTimeOpenFor],
  );

  const handleSaveEvent = useCallback(
    async ({ setToast, setSelectedKey }) => {
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
            notes: String(draftNotes || ""),
            peopleInvolved: Array.isArray(draftPeopleInvolved)
              ? draftPeopleInvolved
              : [],
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
            notes: String(draftNotes || ""),
            peopleInvolved: Array.isArray(draftPeopleInvolved)
              ? draftPeopleInvolved
              : [],
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
        const toastFallback = editorMode === "edit" ? "Event updated." : "Event added.";

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
    },
    [
      isSavingEvent,
      draftTitle,
      isInvalidDateTimeRange,
      tagColorMap,
      draftTagColor,
      editorMode,
      editingEventId,
      draftLocation,
      draftAllDay,
      draftStartDateKey,
      draftEndDateKey,
      draftStartTime,
      draftEndTime,
      draftNotes,
      draftPeopleInvolved,
      draftRepeat,
      t,
      fetchMonth,
      monthDate,
    ],
  );

  const handleDeleteEvent = useCallback(
    async ({ setToast }) => {
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
          message: error?.message || t("eventsForm.errors.deleteFailed", "Delete failed."),
          severity: "error",
          actionLabel: undefined,
          onAction: undefined,
          autoHideDuration: undefined,
        });
      } finally {
        setIsSavingEvent(false);
      }
    },
    [editingEventId, editorMode, fetchMonth, isSavingEvent, monthDate, t],
  );

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

  return {
    // sheet state
    isAddSheetOpen,
    editorMode,
    isSavingEvent,
    closeAddSheet,
    openAddSheet,
    openEditSheet,
    handleSaveEvent,
    handleDeleteEvent,

    // draft fields
    draftTitle,
    setDraftTitle,
    draftLocation,
    setDraftLocation,
    draftNotes,
    setDraftNotes,
    draftPeopleInvolved,
    setDraftPeopleInvolved,
    draftAllDay,
    setDraftAllDay,
    draftStartTime,
    setDraftStartTime,
    draftEndTime,
    setDraftEndTime,
    draftTagColor,
    setDraftTagColor,
    draftRepeat,
    setDraftRepeat,
    draftStartDateKey,
    setDraftStartDateKey,
    draftEndDateKey,
    setDraftEndDateKey,

    // inline pickers
    inlineCalendarOpenFor,
    setInlineCalendarOpenFor,
    inlineTimeOpenFor,
    setInlineTimeOpenFor,
    toggleInlineCalendar,
    toggleInlineTime,
    startInlinePanelMode,
    endInlinePanelMode,

    // computed
    addSheetDate,
    startDateButtonLabel,
    endDateButtonLabel,
    isInvalidDateTimeRange,
    tagColorOptions,
    tagColorMap,
    repeatOptions,
    repeatOptionMap,

    // refs
    titleInputRef,
    locationInputRef,
  };
}
