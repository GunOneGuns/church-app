import PropTypes from "prop-types";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "i18n";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";

const TOAST_AUTO_HIDE_DURATION_MS = 2000;

export default function Toast({
  open,
  message,
  severity,
  onClose,
  actionLabel,
  onAction,
  anchorOrigin,
}) {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  const resolvedAnchorOrigin =
    anchorOrigin ||
    (isMobileView
      ? { vertical: "top", horizontal: "center" }
      : { vertical: "top", horizontal: "right" });

  const color =
    severity === "success"
      ? "success"
      : severity === "info"
      ? "info"
      : severity === "warning"
      ? "warning"
      : "error";

  const translatedMessage = t(message, message);
  const translatedActionLabel = actionLabel
    ? t(actionLabel, actionLabel)
    : null;

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={TOAST_AUTO_HIDE_DURATION_MS}
      anchorOrigin={resolvedAnchorOrigin}
      sx={{
        ...(isMobileView
          ? {
              width: "77vw",
              maxWidth: "77vw",
              left: "50%",
              right: "auto",
              transform: "translateX(-50%)",
              top: "calc(env(safe-area-inset-top) + 12px)",
            }
          : null),
      }}
    >
      <MDBox sx={{ width: isMobileView ? "100%" : "calc(100vw - 32px)" }}>
        <MDAlert
          color={color}
          sx={({ palette, functions }) => {
            const gradient =
              palette.gradients?.[color] || palette.gradients?.info;

            // remove transparency: use solid gradient colors (no rgba alpha)
            return {
              backgroundImage: gradient
                ? functions.linearGradient(gradient.main, gradient.state)
                : undefined,

              // force toast text to white
              "&, & *": { color: "#fff !important" },
              "& .MuiAlert-message": { color: "#fff !important" },
              "& .MuiAlert-icon": { color: "#fff !important" },
              "& .MuiAlert-action": { color: "#fff !important" },
            };
          }}
        >
          <MDBox display="flex" alignItems="center" gap={1} width="100%">
            <MDBox
              display="flex"
              alignItems="center"
              gap={1}
              flexWrap="wrap"
              sx={{ minWidth: 0 }}
            >
              <MDBox
                component="span"
                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {translatedMessage}
              </MDBox>

              {actionLabel && onAction && (
                <Button
                  variant="text"
                  size="small"
                  color="inherit"
                  onClick={async () => {
                    await onAction();
                    onClose();
                  }}
                  sx={{
                    minWidth: "auto",
                    p: 0,
                    textTransform: "none",
                    fontWeight: 600,
                    textDecoration: "underline",
                    color: "#fff !important",
                  }}
                >
                  {translatedActionLabel}
                </Button>
              )}
            </MDBox>
          </MDBox>
        </MDAlert>
      </MDBox>
    </Snackbar>
  );
}

Toast.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(["success", "info", "warning", "error"]).isRequired,
  onClose: PropTypes.func.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(["top", "bottom"]).isRequired,
    horizontal: PropTypes.oneOf(["left", "center", "right"]).isRequired,
  }),
};
