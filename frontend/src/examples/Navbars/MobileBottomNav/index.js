import { useMemo, useState } from "react";

// react-router components
import { useLocation, useNavigate } from "react-router-dom";

import { setMiniSidenav, useMaterialUIController } from "context";

import MobileStartOverlays from "components/MobileStartOverlays";

// @mui material components
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Icon from "@mui/material/Icon";

const getActiveTab = (pathname = "") => {
  const normalized = pathname.toLowerCase();

  if (normalized === "/" || normalized.startsWith("/home")) {
    return "home";
  }

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
  const [, dispatch] = useMaterialUIController();
  const [peopleOverlayOpen, setPeopleOverlayOpen] = useState(false);

  const value = useMemo(() => getActiveTab(location.pathname), [location.pathname]);

  const handleChange = (_event, nextValue) => {
    if (nextValue !== "people") {
      setPeopleOverlayOpen(false);
    }

    if (nextValue === "settings") {
      setMiniSidenav(dispatch, false);
      return;
    }

    setMiniSidenav(dispatch, true);

    if (nextValue === "people") {
      setPeopleOverlayOpen(true);
      return;
    }

    navigate(`/${nextValue}`);
  };

  return (
    <>
      <MobileStartOverlays
        open={peopleOverlayOpen}
        onComplete={() => {
          setPeopleOverlayOpen(false);
          navigate("/people");
        }}
      />
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
        <BottomNavigation
          showLabels
          value={peopleOverlayOpen ? "people" : value}
          onChange={handleChange}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<Icon fontSize="small">home</Icon>}
          />
          <BottomNavigationAction
            label="People"
            value="people"
            icon={<Icon fontSize="small">person</Icon>}
          />
          <BottomNavigationAction
            label="Group"
            value="groups"
            icon={<Icon fontSize="small">groups</Icon>}
          />
          <BottomNavigationAction
            label="Event"
            value="events"
            icon={<Icon fontSize="small">event</Icon>}
          />
          <BottomNavigationAction
            label="Setting"
            value="settings"
            icon={<Icon fontSize="small">settings</Icon>}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
}
