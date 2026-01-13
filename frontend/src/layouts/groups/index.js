// layouts/groups/index.js
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
import ListItemText from "@mui/material/ListItemText";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import groupsTableData, {
  columns as groupsColumns,
  buildRows as buildGroupsRows,
} from "layouts/groups/data/groupsTableData";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { setMobileNavbarTitle, useMaterialUIController } from "context";

const GROUPS_TABLE_TITLE = "Groups";
const MOBILE_PAGINATION_HEIGHT = 64;

function Groups() {
  const { groups } = groupsTableData();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const [, dispatch] = useMaterialUIController();

  useEffect(() => {
    if (!isMobile) {
      setMobileNavbarTitle(dispatch, null);
      return undefined;
    }

    setMobileNavbarTitle(dispatch, GROUPS_TABLE_TITLE);
    return () => setMobileNavbarTitle(dispatch, null);
  }, [dispatch, isMobile]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  // Filter groups by name substring
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g?.Name || "").toLowerCase().includes(q));
  }, [groups, searchQuery]);

  // Rebuild rows from filtered groups
  const rows = useMemo(
    () => buildGroupsRows(filteredGroups, navigate),
    [filteredGroups, navigate]
  );

  // Pagination derived from filtered groups
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / rowsPerPage));
  const paginatedGroups = filteredGroups.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const paginatedRows = rows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Reset to page 1 when search changes
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
          onKeyDown={(e) => e.key === "Enter" && handleInputBlur()}
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
                      height: "calc(100dvh - 220px)",
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
                      overflow: "hidden",
                      width: "100%",
                    }}
                  >
                    <MDBox p={2} display="flex" alignItems="center" gap={1}>
                      <TextField
                        placeholder="Search by group name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <MDButton
                        variant="contained"
                        color="info"
                        iconOnly
                        aria-label="Add group"
                        onClick={() =>
                          navigate("/group/add", { state: { add: true } })
                        }
                      >
                        <Icon>add</Icon>
                      </MDButton>
                    </MDBox>

                    <MDBox sx={{ flex: 1, overflow: "auto", width: "100%" }}>
                      {paginatedGroups.length ? (
                        <List disablePadding sx={{ width: "100%" }}>
                          {paginatedGroups.map((group, index) => {
                            const groupName = group?.Name || "N/A";
                            const slug = groupName
                              .toLowerCase()
                              .replace(/\s+/g, "_");
                            const groupId = group?._id || slug;
                            const key = groupId || groupName || index;
                            const category = group?.Category || "";
                            const memberCount = group?.MemberCount ?? 0;
                            const secondaryText = [category, `${memberCount} members`]
                              .filter(Boolean)
                              .join(" • ");

                            return (
                              <ListItem key={key} disablePadding divider>
                                <ListItemButton
                                  onClick={() => navigate(`/group/${slug}`)}
                                  sx={{ width: "100%" }}
                                >
                                  <ListItemText
                                    primary={groupName}
                                    secondary={secondaryText}
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
                            No groups found.
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
                      {GROUPS_TABLE_TITLE}
                    </MDTypography>
                    <MDButton
                      variant="contained"
                      color="white"
                      iconOnly
                      aria-label="Add group"
                      onClick={() =>
                        navigate("/group/add", { state: { add: true } })
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
                      table={{ columns: groupsColumns, rows: paginatedRows }}
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
                      placeholder="Search by group name..."
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

export default Groups;
