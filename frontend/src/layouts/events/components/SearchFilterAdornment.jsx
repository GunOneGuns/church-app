import { useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import TuneIcon from "@mui/icons-material/Tune";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { ACCENT_CYAN } from "constants.js";
import { useTranslation } from "i18n";

export default function SearchFilterAdornment({ filter, onSelectFilter }) {
  const { t } = useTranslation();
  const menuIdRef = useRef(
    `event-filter-menu-${Math.random().toString(36).slice(2)}`,
  );
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const isActive = filter && filter !== "default";

  const handleOpen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    event?.stopPropagation?.();
    setAnchorEl(null);
  };

  return (
    <InputAdornment position="end">
      <Tooltip title={t("filters.label", "Filters")}>
        <IconButton
          size="small"
          aria-label={t("filters.label", "Filters")}
          aria-controls={open ? menuIdRef.current : undefined}
          aria-haspopup="menu"
          aria-expanded={open ? "true" : undefined}
          edge="end"
          onClick={handleOpen}
          sx={isActive ? { color: ACCENT_CYAN } : undefined}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        id={menuIdRef.current}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MDBox px={2} pt={1.25} pb={0.75}>
          <MDTypography variant="caption" fontWeight="bold">
            {t("filters.filterBy", "Filter By")}
          </MDTypography>
        </MDBox>
        <Divider />
        <MenuItem
          selected={filter === "location"}
          onClick={(event) => {
            onSelectFilter?.(filter === "location" ? "default" : "location");
            handleClose(event);
          }}
        >
          {t("filters.location", "Location")}
        </MenuItem>
        <MenuItem
          selected={filter === "date"}
          onClick={(event) => {
            onSelectFilter?.(filter === "date" ? "default" : "date");
            handleClose(event);
          }}
        >
          {t("filters.date", "Date")}
        </MenuItem>
      </Menu>
    </InputAdornment>
  );
}

