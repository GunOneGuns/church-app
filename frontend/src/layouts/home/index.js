import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

const HOME_STATS = [
  { title: "People", value: "200", detail: "Active members" },
  { title: "Group", value: "30", detail: "Small groups" },
  { title: "Event", value: "5", detail: "Upcoming" },
  { title: "Visitors", value: "14", detail: "This month" },
  { title: "Volunteers", value: "18", detail: "Serving today" },
  { title: "Donations", value: "$1,250", detail: "This week" },
  { title: "Baptisms", value: "2", detail: "This quarter" },
  { title: "Prayer Requests", value: "9", detail: "Open" },
];

function Home() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={2}>
          {HOME_STATS.map((item) => (
            <Grid item xs={6} md={3} key={item.title}>
              <Card
                sx={{
                  height: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 2,
                }}
              >
                <MDBox p={2} display="flex" flexDirection="column" height="100%">
                  <MDTypography variant="button" fontWeight="medium">
                    {item.title}
                  </MDTypography>
                  <MDTypography variant="h4" fontWeight="bold" mt={1}>
                    {item.value}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" mt={0.5}>
                    {item.detail}
                  </MDTypography>
                </MDBox>
              </Card>
            </Grid>
          ))}
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Home;

