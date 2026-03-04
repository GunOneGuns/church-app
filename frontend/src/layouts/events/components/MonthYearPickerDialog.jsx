import { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";

export default function MonthYearPickerDialog({
  open,
  view,
  onClose,
  monthDate,
  onPickYear,
  onPickMonth,
  t,
}) {
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>
        {view === "year"
          ? t("eventsPage.selectYear", "Select year")
          : t("eventsPage.selectMonth", "Select month")}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {view === "year" ? (
          <List dense sx={{ maxHeight: 420, overflow: "auto" }}>
            {yearOptions.map((year) => (
              <ListItemButton
                key={year}
                selected={year === monthDate.getFullYear()}
                onClick={() => onPickYear?.(year)}
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
                onClick={() => onPickMonth?.(idx)}
                sx={{ py: 1.2 }}
              >
                {label}
              </MDButton>
            ))}
          </MDBox>
        )}
      </DialogContent>
      <DialogActions>
        <MDButton variant="text" color="secondary" onClick={onClose}>
          {t("buttons.cancel", "Cancel")}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

