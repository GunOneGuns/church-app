import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { ACCENT_CYAN } from "constants.js";
import { fetchPeopleStats } from "services/convo-broker";

const splitValueForHighlight = (value) => {
  const text = String(value ?? "");
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return { prefix: text, number: "", suffix: "" };
  const start = match.index ?? 0;
  const number = match[0] ?? "";
  return {
    prefix: text.slice(0, start),
    number,
    suffix: text.slice(start + number.length),
  };
};

const renderCyanNumberValue = (value) => {
  const { prefix, number, suffix } = splitValueForHighlight(value);
  if (!number) return value;
  return (
    <>
      {prefix}
      <MDBox component="span" sx={{ color: ACCENT_CYAN }}>
        {number}
      </MDBox>
      {suffix}
    </>
  );
};

function Home() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));

  const [peopleStats, setPeopleStats] = useState({
    peopleCount: null,
    groupCount: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stats = await fetchPeopleStats();
        if (cancelled) return;
        setPeopleStats({
          peopleCount:
            typeof stats?.peopleCount === "number" ? stats.peopleCount : null,
          groupCount:
            typeof stats?.groupCount === "number" ? stats.groupCount : null,
        });
      } catch (error) {
        console.error("Failed to fetch home stats:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const homeStats = useMemo(
    () => [
      {
        title: "People",
        value: peopleStats.peopleCount ?? "—",
        detail: "Total people",
      },
      {
        title: "Group",
        value: peopleStats.groupCount ?? "—",
        detail: "Small groups",
      },
      { title: "Event", value: "5", detail: "Upcoming" },
      { title: "Visitors", value: "14", detail: "This month" },
      { title: "Donations", value: "$1,250", detail: "This week" },
      { title: "Baptisms", value: "2", detail: "This quarter" },
      { title: "Prayer Requests", value: "9", detail: "Open" },
    ],
    [peopleStats.groupCount, peopleStats.peopleCount],
  );

  const getCardNavigation = (title) => {
    const normalized = String(title || "").toLowerCase();
    if (normalized === "people") {
      return () =>
        navigate(
          "/people",
          isMobile ? { state: { openPeopleOverlay: true } } : undefined,
        );
    }
    if (normalized === "group" || normalized === "groups") {
      return () => navigate("/groups");
    }
    return null;
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={2}>
          {homeStats.map((item) => {
            const onCardClick = getCardNavigation(item.title);
            const isClickable = typeof onCardClick === "function";

            return (
            <Grid item xs={6} md={3} key={item.title}>
              <Card
                sx={{
                  height: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 2,
                }}
              >
                <CardActionArea
                  onClick={isClickable ? onCardClick : undefined}
                  disabled={!isClickable}
                  sx={{ height: "100%" }}
                >
                  <MDBox
                    p={2}
                    display="flex"
                    flexDirection="column"
                    height="100%"
                    sx={{
                      cursor: isClickable ? "pointer" : "default",
                    }}
                  >
                    <MDTypography variant="button" fontWeight="medium">
                      {item.title}
                    </MDTypography>
                    <MDTypography variant="h4" fontWeight="bold" mt={1}>
                      {renderCyanNumberValue(item.value)}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" mt={0.5}>
                      {item.detail}
                    </MDTypography>
                  </MDBox>
                </CardActionArea>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Home;
