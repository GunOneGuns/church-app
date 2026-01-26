// layouts/groups/data/groupsTableData.js
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@mui/material/Icon";
import { fetchGroups } from "services/convo-broker.js";
import MDAvatar from "components/MDAvatar";
import defaultProfilePic from "assets/images/default-profile-picture.png";

export const columns = [
  { Header: "name", accessor: "group", width: "35%", align: "left" },
  { Header: "description", accessor: "description", align: "left" },
  { Header: "members", accessor: "members", align: "center" },
  { Header: "", accessor: "action", align: "center" },
];

function Group({ image, name, category, onClick }) {
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

function isMongoObjectId(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

// Build rows from a raw groups array
export function buildRows(rawGroups, navigate) {
  return rawGroups.map((group) => {
    const slug = (group.Name || "").toLowerCase().replace(/\s+/g, "_");
    const targetId =
      isMongoObjectId(group._id) ? group._id : slug || group._id || "unknown";
    return {
      group: (
        <Group
          image={group.GroupPic || defaultProfilePic}
          name={group.Name || "N/A"}
          category={group.Category || ""}
          onClick={() => navigate(`/group/${targetId}`)}
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
          {group.MemberCount ?? group.Members?.length ?? 0}
        </MDTypography>
      ),
      action: (
        <MDTypography
          component="a"
          onClick={() =>
            navigate(`/group/${targetId}`, { state: { edit: true } })
          }
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

  const refreshGroups = async () => {
    const fetched = await fetchGroups();
    if (Array.isArray(fetched) && fetched.length) {
      setGroups(fetched);
      return fetched;
    }

    const stored = localStorage.getItem("groups");
    if (stored) {
      const parsed = JSON.parse(stored);
      setGroups(parsed);
      return parsed;
    }

    const fallback = [
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
    setGroups(fallback);
    return fallback;
  };

  useEffect(() => {
    refreshGroups();
  }, []);

  return {
    columns,
    groups, // expose raw groups
    rows: buildRows(groups, navigate),
    refreshGroups,
    setGroups,
  };
}
