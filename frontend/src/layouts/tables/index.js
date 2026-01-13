// layouts/tables/index.js
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
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
import { setMobileNavbarTitle, useMaterialUIController } from "context";
import defaultProfilePic from "assets/images/default-profile-picture.png";

const PEOPLE_TABLE_TITLE = "Brothers & Sisters";
const MOBILE_PAGINATION_HEIGHT = 70;

function People() {
  const { people } = peopleTableData();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const [, dispatch] = useMaterialUIController();

  useEffect(() => {
    if (!isMobile) {
      setMobileNavbarTitle(dispatch, null);
      return undefined;
    }

    setMobileNavbarTitle(dispatch, PEOPLE_TABLE_TITLE);
    return () => setMobileNavbarTitle(dispatch, null);
  }, [dispatch, isMobile]);

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

  // Pagination derived from filtered people
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPeople.length / rowsPerPage)
  );
  const paginatedPeople = filteredPeople.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
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

  const goToPage = (nextPage) => {
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));
    setPage(normalizedPage);
    setInputValue(normalizedPage.toString());
  };

  const renderPaginationControls = ({
    alwaysShow = false,
    justifyContent = "flex-end",
    showTotal = false,
  }) => {
    if (totalPages <= 1 && !alwaysShow) {
      return null;
    }

    if (totalPages <= 1) {
      return (
        <MDTypography variant="caption" color="text">
          Page {page} / {totalPages}
        </MDTypography>
      );
    }

    return (
      <MDBox
        display="flex"
        alignItems="center"
        justifyContent={justifyContent}
        gap={1}
        sx={{ width: { xs: "100%", sm: "auto" } }}
      >
        <IconButton
          onClick={() => goToPage(page - 1)}
          size="small"
          disabled={page <= 1}
          sx={{ visibility: page <= 1 ? "hidden" : "visible" }}
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
          inputProps={{ style: { textAlign: "center" } }}
        />

        {showTotal && (
          <MDTypography variant="caption" color="text">
            / {totalPages}
          </MDTypography>
        )}

        <IconButton
          onClick={() => goToPage(page + 1)}
          size="small"
          disabled={page >= totalPages}
          sx={{ visibility: page >= totalPages ? "hidden" : "visible" }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </MDBox>
    );
  };

  const desktopPaginationControls = renderPaginationControls({
    alwaysShow: false,
    justifyContent: "flex-end",
    showTotal: false,
  });

  const mobilePaginationControls = renderPaginationControls({
    alwaysShow: true,
    justifyContent: "center",
    showTotal: true,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={{ xs: 3, xl: 6 }} pb={{ xs: 2, xl: 3 }}>
        <Grid container spacing={{ xs: 2, xl: 6 }}>
          <Grid item xs={12}>
            <Card
              sx={
                isMobile
                  ? {
                      height: "calc(100dvh - 200px)",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {isMobile ? (
                <>
                  <MDBox
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <MDBox p={2} display="flex" alignItems="center" gap={1}>
                      <TextField
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <MDButton
                        variant="contained"
                        color="info"
                        iconOnly
                        aria-label="Add person"
                        onClick={() =>
                          navigate("/person/add", { state: { add: true } })
                        }
                      >
                        <Icon>add</Icon>
                      </MDButton>
                    </MDBox>

                    <MDBox sx={{ flex: 1, overflow: "auto", width: "100%" }}>
                      {paginatedPeople.length ? (
                        <List disablePadding sx={{ width: "100%" }}>
                          {paginatedPeople.map((person, index) => {
                            const personId = person?._id || person?.id;
                            const key = personId || person?.Name || index;
                            return (
                              <ListItem key={key} disablePadding divider>
                                <ListItemButton
                                  onClick={() => {
                                    if (!personId) return;
                                    navigate(`/person/${personId}`, {
                                      state: { from: "/people" },
                                    });
                                  }}
                                  sx={{ width: "100%" }}
                                >
                                  <ListItemAvatar>
                                    <MDAvatar
                                      src={
                                        person?.ProfilePic || defaultProfilePic
                                      }
                                      name={person?.Name || "N/A"}
                                      size="sm"
                                    />
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={person?.Name || "N/A"}
                                    secondary={person?.District || ""}
                                    primaryTypographyProps={{ noWrap: true }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      ) : (
                        <MDBox p={2}>
                          <MDTypography variant="button" color="text">
                            No people found.
                          </MDTypography>
                        </MDBox>
                      )}
                    </MDBox>
                  </MDBox>

                  <MDBox
                    sx={(muiTheme) => ({
                      flex: "0 0 auto",
                      height: MOBILE_PAGINATION_HEIGHT,
                      minHeight: MOBILE_PAGINATION_HEIGHT,
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderTop: `1px solid ${muiTheme.palette.divider}`,
                      px: 2,
                    })}
                  >
                    {mobilePaginationControls}
                  </MDBox>
                </>
              ) : (
                <>
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
                      {PEOPLE_TABLE_TITLE}
                    </MDTypography>
                    <MDButton
                      variant="contained"
                      color="white"
                      iconOnly
                      aria-label="Add person"
                      onClick={() =>
                        navigate("/person/add", { state: { add: true } })
                      }
                    >
                      <Icon>add</Icon>
                    </MDButton>
                  </MDBox>

                  <MDBox
                    pt={3}
                    sx={{ maxHeight: "calc(100vh - 400px)", overflow: "auto" }}
                  >
                    <DataTable
                      table={{ columns: peopleColumns, rows: paginatedRows }}
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
                    {desktopPaginationControls}
                  </MDBox>
                </>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default People;
