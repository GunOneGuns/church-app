// layouts/tables/index.js
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
import peopleTableData, {
  columns as peopleColumns,
  buildRows as buildPeopleRows,
} from "layouts/tables/data/peopleTableData";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

function People() {
  const { people, rows: initialRows } = peopleTableData(); // now also returns people
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  // Filter people by name substring
  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p?.Name || "").toLowerCase().includes(q));
  }, [people, searchQuery]);

  // Rebuild rows from filtered people
  const rows = useMemo(
    () => buildPeopleRows(filteredPeople, navigate),
    [filteredPeople, navigate]
  );

  const responsiveColumns = useMemo(() => {
    if (!isMobile) return peopleColumns;
    return peopleColumns.filter((column) => column.accessor === "people");
  }, [isMobile]);

  // Pagination derived from filtered rows
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = rows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Reset to page 1 when search changes or filtered size shrinks below current page
  useEffect(() => {
    setPage(1);
    setInputValue("1");
  }, [searchQuery]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setInputValue(totalPages.toString());
    }
  }, [page, totalPages]);

  // Page input handlers
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (Number.isNaN(value)) {
      setInputValue(page.toString());
      return;
    }
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
                sx={{ maxHeight: "calc(100vh - 400px)", overflow: "auto" }}
              >
                <DataTable
                  table={{ columns: responsiveColumns, rows: paginatedRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                  pagination={false}
                />
              </MDBox>

              {/* Row with search (left) and pagination (right) */}
              <MDBox
                display="flex"
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                flexDirection={{ xs: "column", sm: "row" }}
                p={2}
                gap={2}
              >
                {/* Search on the far left */}
                <TextField
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{
                    width: { xs: "100%", sm: 280 },
                    maxWidth: "100%",
                  }}
                />

                {/* Pagination controls on the right */}
                {totalPages > 1 && (
                  <MDBox
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                    gap={1}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    {page > 1 && (
                      <IconButton
                        onClick={() => {
                          const newPage = Math.max(1, page - 1);
                          setPage(newPage);
                          setInputValue(newPage.toString());
                        }}
                        size="small"
                      >
                        <ArrowBackIosNewIcon fontSize="small" />
                      </IconButton>
                    )}

                    <TextField
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      onKeyPress={handleKeyPress}
                      size="small"
                      sx={{ width: 60 }}
                      inputProps={{ style: { textAlign: "center" } }}
                    />

                    {page < totalPages && (
                      <IconButton
                        onClick={() => {
                          const newPage = Math.min(totalPages, page + 1);
                          setPage(newPage);
                          setInputValue(newPage.toString());
                        }}
                        size="small"
                      >
                        <ArrowForwardIosIcon fontSize="small" />
                      </IconButton>
                    )}
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default People;
