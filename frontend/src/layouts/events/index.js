import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function Events() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setShowEventDialog(true);
  };

  const handleAddEvent = () => {
    if (eventTitle && selectedDate) {
      setEvents([...events, {
        id: Date.now(),
        date: selectedDate.toDateString(),
        title: eventTitle,
        description: eventDescription
      }]);
      setEventTitle("");
      setEventDescription("");
      setShowEventDialog(false);
    }
  };

  const getEventsForDate = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    return events.filter(event => event.date === dateStr);
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const day = i - startingDayOfWeek + 1;
      const isValidDay = day > 0 && day <= daysInMonth;
      const dayEvents = isValidDay ? getEventsForDate(day) : [];

      days.push(
        <MDBox
          key={i}
          sx={{
            border: 1,
            borderColor: "divider",
            minHeight: 100,
            p: 1,
            cursor: isValidDay ? "pointer" : "default",
            bgcolor: isValidDay ? "transparent" : "grey.100",
            "&:hover": isValidDay ? { bgcolor: "grey.50" } : {}
          }}
          onClick={() => isValidDay && handleDateClick(day)}
        >
          {isValidDay && (
            <>
              <MDTypography variant="button" fontWeight="bold">
                {day}
              </MDTypography>
              {dayEvents.map(event => (
                <MDBox
                  key={event.id}
                  sx={{
                    bgcolor: "info.main",
                    color: "white",
                    p: 0.5,
                    mt: 0.5,
                    borderRadius: 1,
                    fontSize: "0.75rem"
                  }}
                >
                  {event.title}
                </MDBox>
              ))}
            </>
          )}
        </MDBox>
      );
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["events"]} />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={3}
                sx={{ borderBottom: 1, borderColor: "divider" }}
              >
                <MDBox display="flex" alignItems="center" gap={2}>
                  <IconButton onClick={previousMonth} size="small">
                    <Icon>chevron_left</Icon>
                  </IconButton>
                  <MDTypography variant="h4">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </MDTypography>
                  <IconButton onClick={nextMonth} size="small">
                    <Icon>chevron_right</Icon>
                  </IconButton>
                </MDBox>
              </MDBox>

              <MDBox p={3}>
                <Grid container spacing={0}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <Grid item xs={12 / 7} key={day}>
                      <MDBox
                        sx={{
                          textAlign: "center",
                          fontWeight: "bold",
                          p: 1,
                          borderBottom: 2,
                          borderColor: "divider"
                        }}
                      >
                        <MDTypography variant="button" fontWeight="bold">
                          {day}
                        </MDTypography>
                      </MDBox>
                    </Grid>
                  ))}
                  {renderCalendarDays().map((day, index) => (
                    <Grid item xs={12 / 7} key={index}>
                      {day}
                    </Grid>
                  ))}
                </Grid>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <Dialog open={showEventDialog} onClose={() => setShowEventDialog(false)}>
        <DialogTitle>Add Event</DialogTitle>
        <DialogContent>
          <MDBox pt={2}>
            <TextField
              fullWidth
              label="Event Title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
            />
          </MDBox>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setShowEventDialog(false)} color="secondary">
            Cancel
          </MDButton>
          <MDButton onClick={handleAddEvent} color="info">
            Add Event
          </MDButton>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default Events;
