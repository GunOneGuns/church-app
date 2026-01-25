import React from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useNavigate } from "react-router-dom";

function PersonDisplay({
  person,
  personalInfoCustomFieldsForRender,
  relationshipCustomFieldsForRender,
  peopleList, // Used for looking up related person's profile pic
  defaultProfilePic,
  onClearRelationships,
}) {
  const navigate = useNavigate();

  const handleRelatedPersonClick = (relatedPerson) => {
    if (!relatedPerson?._id) return;
    navigate(`/person/${relatedPerson._id}`);
  };

  const displayOrNil = (v) => {
    if (v === undefined || v === null || v === "") return "NIL";
    return String(v);
  };

  const profilePicSrc = person?.ProfilePic
    ? person.ProfilePic
    : defaultProfilePic;

  return (
    <Grid container spacing={3}>
      {/* Left Column: Profile Picture and Name Only */}
      <Grid item xs={12} md={4} lg={3}>
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          height="100%"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 1,
            p: 0,
            border: "none",
          }}
        >
          {/* Profile Picture Display */}
          <MDBox
            component="img"
            src={profilePicSrc}
            alt={`${person?.Name || "User"}'s profile`}
            width="150px"
            height="150px"
            borderRadius="50%"
            sx={{ objectFit: "cover", border: "2px solid #ddd" }}
          />

          {/* Display Name */}
          <MDTypography variant="h5" mt={2}>
            {person?.Name || ""}
          </MDTypography>
        </MDBox>
      </Grid>

      {/* Right Column: Read-only Personal Info & Related Persons Panels */}
      <Grid item xs={12} md={8} lg={9}>
        {/* Panel 1: Personal Information */}
        <Card sx={{ mb: 3, p: 2 }}>
          <MDTypography variant="h5" fontWeight="bold" mb={2}>
            Personal Information
          </MDTypography>

          <MDBox display="flex" flexDirection="column" gap={1}>
            {/* Always render schema default fields; show NIL when missing */}
            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Name:
              </MDTypography>{" "}
              {displayOrNil(person?.Name)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Chinese Name:
              </MDTypography>{" "}
              {displayOrNil(person?.NameChi)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Birth Year:
              </MDTypography>{" "}
              {displayOrNil(person?.BirthYear)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Phone Number:
              </MDTypography>{" "}
              {displayOrNil(person?.PhoneNumber)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Announcement Group:
              </MDTypography>{" "}
              {displayOrNil(person?.AnnouncementGroup)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Chat Group:
              </MDTypography>{" "}
              {displayOrNil(person?.ChatGroup)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Email:
              </MDTypography>{" "}
              {displayOrNil(person?.Email)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                District:
              </MDTypography>{" "}
              {displayOrNil(person?.District)}
            </MDTypography>

            <MDTypography variant="body2">
              <MDTypography
                component="span"
                fontWeight="bold"
                sx={{ fontSize: "1rem" }}
              >
                Address:
              </MDTypography>{" "}
              {displayOrNil(person?.Address)}
            </MDTypography>

            {/* Render generic custom fields */}
            {personalInfoCustomFieldsForRender.map((field, index) => (
              <MDTypography key={`pcf-view-${index}`} variant="body2">
                <MDTypography
                  component="span"
                  fontWeight="bold"
                  sx={{ fontSize: "1rem" }}
                >
                  {field.key || "Custom"}:
                </MDTypography>{" "}
                {field.value === undefined ||
                field.value === null ||
                field.value === ""
                  ? "NIL"
                  : typeof field.value === "object"
                  ? JSON.stringify(field.value)
                  : String(field.value)}
              </MDTypography>
            ))}
          </MDBox>
        </Card>

        {/* Panel 2: Related Persons */}
        <Card sx={{ p: 2 }}>
          <MDBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            gap={1}
          >
            <MDTypography variant="h5" fontWeight="bold">
              Related Persons
            </MDTypography>

            {onClearRelationships && (
              <MDButton
                variant="outlined"
                color="error"
                size="small"
                onClick={onClearRelationships}
                disabled={relationshipCustomFieldsForRender.length === 0}
              >
                Clear All (Test)
              </MDButton>
            )}
          </MDBox>

          <MDBox display="flex" flexWrap="wrap" gap={2}>
            {relationshipCustomFieldsForRender.map((field, index) => {
              // Prefer ID-based lookup (more reliable than Name)
              const relatedPerson = field.personId
                ? peopleList.find((p) => p._id === field.personId)
                : peopleList.find((p) => p.Name === field.value);

              const relatedPersonName =
                relatedPerson?.Name || field.value || "NIL";
              const relatedPersonRelation = field.value2 || "NIL";
              const relatedPersonProfilePic =
                relatedPerson?.ProfilePic || defaultProfilePic;

              return (
                <MDBox
                  key={`rcf-view-${index}`}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  textAlign="center"
                  width="80px"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRelatedPersonClick(relatedPerson)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRelatedPersonClick(relatedPerson);
                    }
                  }}
                  sx={{
                    cursor: relatedPerson?._id ? "pointer" : "default",
                    outline: "none",
                  }}
                >
                  <MDBox
                    component="img"
                    src={relatedPersonProfilePic}
                    alt={`${relatedPersonName}'s profile`}
                    width="60px"
                    height="60px"
                    borderRadius="50%"
                    sx={{ objectFit: "cover", mb: 0.5 }}
                  />

                  <MDTypography
                    variant="caption"
                    fontWeight="medium"
                    lineHeight={1.2}
                  >
                    {relatedPersonName}
                  </MDTypography>

                  <MDTypography variant="caption" color="text" lineHeight={1.2}>
                    {relatedPersonRelation}
                  </MDTypography>
                </MDBox>
              );
            })}

            {relationshipCustomFieldsForRender.length === 0 && (
              <MDTypography variant="body2" color="text">
                No related persons found.
              </MDTypography>
            )}
          </MDBox>
        </Card>
      </Grid>
    </Grid>
  );
}

export default PersonDisplay;
