import { useMemo } from "react";

// react-router components
import { useLocation, useNavigate } from "react-router-dom";

// @mui material components
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Icon from "@mui/material/Icon";

const getActiveTab = (pathname = "") => {
  const normalized = pathname.toLowerCase();

  if (normalized.startsWith("/groups") || normalized.startsWith("/group")) {
    return "groups";
  }

  if (normalized.startsWith("/events") || normalized.startsWith("/event")) {
    return "events";
  }

  return "people";
};

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const value = useMemo(() => getActiveTab(location.pathname), [location.pathname]);

  const handleChange = (_event, nextValue) => {
    if (nextValue === value) {
      navigate(`/${nextValue}`);
      return;
    }

    navigate(`/${nextValue}`);
  };

  return (
    <Paper
      elevation={8}
      sx={(theme) => ({
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        pb: "env(safe-area-inset-bottom)",
      })}
    >
      <BottomNavigation showLabels value={value} onChange={handleChange}>
        <BottomNavigationAction
          label="People"
          value="people"
          icon={<Icon fontSize="small">person</Icon>}
        />
        <BottomNavigationAction
          label="Groups"
          value="groups"
          icon={<Icon fontSize="small">groups</Icon>}
        />
        <BottomNavigationAction
          label="Events"
          value="events"
          icon={<Icon fontSize="small">event</Icon>}
        />
      </BottomNavigation>
    </Paper>
  );
}

