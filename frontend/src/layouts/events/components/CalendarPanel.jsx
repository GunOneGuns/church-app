import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { ACCENT_CYAN } from "constants.js";
import {
  CALENDAR_PILL_GAP,
  CALENDAR_PILL_HEIGHT,
  CALENDAR_PILL_TOP_OFFSET_DESKTOP,
  CALENDAR_PILL_TOP_OFFSET_MOBILE,
  CELL_HEIGHT_DESKTOP,
  CELL_HEIGHT_MOBILE,
} from "../events.constants";
import { toDateKey } from "../utils/dateKeys";

export default function CalendarPanel({
  calendarCells,
  calendarPillLayout,
  calendarRef,
  calendarRowCount,
  handleMonthChange,
  handleSelectDate,
  isInitialLoad,
  isLoading,
  isMobile,
  isSelected,
  isToday,
  lastRowStartIndex,
  monthLabel,
  openMonthPicker,
  openYearPicker,
  t,
  weekdayLabels,
  yearLabel,
}) {
  return (
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
            position: "relative",
          }}
        >
          {calendarPillLayout.segments.map((segment) => {
            const rowHeight = isMobile ? CELL_HEIGHT_MOBILE : CELL_HEIGHT_DESKTOP;
            const topOffset = isMobile
              ? CALENDAR_PILL_TOP_OFFSET_MOBILE
              : CALENDAR_PILL_TOP_OFFSET_DESKTOP;
            const leftPct = (segment.colStart / 7) * 100;
            const widthPct = (segment.colSpan / 7) * 100;
            const top =
              segment.row * rowHeight +
              topOffset +
              segment.lane * (CALENDAR_PILL_HEIGHT + CALENDAR_PILL_GAP);

            return (
              <MDBox
                key={segment.key}
                sx={{
                  position: "absolute",
                  top: `${top}px`,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  height: CALENDAR_PILL_HEIGHT,
                  bgcolor: segment.color || ACCENT_CYAN,
                  color: "#fff",
                  borderRadius: "12px",
                  px: 0.75,
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  fontSize: isMobile ? "0.65rem" : "0.7rem",
                  fontWeight: 500,
                  lineHeight: 1.2,
                  zIndex: 2,
                  pointerEvents: "none",
                  boxShadow: "0 1px 0 rgba(0,0,0,0.08)",
                }}
              >
                {segment.title}
              </MDBox>
            );
          })}
          {calendarCells.map(({ index, isInMonth, date, dayNum }) => {
            const selected = isSelected(date);
            const isTodayDate = isToday(date);
            const hiddenCount =
              calendarPillLayout.hiddenCountByDateKey[toDateKey(date)] || 0;

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

                  {isInMonth && hiddenCount > 0 && (
                    <MDTypography
                      variant="caption"
                      sx={{
                        mt: "auto",
                        fontSize: isMobile ? "0.6rem" : "0.65rem",
                        fontWeight: 600,
                        color: "text.secondary",
                        pl: 0.5,
                        lineHeight: 1.2,
                      }}
                    >
                      +{hiddenCount}
                    </MDTypography>
                  )}
                </MDBox>
              </MDBox>
            );
          })}
        </MDBox>
      </MDBox>
    </>
  );
}

