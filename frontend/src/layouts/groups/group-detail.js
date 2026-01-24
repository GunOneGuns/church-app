// layouts/groups/group-detail.js
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";
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
import MDBadge from "components/MDBadge";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import { columns as peopleColumns } from "layouts/tables/data/peopleTableData";
import defaultProfilePic from "assets/images/default-profile-picture.png";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { setMobileNavbarTitle, useMaterialUIController } from "context";
import { ACCENT_CYAN } from "constants.js";

const MOBILE_PAGINATION_HEIGHT = 30;

/**
 * FIX (web/desktop paginator):
 * - Keep paginator component OUTSIDE GroupDetail so it doesn't remount on every keystroke.
 * - Digits-only input + Enter to commit.
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

function ActionMenu({ person, navigate, slug }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (event) => {
    event.stopPropagation();
    setAnchorEl(null);
  };
  const handleEdit = (event) => {
    event.stopPropagation();
    navigate(`/person/${person._id}`, {
      state: { edit: true, from: `/group/${slug}` },
    });
    handleClose(event);
  };
  const handleRemove = (event) => {
    event.stopPropagation();
    // TODO: Implement remove from group functionality
    console.log("Remove from group:", person._id);
    handleClose(event);
  };
  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ color: ACCENT_CYAN }}
      >
        <Icon fontSize="small">more_vert</Icon>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleRemove}>Remove from group</MenuItem>
      </Menu>
    </>
  );
}

function PeopleCell({ image, name, district, onClick }) {
  return (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={onClick}
      sx={{ cursor: "pointer" }}
    >
      <MDAvatar src={image} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography
          display="block"
          variant="button"
          fontWeight="medium"
          sx={{ color: ACCENT_CYAN }}
        >
          {name}
        </MDTypography>
        <MDTypography variant="caption">{district}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

function Job({ title, description }) {
  return (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {title}
      </MDTypography>
      <MDTypography variant="caption">{description}</MDTypography>
    </MDBox>
  );
}

function buildGroupMemberRows(rawPeople, navigate, slug) {
  return rawPeople.map((person) => ({
    people: (
      <PeopleCell
        image={person.ProfilePic || defaultProfilePic}
        name={person.Name || "N/A"}
        district={person.District || ""}
        onClick={() =>
          navigate(`/person/${person._id}`, {
            state: { from: `/group/${slug}` },
          })
        }
      />
    ),
    address: <Job title={person.Address || ""} description="" />,
    status: (
      <MDBox ml={-1}>
        <MDBadge
          badgeContent="baptised"
          color="success"
          variant="gradient"
          size="sm"
        />
      </MDBox>
    ),
    mobile: (
      <MDTypography
        component="a"
        href="#"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {person.PhoneNumber || "N/A"}
      </MDTypography>
    ),
    action: <ActionMenu person={person} navigate={navigate} slug={slug} />,
  }));
}

function GroupDetail() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  // Keep consistent with your Groups page "mobile" breakpoint
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const [, dispatch] = useMaterialUIController();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  useEffect(() => {
    // Mock groups data
    const mockGroups = [
      {
        Name: "Youth Group",
        Category: "Ministry",
        Description: "Young adults ministry",
        filterLetter: "A",
      },
      {
        Name: "Worship Team",
        Category: "Service",
        Description: "Sunday worship service",
        filterLetter: "B",
      },
    ];
    const currentGroup = mockGroups.find(
      (g) => g.Name.toLowerCase().replace(/\s+/g, "_") === slug,
    );
    setGroup(currentGroup);
    if (currentGroup) {
      const stored = localStorage.getItem("people");
      if (stored) {
        const allPeople = JSON.parse(stored);
        const filteredMembers = allPeople.filter((person) =>
          (person.Name || "")
            .toLowerCase()
            .includes(currentGroup.filterLetter.toLowerCase()),
        );
        setMembers(filteredMembers);
      } else {
        setMembers([]);
      }
    } else {
      setMembers([]);
    }
  }, [slug]);

  // Mobile navbar title = group name
  useEffect(() => {
    if (!isMobile) {
      setMobileNavbarTitle(dispatch, null);
      return undefined;
    }
    if (group?.Name) {
      setMobileNavbarTitle(dispatch, group.Name);
    }
    return () => setMobileNavbarTitle(dispatch, null);
  }, [dispatch, group?.Name, isMobile]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((p) => (p?.Name || "").toLowerCase().includes(q));
  }, [members, searchQuery]);

  const rows = useMemo(
    () => buildGroupMemberRows(filteredMembers, navigate, slug),
    [filteredMembers, navigate, slug],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / rowsPerPage),
  );

  const paginatedMembers = filteredMembers.slice(
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

  const goToPage = (nextPage) => {
    const normalized = Math.min(totalPages, Math.max(1, nextPage));
    setPage(normalized);
    setInputValue(normalized.toString());
  };

  // Desktop page input handlers (FIXED: digits only + Enter commits without losing focus)
  const handleInputChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setInputValue(digitsOnly);
  };

  const handleInputBlur = () => {
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

  // Mobile pagination (matches People page)
  const MobilePaginationControls = () => (
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

  if (!group) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={{ xs: 3, xl: 6 }} pb={{ xs: 2, xl: 3 }}>
          <MDTypography variant="h4">Group not found</MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["groups", group.Name]} />
      <MDBox pt={{ xs: 3, xl: 6 }} pb={{ xs: 2, xl: 3 }}>
        {isMobile ? (
          // -------------------------
          // MOBILE VIEW (matches People page layout)
          // -------------------------
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
                placeholder="Search members..."
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
              {paginatedMembers.length ? (
                <List disablePadding>
                  {paginatedMembers.map((person, index) => {
                    const personId = person?._id || person?.id;
                    const key = personId || person?.Name || index;
                    return (
                      <ListItem
                        key={key}
                        disablePadding
                        divider
                        secondaryAction={
                          <ActionMenu
                            person={person}
                            navigate={navigate}
                            slug={slug}
                          />
                        }
                      >
                        <ListItemButton
                          onClick={() => {
                            if (!personId) return;
                            navigate(`/person/${personId}`, {
                              state: { from: `/group/${slug}` },
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
                    No members found.
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
              <MobilePaginationControls />
            </MDBox>
          </MDBox>
        ) : (
          // -------------------------
          // DESKTOP VIEW (table layout)
          // -------------------------
          <Grid container spacing={{ xs: 2, xl: 6 }}>
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
                  <MDBox>
                    <MDTypography variant="h6" color="white">
                      {group.Name}
                    </MDTypography>
                    <MDTypography variant="caption" color="white">
                      {group.Category} • {members.length} members
                    </MDTypography>
                  </MDBox>
                  <MDButton
                    variant="contained"
                    color="white"
                    iconOnly
                    aria-label="Add member"
                    onClick={() => {
                      // TODO: Implement add member flow
                      console.log("Add member to group");
                    }}
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
                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={2}
                  gap={2}
                >
                  <TextField
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ minWidth: 240 }}
                  />

                  {/* FIXED paginator (desktop/web) */}
                  <DesktopPaginationControls
                    page={page}
                    totalPages={totalPages}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onCommit={handleInputBlur}
                    goToPage={goToPage}
                  />
                </MDBox>
              </Card>
            </Grid>
          </Grid>
        )}
      </MDBox>

      {/* MOBILE floating add button (matches People page FAB/PAB position + size) */}
      {isMobile && (
        <IconButton
          onClick={() => {
            // TODO: Implement add member flow (route/modal)
            console.log("Add member to group:", slug);
          }}
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
            "&:hover": {
              background: ACCENT_CYAN,
              filter: "brightness(0.9)",
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

export default GroupDetail;
