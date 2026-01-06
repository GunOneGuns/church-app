/**
=========================================================
* Material Dashboard 2 React - v2.1.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect, useContext } from "react";

// react-router components
import { useLocation, Link } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Icon from "@mui/material/Icon";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";

import AuthService from "services/auth-service";

// Custom styles for DashboardNavbar
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";
import MDButton from "components/MDButton";
import { AuthContext } from "context";

const MOBILE_TITLES = {
  home: "Home",
  people: "People",
  person: "People",
  groups: "Group",
  group: "Group",
  events: "Event",
  event: "Event",
};

const getMobileTitle = (routeSegments = []) => {
  const normalizedSegments = Array.isArray(routeSegments)
    ? routeSegments.filter(Boolean)
    : [];

  if (!normalizedSegments.length) {
    return "Home";
  }

  const first = normalizedSegments[0];
  const last = normalizedSegments[normalizedSegments.length - 1];

  return (
    MOBILE_TITLES[first] ||
    MOBILE_TITLES[last] ||
    String(last).replaceAll("-", " ")
  );
};

function DashboardNavbar({ absolute, light, isMini, customRoute }) {
  const authContext = useContext(AuthContext);
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    transparentNavbar,
    fixedNavbar,
    openConfigurator,
    mobileNavbarTitle,
    darkMode,
  } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const location = useLocation();
  const locationRoute = location.pathname.split("/").slice(1);
  const route = customRoute && customRoute.length ? customRoute : locationRoute;
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(
        dispatch,
        (fixedNavbar && window.scrollY === 0) || !fixedNavbar
      );
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () =>
    setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  // Render the notifications menu
  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
    >
      <NotificationItem icon={<Icon>email</Icon>} title="Check new messages" />
      <NotificationItem
        icon={<Icon>podcasts</Icon>}
        title="Manage Podcast sessions"
      />
      <NotificationItem
        icon={<Icon>shopping_cart</Icon>}
        title="Payment successfully completed"
      />
    </Menu>
  );

  const getIconsStyle =
    (isLight) =>
    ({ palette: { dark, white, text }, functions: { rgba } }) => ({
      color: () => {
        let colorValue = isLight || darkMode ? white.main : dark.main;

        if (transparentNavbar && !isLight) {
          colorValue = darkMode ? rgba(text.main, 0.6) : text.main;
        }

        return colorValue;
      },
    });

  // Styles for the navbar icons
  const iconsStyle = getIconsStyle(light);

  const handleLogOut = async () => {
    await AuthService.logout();
    authContext.logout();
  };

  if (isMobileView) {
    const isScrolled = !transparentNavbar && !absolute;

    // Mobile "scrolled" navbar background options (try one at a time):
    // const mobileScrolledBackground = theme.palette.background.paper;
    // const mobileScrolledBackground = theme.palette.grey[100];
    // const mobileScrolledBackground = theme.palette.grey[200];
    // const mobileScrolledBackground = theme.functions.rgba(theme.palette.info.main, 0.12);
    const mobileScrolledBackground = theme.functions.linearGradient(
      theme.palette.gradients.dark.main,
      theme.palette.gradients.dark.state
    );
    // const mobileScrolledBackground = theme.functions.linearGradient(
    //   theme.palette.gradients.primary.main,
    //   theme.palette.gradients.primary.state
    // );
    // const mobileScrolledBackground = theme.functions.linearGradient(
    //   theme.palette.gradients.secondary.main,
    //   theme.palette.gradients.secondary.state
    // );
    // const mobileScrolledBackground = theme.functions.linearGradient(
    //   theme.palette.gradients.info.main,
    //   theme.palette.gradients.primary.state
    // );

    // Set this to `true` when using a dark background above.
    // const mobileScrolledUsesLightText = false;
    const mobileScrolledUsesLightText = true;

    const mobileTitle = mobileNavbarTitle || getMobileTitle(route);
    const mobileLight = light || (isScrolled && mobileScrolledUsesLightText);
    const mobileIconsStyle = getIconsStyle(mobileLight);

    return (
      <AppBar
        position={absolute ? "absolute" : navbarType}
        color="inherit"
        sx={(muiTheme) => {
          const baseStyles = navbar(muiTheme, {
            transparentNavbar,
            absolute,
            light: mobileLight,
            darkMode,
          });

          if (transparentNavbar || absolute) {
            return baseStyles;
          }

          return {
            ...baseStyles,
            background: mobileScrolledBackground,
            backdropFilter: "none",
          };
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            px: 1.5,
            py: 0.5,
          }}
        >
          <IconButton
            size="small"
            disableRipple
            color="inherit"
            onClick={handleMiniSidenav}
          >
            <Icon sx={mobileIconsStyle} fontSize="medium">
              {miniSidenav ? "menu" : "menu_open"}
            </Icon>
          </IconButton>

          <MDTypography
            variant="button"
            fontWeight="bold"
            textTransform="capitalize"
            color={mobileLight ? "white" : "dark"}
            sx={{ flex: 1, textAlign: "center", px: 1 }}
            noWrap
          >
            {mobileTitle}
          </MDTypography>

          <MDBox sx={{ width: 40, flexShrink: 0 }} />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) =>
        navbar(theme, { transparentNavbar, absolute, light, darkMode })
      }
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <MDBox
          color="inherit"
          mb={{ xs: 1, md: 0 }}
          sx={(theme) => navbarRow(theme, { isMini })}
        >
          <Breadcrumbs
            icon="home"
            title={route[route.length - 1]}
            route={route}
            light={light}
          />
        </MDBox>
        {isMini ? null : (
          <MDBox sx={(theme) => navbarRow(theme, { isMini })}>
            <MDBox pr={1}>
              <MDInput label="Search here" />
            </MDBox>
            <MDBox
              display="flex"
              alignItems="center"
              color={light ? "white" : "inherit"}
            >
              <Link to="/authentication/sign-in/basic">
                <IconButton sx={navbarIconButton} size="small" disableRipple>
                  <Icon sx={iconsStyle}>account_circle</Icon>
                </IconButton>
              </Link>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon sx={iconsStyle} fontSize="medium">
                  {miniSidenav ? "menu_open" : "menu"}
                </Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon sx={iconsStyle}>settings</Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                aria-controls="notification-menu"
                aria-haspopup="true"
                variant="contained"
                onClick={handleOpenMenu}
              >
                <Icon sx={iconsStyle}>notifications</Icon>
              </IconButton>
              {renderMenu()}
              <MDBox>
                <MDButton
                  variant="gradient"
                  color="info"
                  fullWidth
                  type="button"
                  onClick={handleLogOut}
                >
                  Log Out
                </MDButton>
              </MDBox>
            </MDBox>
          </MDBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
  customRoute: null,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
  customRoute: PropTypes.arrayOf(PropTypes.string),
};

export default DashboardNavbar;
