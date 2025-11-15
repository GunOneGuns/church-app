import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import peopleTableData from "layouts/tables/data/peopleTableData";
import projectsTableData from "layouts/tables/data/projectsTableData";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Tables() {
  const { columns, rows } = peopleTableData();
  const { columns: pColumns, rows: pRows } = projectsTableData();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 5;
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  const handleInputBlur = () => {
    const value = parseInt(inputValue);
    if (value >= 1 && value <= totalPages) {
      setPage(value);
    } else if (value > totalPages) {
      setPage(totalPages);
      setInputValue(totalPages.toString());
    } else {
      setInputValue(page.toString());
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Brothers & Sisters
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  onClick={() =>
                    navigate("/person/add", { state: { add: true } })
                  }
                >
                  Add
                </MDButton>
              </MDBox>
              <MDBox
                pt={3}
                sx={{
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                <DataTable
                  table={{ columns, rows: paginatedRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
              <MDBox
                display="flex"
                justifyContent="flex-end"
                alignItems="center"
                p={2}
                gap={1}
              >
                <IconButton
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    setInputValue(newPage.toString());
                  }}
                  disabled={page === 1}
                  size="small"
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <TextField
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyPress={handleKeyPress}
                  size="small"
                  sx={{ width: 60 }}
                  inputProps={{
                    style: { textAlign: "center" },
                  }}
                />
                <IconButton
                  onClick={() => {
                    const newPage = Math.min(totalPages, page + 1);
                    setPage(newPage);
                    setInputValue(newPage.toString());
                  }}
                  disabled={page === totalPages}
                  size="small"
                >
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </MDBox>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Projects Table
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns: pColumns, rows: pRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
export default Tables;
