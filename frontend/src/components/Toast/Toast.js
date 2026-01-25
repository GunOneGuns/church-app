import PropTypes from "prop-types";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";

export default function Toast({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 2000,
  anchorOrigin = { vertical: "top", horizontal: "right" },
}) {
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
      anchorOrigin={anchorOrigin}
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={onClose}
        >
          <Icon fontSize="small">close</Icon>
        </IconButton>
      }
    >
      {/* Snackbar requires a child that can hold a ref; MDAlert is a function component. */}
      <MDBox sx={{ maxWidth: "calc(100vw - 32px)" }}>
        <MDAlert color={color}>{message}</MDAlert>
      </MDBox>
    </Snackbar>
  );
}

Toast.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(["success", "info", "warning", "error"]).isRequired,
  onClose: PropTypes.func.isRequired,
  autoHideDuration: PropTypes.number,
  anchorOrigin: PropTypes.shape({
    vertical: PropTypes.oneOf(["top", "bottom"]).isRequired,
    horizontal: PropTypes.oneOf(["left", "center", "right"]).isRequired,
  }),
};
