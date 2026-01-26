import PropTypes from "prop-types";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";

export default function Toast({
  open,
  message,
  severity,
  onClose,
  actionLabel,
  onAction,
  autoHideDuration = 2000,
  anchorOrigin,
}) {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("sm"));

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

  return (
    <Snackbar
      open={open}
      onClose={onClose}
      autoHideDuration={autoHideDuration}
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
      {/* Snackbar requires a child that can hold a ref; MDAlert is a function component. */}
      <MDBox sx={{ width: isMobileView ? "100%" : "calc(100vw - 32px)" }}>
        <MDAlert color={color}>
          <MDBox
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            width="100%"
          >
            <MDBox
              display="flex"
              alignItems="center"
              gap={1}
              flexWrap="wrap"
              sx={{ minWidth: 0 }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {message}
              </span>
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
                  }}
                >
                  {actionLabel}
                </Button>
              )}
            </MDBox>

            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={onClose}
              sx={{ ml: 1 }}
            >
              <Icon fontSize="small">close</Icon>
            </IconButton>
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
  autoHideDuration: PropTypes.number,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(["top", "bottom"]).isRequired,
    horizontal: PropTypes.oneOf(["left", "center", "right"]).isRequired,
  }),
};
