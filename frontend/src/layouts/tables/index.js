import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import PersonMobileViewList from "components/PersonMobileViewList";
import PeopleActionMenu from "components/PeopleActionMenu";
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
import Toast from "components/Toast";
import { deletePerson } from "services/convo-broker.js";

const PEOPLE_TABLE_TITLE = "Brothers & Sisters";
const MOBILE_PAGINATION_HEIGHT = 30;
const DELETE_UNDO_TIMEOUT_MS = 6000;

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

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
  const { people, setPeople, refreshPeople } = peopleTableData();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const overlayActive = location.state?.openPeopleOverlay === true;
  const [, dispatch] = useMaterialUIController();
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
    actionLabel: null,
    onAction: null,
    autoHideDuration: 2000,
  });
  const pendingDeleteRef = useRef(new Map());

  const handleCloseToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      open: false,
      actionLabel: null,
      onAction: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      pendingDeleteRef.current.forEach((entry) => {
        clearTimeout(entry.timerId);
      });
      pendingDeleteRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const toastFromNav = location.state?.toast;
    if (!toastFromNav?.message) return;

    setToast({
      open: true,
      message: toastFromNav.message,
      severity: toastFromNav.severity || "success",
      actionLabel: toastFromNav.actionLabel || null,
      onAction: toastFromNav.onAction || null,
      autoHideDuration: toastFromNav.autoHideDuration ?? 2000,
    });

    const nextState = { ...(location.state || {}) };
    delete nextState.toast;
    navigate(location.pathname, {
      replace: true,
      state: Object.keys(nextState).length ? nextState : null,
    });
  }, [location.pathname, location.state, navigate]);

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
    const qDigits = q.replace(/\D/g, "");
    return people.filter((p) => {
      const name = (p?.Name || "").toLowerCase();
      const nameChi = (p?.NameChi || "").toLowerCase();
      const phoneRaw = (p?.PhoneNumber || "").toString();
      const phoneDigits = phoneRaw.replace(/\D/g, "");
      const phoneMatch = qDigits ? phoneDigits.includes(qDigits) : false;
      return name.includes(q) || nameChi.includes(q) || phoneMatch;
    });
  }, [people, searchQuery]);

  const handleDeletePerson = useCallback(
    async (person) => {
      const personId = person?._id || person?.id;
      if (!isMongoObjectId(personId)) {
        setToast({
          open: true,
          message: "Delete is only available for saved people.",
          severity: "warning",
          actionLabel: null,
          onAction: null,
          autoHideDuration: 2000,
        });
        return;
      }

      const personToDelete = (people || []).find(
        (p) => String(p?._id || p?.id) === String(personId),
      );
      if (!personToDelete) return;

      setPeople((prev) => {
        const next = (prev || []).filter(
          (p) => String(p?._id || p?.id) !== String(personId),
        );
        localStorage.setItem("people", JSON.stringify(next));
        return next;
      });

      const timerId = setTimeout(async () => {
        try {
          await deletePerson(personId);
          localStorage.removeItem("people");
          await refreshPeople();
        } catch (error) {
          setPeople((prev) => {
            const restored = [personToDelete, ...(prev || [])];
            localStorage.setItem("people", JSON.stringify(restored));
            return restored;
          });
          setToast({
            open: true,
            message: error?.message || "Failed to delete person.",
            severity: "error",
            actionLabel: null,
            onAction: null,
            autoHideDuration: 2000,
          });
        } finally {
          pendingDeleteRef.current.delete(String(personId));
        }
      }, DELETE_UNDO_TIMEOUT_MS);

      pendingDeleteRef.current.set(String(personId), {
        timerId,
        person: personToDelete,
      });

      setToast({
        open: true,
        message: "Person deleted.",
        severity: "success",
        autoHideDuration: DELETE_UNDO_TIMEOUT_MS,
        actionLabel: "Undo",
        onAction: async () => {
          const pending = pendingDeleteRef.current.get(String(personId));
          if (!pending) return;
          clearTimeout(pending.timerId);
          pendingDeleteRef.current.delete(String(personId));
          setPeople((prev) => {
            const restored = [pending.person, ...(prev || [])];
            localStorage.setItem("people", JSON.stringify(restored));
            return restored;
          });
        },
      });
    },
    [people, refreshPeople, setPeople],
  );

  const rows = useMemo(
    () =>
      buildPeopleRows(filteredPeople, navigate, {
        from: "/people",
        onDelete: handleDeletePerson,
      }),
    [filteredPeople, handleDeletePerson, navigate],
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
                "&::-webkit-scrollbar": { display: "none" },
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              <PersonMobileViewList
                items={paginatedPeople}
                emptyText="No people found."
                getAvatarSrc={(person) =>
                  person?.ProfilePic || defaultProfilePic
                }
                getAvatarName={(person) => person?.Name || "N/A"}
                getPrimary={(person) => person?.Name || "N/A"}
                getSecondary={(person) => person?.NameChi?.trim?.() || null}
                onItemClick={(person) => {
                  const personId = person?._id || person?.id;
                  if (!personId) return;
                  navigate(`/person/${personId}`, {
                    state: { from: "/people" },
                  });
                }}
                renderAction={(person) => (
                  <PeopleActionMenu
                    person={person}
                    from="/people"
                    onDelete={handleDeletePerson}
                    iconColor={ACCENT_CYAN}
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
                    sx={{
                      "& .MuiIcon-root": { fontSize: "27px !important" },
                    }}
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
                    placeholder="Search..."
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

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        autoHideDuration={toast.autoHideDuration}
        onClose={handleCloseToast}
      />
      <Footer />
    </DashboardLayout>
  );
}

export default People;
