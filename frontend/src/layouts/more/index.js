import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useTranslation } from "i18n";

function More() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["more"]} />
      <MDBox pt={3} pb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <MDTypography variant="h5" fontWeight="bold" mb={1}>
                {t("morePage.title", "More")}
              </MDTypography>
              <MDTypography variant="body2" color="text">
                {t(
                  "morePage.placeholder",
                  "This is a placeholder page for mobile More tab.",
                )}
              </MDTypography>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default More;

