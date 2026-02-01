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

// react-router-dom components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useTranslation } from "i18n";

const BREADCRUMB_LABEL_CHAR_LIMIT = 17;

function truncateLabel(label, limit = BREADCRUMB_LABEL_CHAR_LIMIT) {
  const text = String(label ?? "");
  if (text.length <= limit) return text;
  if (limit <= 1) return "…";
  return `${text.slice(0, limit - 1)}…`;
}

function formatLabel(label) {
  return String(label ?? "").replaceAll("-", " ");
}

function Breadcrumbs({ icon, title, route, light }) {
  const { t } = useTranslation();
  const routeArray = Array.isArray(route) ? route : String(route).split("/").filter(Boolean);
  const routes = routeArray.slice(0, -1);

  const ROUTE_KEY_ALIASES = {
    home: "home",
    people: "people",
    person: "people",
    groups: "groups",
    group: "groups",
    events: "events",
  };

  const translateSegment = (segment) => {
    const normalized = String(segment ?? "");
    const aliasKey = ROUTE_KEY_ALIASES[normalized];
    if (!aliasKey) return formatLabel(normalized);
    return t(`nav.${aliasKey}`, formatLabel(normalized));
  };

  const getCrumbHref = (segment) => {
    const normalized = String(segment ?? "");
    if (normalized === "group") return "/groups";
    if (normalized === "person") return "/people";
    return `/${normalized}`;
  };

  const formattedTitle = formatLabel(title);
  const translatedTitle = translateSegment(title);

  return (
    <MDBox
      mr={{ xs: 0, xl: 8 }}
      sx={{
        minWidth: 0,
        maxWidth: { xs: "100%", md: "55vw", xl: "45vw" },
      }}
    >
      <MuiBreadcrumbs
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: ({ palette: { white, grey } }) => (light ? white.main : grey[600]),
          },
        }}
      >
        <Link to="/home">
          <MDTypography
            component="span"
            variant="body2"
            color={light ? "white" : "dark"}
            opacity={light ? 0.8 : 0.5}
            sx={{ lineHeight: 0 }}
          >
            <Icon>{icon}</Icon>
          </MDTypography>
        </Link>
        {routes.map((el, index) => {
          const translatedEl = translateSegment(el);
          const truncatedEl = truncateLabel(translatedEl);

          return (
            <Link
              to={getCrumbHref(el)}
              key={`${el}-${index}`}
              title={translatedEl}
              aria-label={translatedEl}
            >
              <MDTypography
                component="span"
                variant="button"
                fontWeight="regular"
                textTransform="capitalize"
                color={light ? "white" : "dark"}
                opacity={light ? 0.8 : 0.5}
                sx={{ lineHeight: 0 }}
              >
                {truncatedEl}
              </MDTypography>
            </Link>
          );
        })}
        <MDTypography
          variant="button"
          fontWeight="regular"
          textTransform="capitalize"
          color={light ? "white" : "dark"}
          sx={{ lineHeight: 0 }}
          title={translatedTitle || formattedTitle}
          aria-label={translatedTitle || formattedTitle}
        >
          {truncateLabel(translatedTitle || formattedTitle)}
        </MDTypography>
      </MuiBreadcrumbs>
      <MDTypography
        fontWeight="bold"
        textTransform="capitalize"
        variant="h6"
        color={light ? "white" : "dark"}
        sx={{
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {translatedTitle || formattedTitle}
      </MDTypography>
    </MDBox>
  );
}

// Setting default values for the props of Breadcrumbs
Breadcrumbs.defaultProps = {
  light: false,
};

// Typechecking props for the Breadcrumbs
Breadcrumbs.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  route: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  light: PropTypes.bool,
};

export default Breadcrumbs;
