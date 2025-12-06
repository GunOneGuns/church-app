// layouts/groups/group-detail.js
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import Icon from "@mui/material/Icon";
import { columns as peopleColumns } from "layouts/tables/data/peopleTableData";
import defaultProfilePic from "assets/images/default-profile-picture.png";

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
        sx={{ color: "text.secondary" }}
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

function People({ image, name, district, id, onClick }) {
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
        <MDTypography display="block" variant="button" fontWeight="medium">
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
      <People
        image={person.ProfilePic || defaultProfilePic}
        name={person.Name || "N/A"}
        district={person.District || ""}
        id={person._id}
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
        {person.Contact || "N/A"}
      </MDTypography>
    ),
    action: <ActionMenu person={person} navigate={navigate} slug={slug} />,
  }));
}

function GroupDetail() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
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

    // Find group by slug
    const currentGroup = mockGroups.find(
      (g) => g.Name.toLowerCase().replace(/\s+/g, "_") === slug
    );
    setGroup(currentGroup);

    if (currentGroup) {
      // Get people from localStorage
      const stored = localStorage.getItem("people");
      if (stored) {
        const allPeople = JSON.parse(stored);
        // Filter people whose name contains the group's filter letter
        const filteredMembers = allPeople.filter((person) =>
          (person.Name || "")
            .toLowerCase()
            .includes(currentGroup.filterLetter.toLowerCase())
        );
        setMembers(filteredMembers);
      }
    }
  }, [slug]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((p) => (p?.Name || "").toLowerCase().includes(q));
  }, [members, searchQuery]);

  // Rebuild rows from filtered members
  const rows = useMemo(
    () => buildGroupMemberRows(filteredMembers, navigate, slug),
    [filteredMembers, navigate, slug]
  );

  // Pagination derived from filtered rows
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
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

  if (!group) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox pt={6} pb={3}>
          <MDTypography variant="h4">Group not found</MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={["groups", group.Name]} />
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
                <MDBox display="flex" alignItems="center" gap={2}>
                  <MDBox>
                    <MDTypography variant="h6" color="white">
                      {group.Name}
                    </MDTypography>
                    <MDTypography variant="caption" color="white">
                      {group.Category} • {members.length} members
                    </MDTypography>
                  </MDBox>
                </MDBox>
                <MDButton
                  variant="contained"
                  color="white"
                  onClick={() => {
                    // TODO: Implement add member functionality
                    console.log("Add member to group");
                  }}
                >
                  Add
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
                alignItems="center"
                p={2}
                gap={2}
              >
                {/* Search on the far left */}
                <TextField
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ minWidth: 240 }}
                />

                {/* Pagination controls on the right */}
                {totalPages > 1 && (
                  <MDBox display="flex" alignItems="center" gap={1}>
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
                      onKeyDown={(e) => e.key === "Enter" && handleInputBlur()}
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

export default GroupDetail;
