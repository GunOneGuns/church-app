import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import CircularProgress from "@mui/material/CircularProgress";
import InputBase from "@mui/material/InputBase";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { ACCENT_CYAN } from "constants.js";
import { lookupSingaporePostalCode } from "services/convo-broker";
import AnimatedInlinePanel from "./AnimatedInlinePanel";

export default function AddEventDrawer({
  closeAddSheet,
  dateTimeButtonSx,
  draftAllDay,
  draftEndTime,
  draftLocation,
  draftNotes,
  draftRepeat,
  draftStartTime,
  draftTagColor,
  draftTitle,
  endDateButtonLabel,
  endInlinePanelMode,
  formRowSx,
  inlineCalendarContent,
  inlineCalendarOpenFor,
  inlineTimeContent,
  inlineTimeOpenFor,
  inputRowFieldSx,
  isAddSheetOpen,
  isInvalidDateTimeRange,
  isSavingEvent,
  locationInputRef,
  repeatOptionMap,
  repeatOptions,
  sectionCardSx,
  sectionDividerSx,
  showDelete,
  onDelete,
  deleteLabel,
  setDraftAllDay,
  setDraftLocation,
  setDraftNotes,
  setDraftRepeat,
  setDraftTagColor,
  setDraftTitle,
  setInlineCalendarOpenFor,
  setInlineTimeOpenFor,
  sheetTitle,
  startDateButtonLabel,
  startInlinePanelMode,
  t,
  tagColorMap,
  tagColorOptions,
  theme,
  titleInputRef,
  toggleInlineCalendar,
  toggleInlineTime,
  primaryActionLabel,
  onPrimaryAction,
}) {
  const [postalSuggestions, setPostalSuggestions] = useState([]);
  const [isPostalLookupLoading, setIsPostalLookupLoading] = useState(false);

  useEffect(() => {
    const input = String(draftLocation || "").trim();
    if (!isAddSheetOpen) {
      setPostalSuggestions([]);
      setIsPostalLookupLoading(false);
      return undefined;
    }
    if (!/^\d{6}$/.test(input)) {
      setPostalSuggestions([]);
      setIsPostalLookupLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsPostalLookupLoading(true);
    const timer = setTimeout(async () => {
      try {
        const payload = await lookupSingaporePostalCode(input);
        if (cancelled) return;
        setPostalSuggestions(
          Array.isArray(payload?.suggestions) ? payload.suggestions : [],
        );
      } catch (_error) {
        if (!cancelled) {
          setPostalSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsPostalLookupLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draftLocation, isAddSheetOpen]);

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={isAddSheetOpen}
      onClose={closeAddSheet}
      onOpen={() => {}}
      disableDiscovery
      disableSwipeToOpen
      sx={{
        width: "100%",
        "& .MuiDrawer-paper": {
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          left: 0,
          right: 0,
          boxSizing: "border-box",
        },
      }}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          height: "100dvh",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          overflow: "hidden",
          bgcolor: "grey.300",
        },
      }}
    >
      <MDBox sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MDBox sx={{ pt: 1, pb: 1, px: 2, bgcolor: "grey.300" }}>
          <MDBox
            sx={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 1,
            }}
          >
            <MDButton
              variant="text"
              onClick={closeAddSheet}
              disabled={isSavingEvent}
              sx={(muiTheme) => ({
                minWidth: 0,
                px: 0.5,
                textTransform: "none",
                fontSize: muiTheme.typography.h6.fontSize,
                lineHeight: muiTheme.typography.h6.lineHeight,
                color: muiTheme.palette.text.primary,
              })}
            >
              <Icon fontSize="inherit">arrow_back</Icon>
            </MDButton>

            <MDTypography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center" }}
            >
              {sheetTitle}
            </MDTypography>

            <MDButton
              variant="text"
              onClick={onPrimaryAction}
              disabled={isSavingEvent}
              sx={{
                minWidth: 0,
                px: 0.5,
                textTransform: "none",
                fontSize: theme.typography.h6.fontSize,
                lineHeight: theme.typography.h6.lineHeight,
                color: ACCENT_CYAN,
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.08)" },
              }}
            >
              {isSavingEvent ? (
                <CircularProgress size={18} sx={{ color: ACCENT_CYAN }} />
              ) : (
                primaryActionLabel
              )}
            </MDButton>
          </MDBox>
        </MDBox>

        <MDBox
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 2,
            py: 2,
            pb: "calc(env(safe-area-inset-bottom) + 96px)",
          }}
        >
          <MDBox sx={{ ...sectionCardSx, mb: 2 }}>
            <MDBox sx={formRowSx} onClick={() => titleInputRef.current?.focus()}>
              <InputBase
                inputRef={titleInputRef}
                placeholder={t("eventsForm.fields.title", "Title")}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                fullWidth
                sx={inputRowFieldSx}
              />
            </MDBox>

            <Divider sx={sectionDividerSx} />

            <MDBox
              sx={formRowSx}
              onClick={() => locationInputRef.current?.focus()}
            >
              <InputBase
                inputRef={locationInputRef}
                placeholder={t("eventsForm.fields.location", "Location")}
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                fullWidth
                sx={inputRowFieldSx}
              />
            </MDBox>

            {String(draftLocation || "").trim().match(/^\d{6}$/) ? (
              <>
                <Divider sx={sectionDividerSx} />
                <MDBox sx={{ px: 2, py: 1.25 }}>
                  {isPostalLookupLoading ? (
                    <MDTypography variant="caption" color="text">
                      {t("eventsForm.postal.loading")}
                    </MDTypography>
                  ) : postalSuggestions.length ? (
                    <MDBox display="flex" flexDirection="column" gap={0.5}>
                      {postalSuggestions.map((suggestion, idx) => (
                        <MDButton
                          key={`${suggestion?.label || ""}-${idx}`}
                          variant="text"
                          onClick={() => {
                            setDraftLocation(String(suggestion?.label || ""));
                            setPostalSuggestions([]);
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            textTransform: "none",
                            px: 0,
                            py: 0.25,
                            minHeight: 0,
                            color: "text.primary",
                          }}
                        >
                          <MDTypography
                            variant="button"
                            fontWeight="regular"
                            sx={{ textAlign: "left", lineHeight: 1.35 }}
                          >
                            {suggestion?.label}
                          </MDTypography>
                        </MDButton>
                      ))}
                    </MDBox>
                  ) : (
                    <MDTypography variant="caption" color="text">
                      {t("eventsForm.postal.noResults")}
                    </MDTypography>
                  )}
                </MDBox>
              </>
            ) : null}
          </MDBox>

          <ClickAwayListener
            onClickAway={() => {
              setInlineCalendarOpenFor(null);
              setInlineTimeOpenFor(null);
            }}
          >
            <MDBox sx={sectionCardSx}>
              <MDBox sx={formRowSx}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  sx={{ lineHeight: 1.2 }}
                >
                  {t("eventsForm.fields.allDay", "All-day")}
                </MDTypography>

                <Switch
                  checked={draftAllDay}
                  onChange={(e) => setDraftAllDay(e.target.checked)}
                  color="success"
                  sx={(muiTheme) => ({
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: `${muiTheme.palette.success.main} !important`,
                      borderColor: `${muiTheme.palette.success.main} !important`,
                      opacity: "1 !important",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": {
                      borderColor: `${muiTheme.palette.success.main} !important`,
                    },
                  })}
                />
              </MDBox>

              <Divider sx={sectionDividerSx} />

              <MDBox sx={formRowSx}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  sx={{ lineHeight: 1.2 }}
                >
                  {t("eventsForm.fields.starts", "Starts")}
                </MDTypography>

                <MDBox display="flex" alignItems="center" gap={1}>
                  <MDButton
                    variant="text"
                    sx={[
                      dateTimeButtonSx,
                      inlineCalendarOpenFor === "start" && {
                        color: `${ACCENT_CYAN} !important`,
                      },
                    ]}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInlineCalendar("start");
                    }}
                  >
                    {startDateButtonLabel}
                  </MDButton>
                  {!draftAllDay && (
                    <MDButton
                      variant="text"
                      sx={[
                        dateTimeButtonSx,
                        inlineTimeOpenFor === "start" && {
                          color: `${ACCENT_CYAN} !important`,
                        },
                      ]}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInlineTime("start");
                      }}
                    >
                      {draftStartTime}
                    </MDButton>
                  )}
                </MDBox>
              </MDBox>

              <Divider sx={sectionDividerSx} />

              <AnimatedInlinePanel
                open={Boolean(startInlinePanelMode)}
                mode={startInlinePanelMode}
              >
                {startInlinePanelMode === "date" && inlineCalendarContent}
                {startInlinePanelMode === "time" && inlineTimeContent}
                <Divider sx={sectionDividerSx} />
              </AnimatedInlinePanel>

              <MDBox sx={formRowSx}>
                <MDTypography
                  variant="button"
                  fontWeight="regular"
                  sx={{ lineHeight: 1.2 }}
                >
                  {t("eventsForm.fields.ends", "Ends")}
                </MDTypography>

                <MDBox display="flex" alignItems="center" gap={1}>
                  <MDButton
                    variant="text"
                    sx={[
                      dateTimeButtonSx,
                      inlineCalendarOpenFor === "end" && {
                        color: `${ACCENT_CYAN} !important`,
                      },
                      isInvalidDateTimeRange && {
                        textDecoration: "line-through !important",
                        "&:hover": {
                          textDecoration: "line-through !important",
                        },
                        "&:active": {
                          textDecoration: "line-through !important",
                        },
                        "&:focus": {
                          textDecoration: "line-through !important",
                        },
                        "&.Mui-focusVisible": {
                          textDecoration: "line-through !important",
                        },
                      },
                    ]}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInlineCalendar("end");
                    }}
                  >
                    {endDateButtonLabel}
                  </MDButton>
                  {!draftAllDay && (
                    <MDButton
                      variant="text"
                      sx={[
                        dateTimeButtonSx,
                        inlineTimeOpenFor === "end" && {
                          color: `${ACCENT_CYAN} !important`,
                        },
                        isInvalidDateTimeRange && {
                          textDecoration: "line-through !important",
                          "&:hover": {
                            textDecoration: "line-through !important",
                          },
                          "&:active": {
                            textDecoration: "line-through !important",
                          },
                          "&:focus": {
                            textDecoration: "line-through !important",
                          },
                          "&.Mui-focusVisible": {
                            textDecoration: "line-through !important",
                          },
                        },
                      ]}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInlineTime("end");
                      }}
                    >
                      {draftEndTime}
                    </MDButton>
                  )}
                </MDBox>
              </MDBox>

              <AnimatedInlinePanel
                open={Boolean(endInlinePanelMode)}
                mode={endInlinePanelMode}
              >
                <Divider sx={sectionDividerSx} />
                {endInlinePanelMode === "date" && inlineCalendarContent}
                {endInlinePanelMode === "time" && inlineTimeContent}
              </AnimatedInlinePanel>
            </MDBox>
          </ClickAwayListener>

          <MDBox sx={{ ...sectionCardSx, mt: 2 }}>
            <MDBox sx={formRowSx}>
              <MDTypography
                variant="button"
                fontWeight="regular"
                sx={{ lineHeight: 1.2 }}
              >
                {t("eventsForm.fields.tagColour", "Tag Colour")}
              </MDTypography>

              <Select
                value={draftTagColor}
                onChange={(e) => setDraftTagColor(e.target.value)}
                variant="standard"
                disableUnderline
                IconComponent={() => null}
                SelectDisplayProps={{
                  style: { WebkitTapHighlightColor: "transparent" },
                }}
                MenuProps={{
                  anchorOrigin: { vertical: "bottom", horizontal: "right" },
                  transformOrigin: { vertical: "top", horizontal: "right" },
                }}
                sx={{
                  width: 64,
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    pr: 0,
                    pl: 0,
                    backgroundColor: "transparent !important",
                    WebkitTapHighlightColor: "transparent",
                  },
                  "& .MuiSelect-select:focus": {
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiSelect-select:active": {
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiSelect-select.Mui-focusVisible": {
                    backgroundColor: "transparent !important",
                  },
                }}
                renderValue={(value) => {
                  const opt = tagColorMap.get(value);
                  return (
                    <MDBox display="flex" alignItems="center" gap={0.5}>
                      <MDBox
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          bgcolor: opt?.color || theme.palette.info.main,
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      />
                      <UnfoldMoreIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </MDBox>
                  );
                }}
              >
                {tagColorOptions.map((opt) => (
                  <MenuItem
                    key={opt.key}
                    value={opt.key}
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <MDBox display="flex" alignItems="center" gap={1.25}>
                      <MDBox
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          bgcolor: opt.color,
                          border: "1px solid rgba(0,0,0,0.08)",
                          flexShrink: 0,
                        }}
                      />
                      <MDTypography variant="button" fontWeight="regular">
                        {opt.label}
                      </MDTypography>
                    </MDBox>
                  </MenuItem>
                ))}
              </Select>
            </MDBox>
          </MDBox>

          <MDBox sx={{ ...sectionCardSx, mt: 2 }}>
            <MDBox sx={formRowSx}>
              <MDTypography
                variant="button"
                fontWeight="regular"
                sx={{ lineHeight: 1.2 }}
              >
                {t("eventsForm.fields.repeat", "Repeat")}
              </MDTypography>

              <Select
                value={draftRepeat}
                onChange={(e) => setDraftRepeat(e.target.value)}
                variant="standard"
                disableUnderline
                IconComponent={() => null}
                SelectDisplayProps={{
                  style: { WebkitTapHighlightColor: "transparent" },
                }}
                MenuProps={{
                  anchorOrigin: { vertical: "bottom", horizontal: "right" },
                  transformOrigin: { vertical: "top", horizontal: "right" },
                }}
                sx={{
                  minWidth: 148,
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.75,
                    pr: 0,
                    pl: 0,
                    whiteSpace: "nowrap",
                    backgroundColor: "transparent !important",
                    WebkitTapHighlightColor: "transparent",
                  },
                  "& .MuiSelect-select:focus": {
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiSelect-select:active": {
                    backgroundColor: "transparent !important",
                  },
                  "& .MuiSelect-select.Mui-focusVisible": {
                    backgroundColor: "transparent !important",
                  },
                }}
                renderValue={(value) => {
                  const opt = repeatOptionMap.get(value);
                  return (
                    <MDBox display="flex" alignItems="center" gap={0.75}>
                      <MDTypography
                        variant="button"
                        fontWeight="regular"
                        sx={{ lineHeight: 1.2 }}
                      >
                        {opt?.label || t("eventsForm.repeat.never", "Never")}
                      </MDTypography>
                      <UnfoldMoreIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </MDBox>
                  );
                }}
              >
                {repeatOptions.map((opt) => (
                  <MenuItem
                    key={opt.key}
                    value={opt.key}
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <MDTypography variant="button" fontWeight="regular">
                      {opt.label}
                    </MDTypography>
                  </MenuItem>
                ))}
              </Select>
            </MDBox>
          </MDBox>

          <MDBox sx={{ ...sectionCardSx, mt: 2, p: 2 }}>
            <MDTypography
              variant="button"
              fontWeight="regular"
              sx={{ lineHeight: 1.2, mb: 1 }}
            >
              {t("eventsForm.fields.notes")}
            </MDTypography>
            <TextField
              placeholder={t("eventsForm.placeholders.notes")}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              disabled={isSavingEvent}
              multiline
              rows={4}
              fullWidth
              sx={{
                "& .MuiInputBase-inputMultiline": {
                  overflowY: "auto",
                },
              }}
            />
          </MDBox>

          {showDelete ? (
            <MDBox sx={{ ...sectionCardSx, mt: 2 }}>
              <MDBox sx={formRowSx}>
                <MDButton
                  variant="text"
                  color="error"
                  onClick={onDelete}
                  disabled={isSavingEvent}
                  sx={{
                    minWidth: 0,
                    px: 0,
                    textTransform: "none",
                    justifyContent: "center",
                  }}
                  fullWidth
                >
                  {deleteLabel}
                </MDButton>
              </MDBox>
            </MDBox>
          ) : null}
        </MDBox>
      </MDBox>
    </SwipeableDrawer>
  );
}
