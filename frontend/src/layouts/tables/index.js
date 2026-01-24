import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
import { setMobileNavbarTitle, useMaterialUIController } from "context";
import defaultProfilePic from "assets/images/default-profile-picture.png";
import { ACCENT_CYAN } from "constants.js";

const PEOPLE_TABLE_TITLE = "Brothers & Sisters";
const MOBILE_PAGINATION_HEIGHT = 30;

/** Keep this OUTSIDE People() so it doesn't remount on every keystroke */
function DesktopPaginationControls({
  page,
  totalPages,
  inputValue,
  onInputChange,
  onCommit,
  goToPage,
}) {
  if (totalPages <= 1) return null;

  return (
    <MDBox
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
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
        onChange={onInputChange}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
        }}
        size="small"
        sx={{ width: 60 }}
        inputProps={{
          style: { textAlign: "center" },
          inputMode: "numeric", // mobile/desktop numeric keypad hint
          pattern: "[0-9]*", // helps on mobile browsers
        }}
      />

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
}

function MobilePaginationControls({ page, totalPages, goToPage }) {
  return (
    <MDBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1}
      sx={{ width: "100%" }}
    >
      <IconButton
        onClick={() => goToPage(page - 1)}
        size="small"
        disabled={page <= 1}
        sx={{ visibility: page <= 1 ? "hidden" : "visible" }}
      >
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>

      <MDTypography variant="caption" color="text">
        {page} / {totalPages}
      </MDTypography>

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
}

function People() {
  const { people } = peopleTableData();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const overlayActive = location.state?.openPeopleOverlay === true;
  const [, dispatch] = useMaterialUIController();

  useEffect(() => {
    if (!isMobile) {
      setMobileNavbarTitle(dispatch, null);
      return undefined;
    }
    if (overlayActive) setMobileNavbarTitle(dispatch, "People");
    else setMobileNavbarTitle(dispatch, PEOPLE_TABLE_TITLE);
    return () => setMobileNavbarTitle(dispatch, null);
  }, [dispatch, isMobile, overlayActive]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p?.Name || "").toLowerCase().includes(q));
  }, [people, searchQuery]);

  const rows = useMemo(
    () => buildPeopleRows(filteredPeople, navigate),
    [filteredPeople, navigate],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPeople.length / rowsPerPage),
  );

  const paginatedPeople = filteredPeople.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const paginatedRows = rows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

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

  const goToPage = useCallback(
    (nextPage) => {
      const normalized = Math.min(totalPages, Math.max(1, nextPage));
      setPage(normalized);
      setInputValue(normalized.toString());
    },
    [totalPages],
  );

  // digits-only input
  const handleInputChange = useCallback((e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setInputValue(digitsOnly);
  }, []);

  // commit on blur or Enter
  const commitInputPage = useCallback(() => {
    if (inputValue === "") {
      // if they cleared it, revert to current page
      setInputValue(page.toString());
      return;
    }

    const value = parseInt(inputValue, 10);
    if (Number.isNaN(value)) {
      setInputValue(page.toString());
      return;
    }

    goToPage(value);
  }, [inputValue, page, goToPage]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={{ xs: 3, xl: 6 }} pb={{ xs: 2, xl: 3 }}>
        {isMobile ? (
          <MDBox
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "calc(100dvh - 200px)",
              overflow: "hidden",
            }}
          >
            <MDBox
              p={2}
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ flexShrink: 0 }}
            >
              <TextField
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
            </MDBox>

            <MDBox
              sx={{
                flex: 1,
                overflow: "auto",
                pb: 2,
                "&::-webkit-scrollbar": { display: "none" },
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              {paginatedPeople.length ? (
                <List disablePadding>
                  {paginatedPeople.map((person, index) => {
                    const personId = person?._id || person?.id;
                    const key = personId || person?.Name || index;
                    return (
                      <ListItem
                        key={key}
                        disablePadding
                        divider
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            sx={{ color: ACCENT_CYAN }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemButton
                          onClick={() => {
                            if (!personId) return;
                            navigate(`/person/${personId}`, {
                              state: { from: "/people" },
                            });
                          }}
                          sx={{ pr: 6 }}
                        >
                          <ListItemAvatar>
                            <MDAvatar
                              src={person?.ProfilePic || defaultProfilePic}
                              name={person?.Name || "N/A"}
                              size="sm"
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={person?.Name || "N/A"}
                            secondary={person?.District || ""}
                            primaryTypographyProps={{
                              noWrap: true,
                              sx: { color: ACCENT_CYAN },
                            }}
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

            <MDBox
              sx={(muiTheme) => ({
                height: MOBILE_PAGINATION_HEIGHT,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTop: `1px solid ${muiTheme.palette.divider}`,
                px: 2,
              })}
            >
              <MobilePaginationControls
                page={page}
                totalPages={totalPages}
                goToPage={goToPage}
              />
            </MDBox>
          </MDBox>
        ) : (
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
                  sx={{ maxHeight: "calc(100vh - 450px)", overflow: "auto" }}
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

                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                  flexDirection={{ xs: "column", sm: "row" }}
                  p={2}
                  gap={2}
                >
                  <TextField
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ width: { xs: "100%", sm: 280 }, maxWidth: "100%" }}
                  />

                  <DesktopPaginationControls
                    page={page}
                    totalPages={totalPages}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onCommit={commitInputPage}
                    goToPage={goToPage}
                  />
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        )}
      </MDBox>

      {isMobile && !overlayActive && (
        <IconButton
          onClick={() => navigate("/person/add", { state: { add: true } })}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: MOBILE_PAGINATION_HEIGHT + 40,
            width: 77,
            height: 77,
            borderRadius: "50%",
            background: ACCENT_CYAN,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            "&:hover": { background: ACCENT_CYAN, filter: "brightness(0.9)" },
          })}
        >
          <Icon fontSize="large" sx={{ color: "#fff" }}>
            add
          </Icon>
        </IconButton>
      )}

      <Footer />
    </DashboardLayout>
  );
}

export default People;
