import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import { ACCENT_CYAN } from "constants.js";
import { MOBILE_FAB_BOTTOM_OFFSET } from "../events.constants";

export default function AddEventFab({ visible, onClick, ariaLabel }) {
  return (
    <IconButton
      onClick={onClick}
      sx={(muiTheme) => ({
        position: "fixed",
        right: 17,
        bottom: MOBILE_FAB_BOTTOM_OFFSET,
        width: 77,
        height: 77,
        borderRadius: "50%",
        background: ACCENT_CYAN,
        color: "#fff",
        zIndex: muiTheme.zIndex.modal - 1,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        pointerEvents: visible ? "auto" : "none",
        "&:hover": {
          background: ACCENT_CYAN,
          filter: "brightness(0.9)",
        },
      })}
      aria-label={ariaLabel}
    >
      <Icon fontSize="large" sx={{ color: "#fff" }}>
        add
      </Icon>
    </IconButton>
  );
}

