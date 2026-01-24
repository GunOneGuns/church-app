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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ACCENT_CYAN } from "constants.js";

const GROUPS_TABLE_TITLE = "Groups";
const MOBILE_PAGINATION_HEIGHT = 30;

/**
 * Desktop/Web paginator (same behavior as People + GroupDetail):
 * - Input keeps focus (component is outside Groups() so it won't remount every keystroke)
 * - Digits only
 * - Press Enter to jump
 */
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
          inputMode: "numeric",
          pattern: "[0-9]*",
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

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g?.Name || "").toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const rows = useMemo(
    () => buildGroupsRows(filteredGroups, navigate),
    [filteredGroups, navigate],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / rowsPerPage),
  );

  const paginatedGroups = filteredGroups.slice(
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

  const goToPage = (nextPage) => {
    const normalizedPage = Math.min(totalPages, Math.max(1, nextPage));
    setPage(normalizedPage);
    setInputValue(normalizedPage.toString());
  };

  // Desktop input: digits only
  const handleInputChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setInputValue(digitsOnly);
  };

  // Desktop commit: blur or Enter jumps to page
  const handleInputCommit = () => {
    if (inputValue === "") {
      setInputValue(page.toString());
      return;
    }
    const value = parseInt(inputValue, 10);
    if (Number.isNaN(value)) {
      setInputValue(page.toString());
      return;
    }
    goToPage(value);
  };

  const renderPaginationControls = ({
    alwaysShow = false,
    justifyContent = "flex-end",
    showTotal = false,
  }) => {
    if (totalPages <= 1 && !alwaysShow) return null;
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
        <MDTypography variant="caption" color="text">
          {page}
          {showTotal && `/ ${totalPages}`}
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
  };

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
                placeholder="Search by group name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              {/* <MDButton ... /> */}
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
              {paginatedGroups.length ? (
                <List disablePadding>
                  {paginatedGroups.map((group, index) => {
                    const groupName = group?.Name || "N/A";
                    const slug = groupName.toLowerCase().replace(/\s+/g, "_");
                    const groupId = group?._id || slug;
                    const key = groupId || groupName || index;

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
                          onClick={() => navigate(`/group/${slug}`)}
                          sx={{ width: "100%" }}
                        >
                          <ListItemText
                            primary={groupName}
                            secondary={`${group.MemberCount || 0} members`}
                            primaryTypographyProps={{
                              noWrap: true,
                              sx: { color: ACCENT_CYAN },
                            }}
                            secondaryTypographyProps={{
                              noWrap: true,
                              color: "text.secondary",
                            }}
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
              {renderPaginationControls({
                alwaysShow: true,
                justifyContent: "center",
                showTotal: true,
              })}
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
                  sx={{ maxHeight: "calc(100vh - 450px)", overflow: "auto" }}
                >
                  <List disablePadding>
                    {paginatedGroups.length ? (
                      paginatedGroups.map((group, index) => {
                        const groupName = group?.Name || "N/A";
                        const slug = groupName
                          .toLowerCase()
                          .replace(/\s+/g, "_");
                        const groupId = group?._id || slug;
                        const key = groupId || groupName || index;

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
                              onClick={() => navigate(`/group/${slug}`)}
                              sx={{ width: "100%" }}
                            >
                              <ListItemText
                                primary={groupName}
                                primaryTypographyProps={{
                                  noWrap: true,
                                  sx: { color: ACCENT_CYAN },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })
                    ) : (
                      <MDBox p={2}>
                        <MDTypography variant="button" color="text">
                          No groups found.
                        </MDTypography>
                      </MDBox>
                    )}
                  </List>
                </MDBox>

                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={2}
                >
                  <TextField
                    placeholder="Search by group name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ width: { xs: "100%", sm: 280 }, maxWidth: "100%" }}
                  />

                  {/* Desktop/Web paginator now matches People + GroupDetail */}
                  <DesktopPaginationControls
                    page={page}
                    totalPages={totalPages}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onCommit={handleInputCommit}
                    goToPage={goToPage}
                  />
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        )}
      </MDBox>

      {/* Floating action button for adding group */}
      {isMobile && (
        <IconButton
          onClick={() => navigate("/group/add", { state: { add: true } })}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: MOBILE_PAGINATION_HEIGHT + 40,
            width: 77,
            height: 77,
            borderRadius: "50%",
            background: muiTheme.palette.info.main,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            "&:hover": {
              background: muiTheme.palette.info.dark,
            },
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

export default Groups;
