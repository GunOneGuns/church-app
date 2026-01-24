import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  setMiniSidenav,
  setMobileNavbarTitle,
  useMaterialUIController,
} from "context";
import MobileStartOverlays from "components/MobileStartOverlays";

import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Icon from "@mui/material/Icon";

import { ACCENT_CYAN } from "constants.js";

const getActiveTab = (pathname = "") => {
  const normalized = pathname.toLowerCase();
  if (normalized === "/" || normalized.startsWith("/home")) return "home";
  if (normalized.startsWith("/groups") || normalized.startsWith("/group"))
    return "groups";
  if (normalized.startsWith("/events") || normalized.startsWith("/event"))
    return "events";
  if (normalized.startsWith("/people") || normalized.startsWith("/person"))
    return "people";
  return "home";
};

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [controller, dispatch] = useMaterialUIController();
  const { mobileNavbarTitle } = controller;

  const [peopleOverlayOpen, setPeopleOverlayOpen] = useState(false);

  const value = useMemo(
    () => getActiveTab(location.pathname),
    [location.pathname],
  );

  // Open overlay when we arrive at /people via navigation state
  // IMPORTANT: we do NOT clear location.state here (People page needs it)
  useEffect(() => {
    const shouldOpen =
      location.pathname.toLowerCase().startsWith("/people") &&
      location.state?.openPeopleOverlay === true;

    if (!shouldOpen) return;

    setPeopleOverlayOpen(true);
    setMobileNavbarTitle(dispatch, "People");
  }, [location.pathname, location.state, dispatch]);

  // Clear title when leaving people (and overlay isn't open)
  useEffect(() => {
    if (peopleOverlayOpen) return;
    const pathname = location.pathname.toLowerCase();
    if (mobileNavbarTitle === "People" && !pathname.startsWith("/people")) {
      setMobileNavbarTitle(dispatch, null);
    }
  }, [dispatch, location.pathname, mobileNavbarTitle, peopleOverlayOpen]);

  const handleChange = (_event, nextValue) => {
    if (nextValue !== "people") {
      setPeopleOverlayOpen(false);
      if (mobileNavbarTitle) setMobileNavbarTitle(dispatch, null);
    }

    if (nextValue === "settings") {
      setMiniSidenav(dispatch, false);
      return;
    }

    setMiniSidenav(dispatch, true);

    if (nextValue === "people") {
      setMobileNavbarTitle(dispatch, "People");
      navigate("/people", { state: { openPeopleOverlay: true } });
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

          // IMPORTANT: only after user passes overlay, clear the state
          // so People page switches title to "Brothers & Sisters" and shows FAB
          navigate("/people", { replace: true, state: null });
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
          sx={(theme) => ({
            "& .MuiBottomNavigationAction-root": {
              position: "relative",
              color: theme.palette.text.secondary,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected": {
              color: ACCENT_CYAN,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: 3,
              borderRadius: 999,
              backgroundColor: ACCENT_CYAN,
            },
          })}
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
