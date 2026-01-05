import { useEffect, useState } from "react";

import PropTypes from "prop-types";

// @mui material components
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

const FIRST_OVERLAY_BUTTONS = ["联系人", "信息分享", "聚会信息", "待开发"];
const SECOND_OVERLAY_BUTTONS = ["本地", "海外", "福音", "访问"];

export default function MobileStartOverlays({ open, onComplete, bottomOffset }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!open) return;
    setStep(1);
  }, [open]);

  const buttonLabels = step === 1 ? FIRST_OVERLAY_BUTTONS : SECOND_OVERLAY_BUTTONS;

  const handleButtonClick = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    onComplete();
  };

  if (!open) return null;

  return (
    <Box
      sx={(theme) => ({
        position: "fixed",
        inset: 0,
        bottom: bottomOffset,
        zIndex: theme.zIndex.appBar - 1,
        backgroundColor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        py: "calc(24px + env(safe-area-inset-top))",
      })}
    >
      <Box sx={{ width: "min(420px, 100%)" }}>
        <Grid container spacing={2}>
          {buttonLabels.map((label) => (
            <Grid item xs={6} key={label}>
              <Button
                fullWidth
                variant="contained"
                color="info"
                onClick={handleButtonClick}
                sx={{
                  height: 72,
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: "1rem",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

MobileStartOverlays.defaultProps = {
  open: false,
  onComplete: () => {},
  bottomOffset: "calc(56px + env(safe-area-inset-bottom))",
};

MobileStartOverlays.propTypes = {
  open: PropTypes.bool,
  onComplete: PropTypes.func,
  bottomOffset: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
