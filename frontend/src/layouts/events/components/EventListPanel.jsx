import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { ACCENT_CYAN } from "constants.js";

export default function EventListPanel({
  isLoading,
  selectedDate,
  events,
  onSelectEvent,
  t,
}) {
  return (
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
      ) : events?.length ? (
        <MDBox display="flex" flexDirection="column" gap={1.5}>
          {events.map((eventItem) => (
            <Card
              key={eventItem.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                "&:hover": { boxShadow: 5 },
              }}
              onClick={() => onSelectEvent?.(eventItem)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectEvent?.(eventItem);
                }
              }}
            >
              <MDBox
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
                sx={{ minWidth: 0 }}
              >
                <MDTypography
                  variant="button"
                  fontWeight="bold"
                  noWrap
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
              {eventItem.notes || eventItem.description ? (
                <MDTypography
                  variant="body2"
                  mt={0.75}
                  noWrap
                  sx={{ minWidth: 0 }}
                >
                  {eventItem.notes || eventItem.description}
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
  );
}
