import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function PersonDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      const found = people.find((p) => p._id === id);
      setPerson(found);
    }
  }, [id]);

  if (!person) return <div>Loading...</div>;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3}>
            <MDTypography variant="h4" mb={2}>
              {person.Name}
            </MDTypography>
            <MDTypography variant="body2">
              District: {person.District}
            </MDTypography>
            <MDTypography variant="body2">
              Address: {person.Address}
            </MDTypography>
            <MDTypography variant="body2">
              Contact: {person.Contact}
            </MDTypography>
          </MDBox>
        </Card>
      </MDBox>
    </DashboardLayout>
  );
}

export default PersonDetail;
