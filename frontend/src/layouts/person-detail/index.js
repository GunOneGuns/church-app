import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import { styled } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  updatePerson,
  fetchPeople,
  createPerson,
  deletePerson,
} from "services/convo-broker.js";

// Cloudinary
import cld from "services/cloudinary/cloudinary";
import { AdvancedImage } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";
// Instantiate a CloudinaryImage object for the image with the public ID, 'docs/models'.
const myImage = cld.image("images_mbi0cg");

// Resize to 250 x 250 pixels using the 'fill' crop mode.
myImage.resize(fill().width(250).height(250));
const SG_DISTRICTS = [
  "Ang Mo Kio",
  "Bedok",
  "Bishan",
  "Bukit Batok",
  "Bukit Merah",
  "Bukit Panjang",
  "Bukit Timah",
  "Central Area",
  "Choa Chu Kang",
  "Clementi",
  "Geylang",
  "Hougang",
  "Jurong East",
  "Jurong West",
  "Kallang",
  "Marine Parade",
  "Pasir Ris",
  "Punggol",
  "Queenstown",
  "Sembawang",
  "Sengkang",
  "Serangoon",
  "Tampines",
  "Toa Payoh",
  "Woodlands",
  "Yishun",
];
// suggestions for custom field names
const FIELD_NAME_SUGGESTIONS = [
  "Baptism Date",
  "Cell Group",
  "Role",
  "Notes",
  "Emergency Contact",
  "Relationship",
];
// suggestions for relationship type
const RELATION_SUGGESTIONS = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Husband",
  "Wife",
  "Grandfather",
  "Grandmother",
  "Uncle",
  "Aunt",
  "Cousin",
];
const Highlight = styled("span")({
  fontWeight: 600,
});
function splitMatch(label, query) {
  if (!query) return [label, null, ""];
  const lowerLabel = label.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  if (index === -1) return [label, null, ""];
  return [
    label.slice(0, index),
    label.slice(index, index + query.length),
    label.slice(index + query.length),
  ];
}

// Define a constant for the default profile picture URL
const DEFAULT_PROFILE_PIC_URL = "team-2.jpg";

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";
  const [person, setPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  // Initialize editedPerson with a profilePic field
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { profilePic: "" } : null // Added profilePic initialization
  );
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [peopleList, setPeopleList] = useState([]); // for Person suggestions
  // load this person's data
  useEffect(() => {
    if (!isAddMode) {
      const stored = localStorage.getItem("people");
      if (stored) {
        const people = JSON.parse(stored);
        const found = people.find((p) => p._id === id);
        if (found) {
          setPerson(found);
          setEditedPerson(found);
        } else {
          setShowNotFoundModal(true);
        }
      }
    }
  }, [id, isAddMode]);
  // always load full people list (for Person suggestions)
  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      setPeopleList(people);
    }
  }, []);
  const personNameOptions = peopleList
    .map((p) => p.Name)
    .filter((name) => !!name);
  const handleEdit = () => {
    setIsEditing(true);
  };
  const handleSave = async () => {
    try {
      const dataToSave = { ...editedPerson };
      // apply custom fields
      customFields.forEach((field) => {
        if (!field.key) return;
        const keyLower = field.key.toLowerCase();
        if (keyLower === "relationship") {
          // nested structure: Relationship > person, relation
          dataToSave[field.key] = {
            person: field.value || "",
            relation: field.value2 || "",
          };
        } else {
          dataToSave[field.key] = field.value;
        }
      });
      if (isAddMode) {
        await createPerson(dataToSave);
        localStorage.removeItem("people");
        await fetchPeople();
        navigate("/tables");
      } else {
        await updatePerson(id, dataToSave);
        localStorage.removeItem("people");
        await fetchPeople();
        const stored = localStorage.getItem("people");
        if (stored) {
          const people = JSON.parse(stored);
          const found = people.find((p) => p._id === id);
          setPerson(found);
          setEditedPerson(found);
        }
        setIsEditing(false);
      }
      setCustomFields([]);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };
  const handleDiscard = () => {
    if (isAddMode) {
      navigate("/tables");
    } else {
      setEditedPerson(person);
      setIsEditing(false);
      setCustomFields([]);
    }
  };
  const handleChange = (field, value) => {
    setEditedPerson({ ...editedPerson, [field]: value });
  };
  const addCustomField = () => {
    // include second value slot for relationship
    setCustomFields([...customFields, { key: "", value: "", value2: "" }]);
  };
  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };
  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };
  const removeExistingField = (key) => {
    const updated = { ...editedPerson };
    delete updated[key];
    setEditedPerson(updated);
  };
  const handleCloseModal = () => {
    setShowNotFoundModal(false);
    navigate("/tables");
  };
  const handleDelete = async () => {
    try {
      await deletePerson(id);
      localStorage.removeItem("people");
      await fetchPeople();
      navigate("/tables");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    setShowDeleteModal(false);
  };
  if (!isAddMode && !person && !showNotFoundModal) return <div>Loading...</div>;
  const knownFields = [
    "_id",
    "id",
    "Name",
    "NameChi",
    "District",
    "Address",
    "Contact",
    "profilePic", // Added profilePic to known fields
  ];
  const extraFields = person
    ? Object.keys(person).filter((key) => !knownFields.includes(key))
    : [];
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <MDTypography variant="h4">
                {isAddMode
                  ? "Add Person"
                  : isEditing
                  ? "Edit Person"
                  : `${person?.Name || ""}${
                      person?.NameChi ? ", " + person.NameChi : ""
                    }`}
              </MDTypography>
              <MDBox display="flex" gap={1}>
                {isEditing || isAddMode ? (
                  <>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={handleSave}
                    >
                      {isAddMode ? "Add" : "Save"}
                    </MDButton>
                    <MDButton
                      variant="outlined"
                      color="secondary"
                      onClick={handleDiscard}
                    >
                      {isAddMode ? "Cancel" : "Discard"}
                    </MDButton>
                  </>
                ) : (
                  <>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={handleEdit}
                    >
                      Edit
                    </MDButton>
                    <MDButton
                      variant="gradient"
                      color="error"
                      onClick={() => setShowDeleteModal(true)}
                    >
                      Delete
                    </MDButton>
                  </>
                )}
              </MDBox>
            </MDBox>
            <AdvancedImage cldImg={myImage} />

            {/* Profile Picture Display - View Mode (always shows an image) */}
            {!isEditing && !isAddMode && (
              <MDBox display="flex" justifyContent="center" mb={3}>
                <MDBox
                  component="img"
                  src={person?.profilePic || myImage} // Use default if no profilePic
                  alt={`${person?.Name || "User"}'s profile`}
                  width="120px"
                  height="120px"
                  borderRadius="50%"
                  sx={{ objectFit: "cover" }}
                />
              </MDBox>
            )}

            {isEditing || isAddMode ? (
              <MDBox display="flex" flexDirection="column" gap={2}>
                {/* Profile Picture Input & Preview - Edit/Add Mode (always shows an image preview) */}
                <MDBox
                  display="flex"
                  alignItems="center"
                  mb={1}
                  mt={1}
                  justifyContent="center"
                  flexDirection="column"
                >
                  <MDBox
                    component="img"
                    src={editedPerson?.profilePic || DEFAULT_PROFILE_PIC_URL} // Use default if no profilePic
                    alt="Profile preview"
                    width="120px"
                    height="120px"
                    borderRadius="50%"
                    sx={{ objectFit: "cover", mt: 1 }}
                  />
                </MDBox>
                <TextField
                  variant="outlined"
                  label="Profile Picture URL"
                  value={editedPerson?.profilePic || ""}
                  onChange={(e) => handleChange("profilePic", e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <TextField
                  variant="outlined"
                  label="Name"
                  value={editedPerson?.Name || ""}
                  onChange={(e) => handleChange("Name", e.target.value)}
                  fullWidth
                />
                <TextField
                  variant="outlined"
                  label="Chinese Name"
                  value={editedPerson?.NameChi || ""}
                  onChange={(e) => handleChange("NameChi", e.target.value)}
                  fullWidth
                />
                <TextField
                  variant="outlined"
                  select
                  label="District"
                  value={editedPerson?.District || ""}
                  onChange={(e) => handleChange("District", e.target.value)}
                  fullWidth
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { height: 56 },
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      paddingTop: "16.5px",
                      paddingBottom: "16.5px",
                    },
                  }}
                >
                  {SG_DISTRICTS.map((district) => (
                    <MenuItem key={district} value={district}>
                      {district}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  variant="outlined"
                  label="Address"
                  value={editedPerson?.Address || ""}
                  onChange={(e) => handleChange("Address", e.target.value)}
                  fullWidth
                />
                <TextField
                  variant="outlined"
                  label="Contact"
                  value={editedPerson?.Contact || ""}
                  onChange={(e) => handleChange("Contact", e.target.value)}
                  fullWidth
                />
                {extraFields.map((key) => (
                  <MDBox key={key} display="flex" gap={2}>
                    <TextField
                      variant="outlined"
                      label={key}
                      value={
                        typeof editedPerson?.[key] === "object"
                          ? JSON.stringify(editedPerson[key])
                          : editedPerson?.[key] || ""
                      }
                      onChange={(e) => handleChange(key, e.target.value)}
                      fullWidth
                    />
                    <MDButton
                      variant="outlined"
                      color="error"
                      onClick={() => removeExistingField(key)}
                    >
                      Remove
                    </MDButton>
                  </MDBox>
                ))}
                {customFields.map((field, index) => {
                  const isRelationship =
                    (field.key || "").toLowerCase() === "relationship";
                  return (
                    <MDBox key={index} display="flex" gap={2}>
                      {/* FIELD NAME */}
                      <Autocomplete
                        freeSolo
                        options={FIELD_NAME_SUGGESTIONS}
                        value={field.key || ""}
                        onChange={(event, newValue) =>
                          updateCustomField(index, "key", newValue || "")
                        }
                        onInputChange={(event, newInputValue) =>
                          updateCustomField(index, "key", newInputValue)
                        }
                        sx={{
                          flex: isRelationship ? 2 : 1,
                          "& .MuiOutlinedInput-root": { height: 56 },
                          "& .MuiOutlinedInput-input": {
                            paddingTop: "16.5px",
                            paddingBottom: "16.5px",
                          },
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label="Field Name"
                          />
                        )}
                        renderOption={(props, option) => {
                          const [start, match, end] = splitMatch(
                            option,
                            field.key || ""
                          );
                          return (
                            <li {...props}>
                              {match ? (
                                <>
                                  {start}
                                  <Highlight>{match}</Highlight>
                                  {end}
                                </>
                              ) : (
                                option
                              )}
                            </li>
                          );
                        }}
                      />
                      {/* PERSON / VALUE */}
                      {isRelationship ? (
                        <Autocomplete
                          freeSolo
                          options={personNameOptions}
                          value={field.value || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(index, "value", newValue || "")
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(index, "value", newInputValue)
                          }
                          sx={{
                            flex: 3,
                            "& .MuiOutlinedInput-root": { height: 56 },
                            "& .MuiOutlinedInput-input": {
                              paddingTop: "16.5px",
                              paddingBottom: "16.5px",
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Person"
                            />
                          )}
                          renderOption={(props, option) => {
                            const [start, match, end] = splitMatch(
                              option,
                              field.value || ""
                            );
                            return (
                              <li {...props}>
                                {match ? (
                                  <>
                                    {start}
                                    <Highlight>{match}</Highlight>
                                    {end}
                                  </>
                                ) : (
                                  option
                                )}
                              </li>
                            );
                          }}
                        />
                      ) : (
                        <TextField
                          variant="outlined"
                          label="Value"
                          value={field.value}
                          onChange={(e) =>
                            updateCustomField(index, "value", e.target.value)
                          }
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": { height: 56 },
                          }}
                        />
                      )}
                      {/* RELATION (only for Relationship) */}
                      {isRelationship && (
                        <Autocomplete
                          freeSolo
                          options={RELATION_SUGGESTIONS}
                          value={field.value2 || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(index, "value2", newValue || "")
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(index, "value2", newInputValue)
                          }
                          sx={{
                            flex: 3,
                            "& .MuiOutlinedInput-root": { height: 56 },
                            "& .MuiOutlinedInput-input": {
                              paddingTop: "16.5px",
                              paddingBottom: "16.5px",
                            },
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Relation"
                            />
                          )}
                          renderOption={(props, option) => {
                            const [start, match, end] = splitMatch(
                              option,
                              field.value2 || ""
                            );
                            return (
                              <li {...props}>
                                {match ? (
                                  <>
                                    {start}
                                    <Highlight>{match}</Highlight>
                                    {end}
                                  </>
                                ) : (
                                  option
                                )}
                              </li>
                            );
                          }}
                        />
                      )}
                      <MDButton
                        variant="outlined"
                        color="error"
                        onClick={() => removeCustomField(index)}
                      >
                        Remove
                      </MDButton>
                    </MDBox>
                  );
                })}
                <MDButton
                  variant="outlined"
                  color="info"
                  onClick={addCustomField}
                >
                  Add Custom Field
                </MDButton>
              </MDBox>
            ) : (
              <>
                <MDTypography variant="body2">
                  District: {person?.District}
                </MDTypography>
                <MDTypography variant="body2">
                  Address: {person?.Address}
                </MDTypography>
                <MDTypography variant="body2">
                  Contact: {person?.Contact}
                </MDTypography>
                {extraFields.map((key) => (
                  <MDTypography key={key} variant="body2">
                    {key}:{" "}
                    {typeof person[key] === "object"
                      ? JSON.stringify(person[key])
                      : person[key]}
                  </MDTypography>
                ))}
              </>
            )}
          </MDBox>
        </Card>
      </MDBox>
      <Dialog open={showNotFoundModal} onClose={handleCloseModal}>
        <DialogTitle>Person Not Found</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            The person you are looking for does not exist.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={handleCloseModal} color="info">
            OK
          </MDButton>
        </DialogActions>
      </Dialog>
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Delete Person</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">Delete this person?</MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setShowDeleteModal(false)} color="secondary">
            Cancel
          </MDButton>
          <MDButton onClick={handleDelete} color="error">
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
export default PersonDetail;
