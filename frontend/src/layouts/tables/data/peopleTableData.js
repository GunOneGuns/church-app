// layouts/tables/data/peopleTableData.js
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";
// import Checkbox from "@mui/material/Checkbox";
import { useState, useEffect } from "react";
import defaultProfilePic from "assets/images/default-profile-picture.png";
import { fetchPeople } from "services/convo-broker.js";
import { useNavigate } from "react-router-dom";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export const columns = [
  { Header: "name", accessor: "people", width: "35%", align: "left" },
  { Header: "address", accessor: "address", align: "left" },
  { Header: "status", accessor: "status", align: "center" },
  { Header: "mobile", accessor: "mobile", align: "center" },
  { Header: "", accessor: "action", align: "center" },
];

function People({ id, image, name, nameChi, district, onClick }) {
  const englishName =
    typeof name === "string" && name.trim() && name.trim() !== "-"
      ? name.trim()
      : "";
  const chineseName =
    typeof nameChi === "string" && nameChi.trim() && nameChi.trim() !== "-"
      ? nameChi.trim()
      : "";
  const displayName = englishName || chineseName || "-";
  const suffix = englishName && chineseName ? ` (${chineseName})` : "";

  return (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={onClick}
      sx={{ cursor: "pointer" }}
    >
      {/* <Checkbox color="primary" /> */}
      <MDAvatar src={image} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {displayName}
          {suffix}
        </MDTypography>
        <MDTypography variant="caption">{district}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

function AddressTitle({ title, description }) {
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

// Build rows from a raw people array
export function buildRows(rawPeople, navigate, from = "/people") {
  return rawPeople.map((person) => ({
    people: (
      <People
        image={person.ProfilePic || defaultProfilePic}
        name={person.Name || "-"}
        nameChi={person.NameChi}
        district={person.District || ""}
        id={person._id}
        onClick={() => navigate(`/person/${person._id}`, { state: { from } })}
      />
    ),
    address: <AddressTitle title={person.Address || "-"} description="" />,
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
      <MDTypography
        component="a"
        onClick={() =>
          navigate(`/person/${person._id}`, { state: { edit: true, from } })
        }
        variant="caption"
        color="text"
        fontWeight="medium"
        sx={{ cursor: "pointer" }}
      >
        <MoreVertIcon fontSize="small"></MoreVertIcon>
      </MDTypography>
    ),
  }));
}

export default function data() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);

  useEffect(() => {
    const loadPeople = async () => {
      await fetchPeople();
      const stored = localStorage.getItem("people");
      if (stored) {
        setPeople(JSON.parse(stored));
      }
    };
    loadPeople();
  }, []);

  return {
    columns,
    people,
    rows: buildRows(people, navigate),
  };
}
