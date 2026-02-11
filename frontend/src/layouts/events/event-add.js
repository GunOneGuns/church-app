import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useTranslation } from "i18n";

export default function EventAdd() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["events", "add"]} />
      <MDBox pt={6} pb={3}>
        <Card sx={{ p: 2 }}>
          <MDTypography variant="h5" fontWeight="bold">
            {t("buttons.add", "Add")} {t("nav.events", "Event")}
          </MDTypography>
          <MDTypography variant="body2" color="text" mt={1}>
            Coming soon.
          </MDTypography>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

