// layouts/groups/group-detail.js
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Icon from "@mui/material/Icon";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";
import PersonMobileViewList from "components/PersonMobileViewList";
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
import Toast from "components/Toast";
import { fetchGroup, fetchPeople, updateGroup } from "services/convo-broker.js";

const MOBILE_PAGINATION_HEIGHT = 30;

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function getPersonLabel(person) {
  if (!person) return "";
  const name = person.Name || "";
  const nameChi = person.NameChi || "";
  if (name && nameChi) return `${name} (${nameChi})`;
  if (name || nameChi) return name || nameChi;
  const pid = person?._id || person?.id;
  if (pid) return `Unknown (${String(pid).slice(-6)})`;
  return "Unknown";
}

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

function ActionMenu({ person, navigate, slug, onRemove }) {
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
    if (onRemove) onRemove(person);
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

function PeopleCell({ image, name, nameChi, district, onClick }) {
  const englishName =
    typeof name === "string" && name.trim() ? name.trim() : "";
  const chineseName =
    typeof nameChi === "string" && nameChi.trim() ? nameChi.trim() : "";
  const displayName = englishName || chineseName || "N/A";
  const suffix = englishName && chineseName ? ` (${chineseName})` : "";

  return (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={onClick}
      sx={{ cursor: "pointer" }}
    >
      <MDAvatar src={image} name={displayName} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography
          display="block"
          variant="button"
          fontWeight="medium"
          sx={{ color: ACCENT_CYAN }}
        >
          {displayName}
          {suffix}
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

function buildGroupMemberRows(rawPeople, navigate, slug, onRemove) {
  return rawPeople.map((person) => ({
    people: (
      <PeopleCell
        image={person.ProfilePic || defaultProfilePic}
        name={person.Name}
        nameChi={person.NameChi}
        district={person.District || ""}
        onClick={() =>
          navigate(`/person/${person._id}`, {
            state: { from: `/group/${slug}` },
          })
        }
      />
    ),
    address: <Job title={person.Address || "-"} />,
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
    action: (
      <ActionMenu
        person={person}
        navigate={navigate}
        slug={slug}
        onRemove={onRemove}
      />
    ),
  }));
}

function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xl"));
  const [, dispatch] = useMaterialUIController();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
    actionLabel: null,
    onAction: null,
    autoHideDuration: 2000,
  });
  const [peopleOptions, setPeopleOptions] = useState([]);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 10;

  useEffect(() => {
    const toastFromNav = location.state?.toast;
    if (!toastFromNav?.message) return;

    const { undo } = toastFromNav || {};

    setToast({
      open: true,
      message: toastFromNav.message,
      severity: toastFromNav.severity || "success",
      autoHideDuration: toastFromNav.autoHideDuration ?? 2000,
      actionLabel: toastFromNav.actionLabel || null,
      onAction:
        undo?.members && isMongoObjectId(id)
          ? async () => {
              const base = await fetchGroup(id);
              await updateGroup(id, {
                Name: base?.Name || group?.Name || "",
                Description: base?.Description || group?.Description || "",
                GroupPic: base?.GroupPic || group?.GroupPic || "",
                Members: undo.members,
              });
              const refreshed = await fetchGroup(id);
              setGroup(refreshed);
              setMembers(
                Array.isArray(refreshed?.Members) ? refreshed.Members : [],
              );
            }
          : null,
    });

    const nextState = { ...(location.state || {}) };
    delete nextState.toast;
    navigate(location.pathname, {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    });
  }, [
    group?.Description,
    group?.GroupPic,
    group?.Name,
    id,
    location.pathname,
    location.state,
    navigate,
  ]);

  useEffect(() => {
    const loadGroup = async () => {
      if (!isMongoObjectId(id)) {
        setGroup(null);
        setMembers([]);
        return;
      }

      try {
        const fetched = await fetchGroup(id);
        setGroup(fetched);
        setMembers(Array.isArray(fetched?.Members) ? fetched.Members : []);
      } catch (error) {
        console.error("Failed to load group:", error);
        setGroup(null);
        setMembers([]);
      }
    };

    loadGroup();
  }, [id]);

  useEffect(() => {
    const loadPeople = async () => {
      await fetchPeople();
      const stored = localStorage.getItem("people");
      if (stored) setPeopleOptions(JSON.parse(stored));
    };
    loadPeople();
  }, []);

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

  const handleRemoveMember = useCallback(
    async (person) => {
      if (!isMongoObjectId(id)) {
        setToast({
          open: true,
          message: "Remove member is only available for saved groups.",
          severity: "warning",
        });
        return;
      }

      const personId = person?._id || person?.id;
      if (!personId) return;

      const currentIds = (members || [])
        .map((m) => m?._id || m?.id)
        .filter(Boolean)
        .map(String);

      const nextMembers = currentIds.filter((mid) => mid !== String(personId));

      try {
        await updateGroup(id, {
          Name: group?.Name || "",
          Description: group?.Description || "",
          GroupPic: group?.GroupPic || "",
          Members: nextMembers,
        });

        const refreshed = await fetchGroup(id);
        setGroup(refreshed);
        setMembers(Array.isArray(refreshed?.Members) ? refreshed.Members : []);

        setToast({
          open: true,
          message: "Member removed.",
          severity: "success",
          autoHideDuration: 6000,
          actionLabel: "Undo",
          onAction: async () => {
            await updateGroup(id, {
              Name: group?.Name || "",
              Description: group?.Description || "",
              GroupPic: group?.GroupPic || "",
              Members: currentIds,
            });
            const restored = await fetchGroup(id);
            setGroup(restored);
            setMembers(
              Array.isArray(restored?.Members) ? restored.Members : [],
            );
          },
        });
      } catch (error) {
        setToast({
          open: true,
          message: error?.message || "Failed to remove member.",
          severity: "error",
          autoHideDuration: 2000,
          actionLabel: null,
          onAction: null,
        });
      }
    },
    [group?.Description, group?.GroupPic, group?.Name, id, members],
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    const qDigits = q.replace(/\D/g, "");

    return members.filter((p) => {
      const name = (p?.Name || "").toLowerCase();
      const nameChi = (p?.NameChi || "").toLowerCase();
      const phoneRaw = (p?.PhoneNumber ?? p?.phoneNumber ?? "").toString();
      const phoneDigits = phoneRaw.replace(/\D/g, "");
      const phoneMatch = qDigits ? phoneDigits.includes(qDigits) : false;
      return name.includes(q) || nameChi.includes(q) || phoneMatch;
    });
  }, [members, searchQuery]);

  const rows = useMemo(
    () =>
      buildGroupMemberRows(filteredMembers, navigate, id, handleRemoveMember),
    [filteredMembers, navigate, id, handleRemoveMember],
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

  const handleOpenAddMembers = () => {
    if (!isMongoObjectId(id)) {
      setToast({
        open: true,
        message: "Add members is only available for saved groups.",
        severity: "warning",
      });
      return;
    }
    setSelectedToAdd([]);
    setMemberQuery("");
    setMemberPickerOpen(true);
    setAddMembersOpen(true);
  };

  const handleConfirmAddMembers = async () => {
    if (!isMongoObjectId(id)) return;
    const currentIds = (members || [])
      .map((m) => m?._id || m?.id)
      .filter(Boolean)
      .map(String);
    const nextIds = (selectedToAdd || [])
      .map((p) => p?._id || p?.id)
      .filter(Boolean)
      .map(String);
    const merged = Array.from(new Set([...currentIds, ...nextIds]));

    try {
      await updateGroup(id, {
        Name: group?.Name || "",
        Description: group?.Description || "",
        GroupPic: group?.GroupPic || "",
        Members: merged,
      });
      const refreshed = await fetchGroup(id);
      setGroup(refreshed);
      setMembers(Array.isArray(refreshed?.Members) ? refreshed.Members : []);
      setAddMembersOpen(false);
      setToast({
        open: true,
        message: "Members added.",
        severity: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || "Failed to add members.",
        severity: "error",
      });
    }
  };

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
                placeholder="Search..."
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
                // "&::-webkit-scrollbar": { display: "none" },
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              <PersonMobileViewList
                items={paginatedMembers}
                emptyText="No members found."
                getAvatarSrc={(person) =>
                  person?.ProfilePic || defaultProfilePic
                }
                getAvatarName={(person) => person?.Name || "N/A"}
                getPrimary={(person) => person?.Name || "N/A"}
                getSecondary={(person) => person?.District || ""}
                onItemClick={(person) => {
                  const personId = person?._id || person?.id;
                  if (!personId) return;
                  navigate(`/person/${personId}`, {
                    state: { from: `/group/${id}` },
                  });
                }}
                renderAction={(person) => (
                  <ActionMenu
                    person={person}
                    navigate={navigate}
                    slug={id}
                    onRemove={handleRemoveMember}
                  />
                )}
                primaryTypographyProps={{
                  noWrap: true,
                  sx: { color: ACCENT_CYAN },
                }}
                secondaryTypographyProps={{ noWrap: true }}
              />
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
                  <MDBox sx={{ minWidth: 0, flex: 1, pr: 2 }}>
                    <MDTypography
                      variant="h6"
                      color="white"
                      noWrap
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.Name}
                    </MDTypography>
                    <MDTypography
                      variant="caption"
                      color="white"
                      noWrap
                      sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(group.Category || "").trim()
                        ? `${group.Category} • `
                        : ""}
                      {members.length} members
                    </MDTypography>
                  </MDBox>
                  <MDButton
                    variant="contained"
                    color="white"
                    iconOnly
                    aria-label="Add member"
                    onClick={() => {
                      handleOpenAddMembers();
                    }}
                    sx={{
                      "& .MuiIcon-root": { fontSize: "27px !important" },
                    }}
                  >
                    <Icon sx={{ fontSize: 332 }}>add</Icon>
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
                    placeholder="Search..."
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
            handleOpenAddMembers();
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
      <Dialog
        open={addMembersOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            setMemberPickerOpen(false);
            return;
          }
          setAddMembersOpen(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          <span>Add Members</span>
          <IconButton
            aria-label="Close"
            onClick={() => setAddMembersOpen(false)}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <Icon fontSize="small">close</Icon>
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {(() => {
            const existingMemberIds = new Set(
              (members || [])
                .map((m) => m?._id || m?.id)
                .filter(Boolean)
                .map(String),
            );

            return (
              <Autocomplete
                multiple
                options={peopleOptions}
                value={selectedToAdd}
                inputValue={memberQuery}
                onInputChange={(_e, next) => {
                  setMemberQuery(next);
                  if (!next.trim()) {
                    setMemberPickerOpen(true);
                    return;
                  }
                  const input = next.trim().toLowerCase();
                  const matchCount = peopleOptions.filter((p) => {
                    const name = (p?.Name || "").toLowerCase();
                    const nameChi = (p?.NameChi || "").toLowerCase();
                    return name.includes(input) || nameChi.includes(input);
                  }).length;
                  setMemberPickerOpen(matchCount > 0);
                }}
                onChange={(_e, next) => setSelectedToAdd(next)}
                open={memberPickerOpen}
                onOpen={() => setMemberPickerOpen(true)}
                onClose={() => setMemberPickerOpen(false)}
                openOnFocus
                disableCloseOnSelect
                getOptionLabel={getPersonLabel}
                isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
                getOptionDisabled={(option) =>
                  existingMemberIds.has(String(option?._id || option?.id))
                }
                filterOptions={(options, state) => {
                  const input = (state.inputValue || "").trim().toLowerCase();
                  const filtered = !input
                    ? options
                    : options.filter((p) => {
                        const name = (p?.Name || "").toLowerCase();
                        const nameChi = (p?.NameChi || "").toLowerCase();
                        return name.includes(input) || nameChi.includes(input);
                      });

                  const available = [];
                  const alreadyAdded = [];
                  filtered.forEach((option) => {
                    const optionId = option?._id || option?.id;
                    if (existingMemberIds.has(String(optionId))) {
                      alreadyAdded.push(option);
                    } else {
                      available.push(option);
                    }
                  });

                  return [...available, ...alreadyAdded];
                }}
                noOptionsText=""
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  const optionId = option?._id || option?.id;
                  const isExisting = existingMemberIds.has(String(optionId));
                  return (
                    <li
                      key={optionId || key}
                      {...rest}
                      style={{
                        ...rest.style,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {getPersonLabel(option)}
                      </span>
                      {isExisting && (
                        <span style={{ opacity: 0.8, fontSize: 12 }}>
                          Added
                        </span>
                      )}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Members"
                    placeholder="Search people..."
                    autoFocus
                    sx={{ mt: 1 }}
                  />
                )}
              />
            );
          })()}
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="text"
            color="secondary"
            onClick={() => setAddMembersOpen(false)}
          >
            Cancel
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleConfirmAddMembers}
          >
            Add
          </MDButton>
        </DialogActions>
      </Dialog>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        autoHideDuration={toast.autoHideDuration}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            open: false,
            actionLabel: null,
            onAction: null,
          }))
        }
      />
    </DashboardLayout>
  );
}

export default GroupDetail;
