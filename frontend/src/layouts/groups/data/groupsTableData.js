// layouts/groups/data/groupsTableData.js
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@mui/material/Icon";

export const columns = [
  { Header: "name", accessor: "group", width: "35%", align: "left" },
  { Header: "description", accessor: "description", align: "left" },
  { Header: "members", accessor: "members", align: "center" },
  { Header: "", accessor: "action", align: "center" },
];

function Group({ name, category, slug, onClick }) {
  return (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={onClick}
      sx={{ cursor: "pointer" }}
    >
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
        <MDTypography variant="caption">{category}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

function Description({ text }) {
  return (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {text}
      </MDTypography>
    </MDBox>
  );
}

// Build rows from a raw groups array
export function buildRows(rawGroups, navigate) {
  return rawGroups.map((group) => {
    const slug = (group.Name || "").toLowerCase().replace(/\s+/g, "_");
    return {
      group: (
        <Group
          name={group.Name || "N/A"}
          category={group.Category || ""}
          slug={slug}
          onClick={() => navigate(`/group/${slug}`)}
        />
      ),
      description: <Description text={group.Description || ""} />,
      members: (
        <MDTypography
          component="a"
          href="#"
          variant="caption"
          color="text"
          fontWeight="medium"
        >
          {group.MemberCount || 0}
        </MDTypography>
      ),
      action: (
        <MDTypography
          component="a"
          onClick={() => navigate(`/group/${slug}`, { state: { edit: true } })}
          variant="caption"
          color="text"
          fontWeight="medium"
          sx={{ cursor: "pointer" }}
        >
          <Icon fontSize="small">edit</Icon>
        </MDTypography>
      ),
    };
  });
}

export default function data() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API call to fetch groups
    // For now, using mock data with dynamic member counts
    const stored = localStorage.getItem("people");
    let mockGroups = [
      {
        _id: "1",
        Name: "Youth Group",
        Category: "Ministry",
        Description: "Young adults ministry",
        filterLetter: "A",
        MemberCount: 0,
      },
      {
        _id: "2",
        Name: "Worship Team",
        Category: "Service",
        Description: "Sunday worship service",
        filterLetter: "B",
        MemberCount: 0,
      },
    ];

    // Calculate actual member counts
    if (stored) {
      const allPeople = JSON.parse(stored);
      mockGroups = mockGroups.map((group) => ({
        ...group,
        MemberCount: allPeople.filter((person) =>
          (person.Name || "")
            .toLowerCase()
            .includes(group.filterLetter.toLowerCase()),
        ).length,
      }));
    }

    setGroups(mockGroups);
  }, []);

  return {
    columns,
    groups, // expose raw groups
    rows: buildRows(groups, navigate),
  };
}
