import { useEffect, useMemo, useState } from "react";

// react-router components
import { useLocation, useNavigate } from "react-router-dom";

// @mui material components
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const FIRST_OVERLAY_BUTTONS = ["联系人", "信息分享", "聚会信息", "待开发"];
const SECOND_OVERLAY_BUTTONS = ["本地", "海外", "福音", "访问"];

export default function MobileStartOverlays() {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));
  const location = useLocation();
  const navigate = useNavigate();

  const [isCompleted, setIsCompleted] = useState(false);
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);

  const isAuthRoute = useMemo(() => location.pathname.startsWith("/auth"), [location.pathname]);

  useEffect(() => {
    if (!isMobileView || isAuthRoute || isCompleted) {
      setOpen(false);
      return;
    }

    setStep(1);
    setOpen(true);
  }, [isMobileView, isAuthRoute, isCompleted]);

  const buttonLabels = step === 1 ? FIRST_OVERLAY_BUTTONS : SECOND_OVERLAY_BUTTONS;

  const handleButtonClick = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsCompleted(true);
    setOpen(false);
    navigate("/people");
  };

  return (
    <Dialog fullScreen open={open} onClose={() => {}} PaperProps={{ sx: { backgroundColor: "#fff" } }}>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          py: "calc(24px + env(safe-area-inset-top))",
          pb: "calc(24px + env(safe-area-inset-bottom))",
        }}
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
    </Dialog>
  );
}

