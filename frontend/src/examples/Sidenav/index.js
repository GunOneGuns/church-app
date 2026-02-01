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

import { useEffect } from "react";

// react-router-dom components
import { useLocation, NavLink } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useTranslation } from "i18n";

// Material Dashboard 2 React example components
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "context";

function Sidenav({ color, brandName, routes, ...rest }) {
  const { t, language, setLanguage } = useTranslation();
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode } =
    controller;
  const location = useLocation();
  const collapseName = location.pathname.replace("/", "");
  const hasExamples = routes.some((route) => route.type === "examples");

  let textColor = "white";

  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
      setTransparentSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : transparentSidenav,
      );
      setWhiteSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : whiteSidenav,
      );
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes.map(
    ({ type, name, icon, title, noCollapse, key, href, route, disabled }) => {
      let returnValue;
      if (type === "collapse") {
        returnValue = href ? (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavCollapse
              name={t(`nav.${key}`, name)}
              icon={icon}
              active={key === collapseName}
              noCollapse={noCollapse}
              disabled={disabled}
            />
          </Link>
        ) : (
          <NavLink
            key={key}
            to={route}
            style={{ pointerEvents: disabled ? "none" : "auto" }}
          >
            <SidenavCollapse
              name={t(`nav.${key}`, name)}
              icon={icon}
              active={key === collapseName}
              disabled={disabled}
            />
          </NavLink>
        );
      } else if (type === "title") {
        returnValue = (
          <MDTypography
            key={key}
            color={textColor}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {t(`nav.${key}`, title)}
          </MDTypography>
        );
      } else if (type === "divider") {
        returnValue = (
          <Divider
            key={key}
            light={
              (!darkMode && !whiteSidenav && !transparentSidenav) ||
              (darkMode && !transparentSidenav && whiteSidenav)
            }
          />
        );
      }
      return returnValue;
    },
  );

  const renderExampleRoutes = routes.map(
    ({ type, name, icon, title, noCollapse, key, href, route, disabled }) => {
      let returnValue;
      if (type === "examples") {
        returnValue = href ? (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavCollapse
              name={t(`nav.${key}`, name)}
              icon={icon}
              active={key === collapseName}
              noCollapse={noCollapse}
              disabled={disabled}
            />
          </Link>
        ) : (
          <NavLink
            key={key}
            to={route}
            style={{ pointerEvents: disabled ? "none" : "auto" }}
          >
            <SidenavCollapse
              name={t(`nav.${key}`, name)}
              icon={icon}
              active={key === collapseName}
              disabled={disabled}
            />
          </NavLink>
        );
      }
      return returnValue;
    },
  );

  return (
    <>
      {!miniSidenav && (
        <MDBox
          aria-hidden="true"
          onClick={closeSidenav}
          sx={(theme) => ({
            display: { xs: "block", xl: "none" },
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            zIndex: theme.zIndex.drawer - 1,
          })}
        />
      )}

      <SidenavRoot
        {...rest}
        variant="permanent"
        ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
        sx={{
          "& .MuiDrawer-paper": {
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <MDBox pt={3} pb={1} px={4} textAlign="center">
          <MDBox
            display={{ xs: "block", xl: "none" }}
            position="absolute"
            top={0}
            right={0}
            p={1.625}
            onClick={closeSidenav}
            sx={{ cursor: "pointer" }}
          >
            <MDTypography variant="h6" color="secondary">
              <Icon sx={{ fontWeight: "bold" }}>close</Icon>
            </MDTypography>
          </MDBox>
          <MDBox
            component={NavLink}
            to="/home"
            display="block"
            sx={{ width: "100%", textAlign: "center" }}
          >
            <MDBox
              sx={(theme) => ({
                ...sidenavLogoLabel(theme, { miniSidenav }),
                ml: 0,
                width: "100%",
                textAlign: "center",
              })}
            >
              <MDTypography
                component="h6"
                variant="button"
                fontWeight="medium"
                color={textColor}
              >
                {brandName}
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
        <Divider
          light={
            (!darkMode && !whiteSidenav && !transparentSidenav) ||
            (darkMode && !transparentSidenav && whiteSidenav)
          }
        />
        <List sx={{ flex: 1 }}>
          {hasExamples && (
            <>
              <MDBox display="flex flex-col" alignItems="center">
                <MDTypography
                  color={textColor}
                  variant="body2"
                  fontWeight="medium"
                  pl="1.5rem"
                >
                  {t("nav.examples", "Examples")}
                </MDTypography>
                {renderExampleRoutes}
              </MDBox>
              <Divider
                light={
                  (!darkMode && !whiteSidenav && !transparentSidenav) ||
                  (darkMode && !transparentSidenav && whiteSidenav)
                }
              />
            </>
          )}
          {renderRoutes}
        </List>

        {!miniSidenav && (
          <MDBox px={2} pb={2} sx={{ flexShrink: 0 }}>
            <Divider
              light={
                (!darkMode && !whiteSidenav && !transparentSidenav) ||
                (darkMode && !transparentSidenav && whiteSidenav)
              }
            />
            <MDBox pt={1.5}>
              <TextField
                select
                size="small"
                fullWidth
                label={t("language.label", "Language")}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                sx={{
                  "& .MuiInputLabel-root": {
                    color: textColor === "dark" ? "rgba(0,0,0,0.87)" : "#fff",
                  },
                  "& .MuiOutlinedInput-root": {
                    color: textColor === "dark" ? "rgba(0,0,0,0.87)" : "#fff",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      textColor === "dark"
                        ? "rgba(0,0,0,0.23)"
                        : "rgba(255,255,255,0.5)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      textColor === "dark"
                        ? "rgba(0,0,0,0.35)"
                        : "rgba(255,255,255,0.7)",
                  },
                  "& .MuiSvgIcon-root": {
                    color: textColor === "dark" ? "rgba(0,0,0,0.54)" : "#fff",
                  },
                }}
              >
                <MenuItem value="en">{t("language.en", "English")}</MenuItem>
                <MenuItem value="zh-CN">
                  {t("language.zhCN", "简体中文")}
                </MenuItem>
              </TextField>
            </MDBox>
          </MDBox>
        )}
      </SidenavRoot>
    </>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "dark",
  ]),
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
