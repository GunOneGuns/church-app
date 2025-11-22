import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react"; // Added useCallback
import Card from "@mui/material/Card";
// REMOVED: TextField, MenuItem, Autocomplete, Grid, AddIcon, UploadFileIcon, CircularProgress
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import defaultProfilePic from "assets/images/default-profile-picture.png";
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
  uploadProfilePicture,
} from "services/convo-broker.js";

// Import your new sub-components
import PersonEditForm from "../../components/PersonDetail/PersonEditForm"; // Adjust path as needed
import PersonDisplay from "../../components/PersonDetail/PersonDisplay"; // Adjust path as needed

// REMOVED: Highlight, splitMatch (now imported in PersonEditForm)

// Define known fields that should NOT be treated as generic custom fields
const knownFields = [
  "_id",
  "id",
  "Name",
  "NameChi",
  "District",
  "Address",
  "Contact",
  "ProfilePic",
];

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";

  // Core State for the Person Detail View
  const [person, setPerson] = useState(null); // The original person data (for view mode/discard)
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { ProfilePic: "" } : null
  );
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [peopleList, setPeopleList] = useState([]); // List of all people for relationship suggestions

  // Profile Picture Upload States (kept here as they are part of the save/discard flow)
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Utility function for determining relationship field data structure
  const isRelationshipFieldData = useCallback((fieldData) => {
    return (
      fieldData &&
      typeof fieldData === "object" &&
      "person" in fieldData &&
      "relation" in fieldData
    );
  }, []);

  // Function to initialize custom fields from person data
  const initializeCustomFields = useCallback(
    (personData) => {
      const initialCustomFields = [];
      Object.keys(personData || {}).forEach((key) => {
        if (!knownFields.includes(key)) {
          if (isRelationshipFieldData(personData[key])) {
            initialCustomFields.push({
              key: key,
              value: personData[key].person || "",
              value2: personData[key].relation || "",
            });
          } else {
            initialCustomFields.push({
              key: key,
              value: personData[key] || "",
            });
          }
        }
      });
      return initialCustomFields;
    },
    [knownFields, isRelationshipFieldData]
  ); // Dependencies for useCallback

  // Effect to load person data on component mount or ID change
  useEffect(() => {
    if (!isAddMode) {
      const stored = localStorage.getItem("people");
      if (stored) {
        const people = JSON.parse(stored);
        const found = people.find((p) => p._id === id);
        if (found) {
          setPerson(found);
          setEditedPerson(found);
          setCustomFields(initializeCustomFields(found));
        } else {
          setShowNotFoundModal(true);
        }
      }
    } else {
      setEditedPerson({
        ProfilePic: "",
        Name: "",
        NameChi: "",
        District: "",
        Address: "",
        Contact: "",
      });
      setCustomFields([]);
    }
  }, [id, isAddMode, initializeCustomFields]);

  // Effect to load people list for relationship suggestions
  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      setPeopleList(people);
    }
  }, []);

  // Handlers for main actions (Edit, Save, Discard, Delete)
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const dataToSave = { ...editedPerson };
      // Clear existing dynamic fields from dataToSave before re-applying
      const existingDynamicKeys = Object.keys(person || {}).filter(
        (key) => !knownFields.includes(key)
      );
      existingDynamicKeys.forEach((key) => delete dataToSave[key]);

      // Apply custom fields from the current state
      customFields.forEach((field, index) => {
        let actualKey = field.key;
        if (actualKey === "ProfilePic") {
          console.warn(
            "Attempted to save a custom field named 'ProfilePic'. Ignoring as this is a reserved field."
          );
          return;
        }
        if (!actualKey) {
          actualKey = `CustomField_${index}`;
        }
        if ("value2" in field) {
          dataToSave[actualKey] = {
            person: field.value || "",
            relation: field.value2 || "",
          };
        } else {
          dataToSave[actualKey] = field.value;
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
          setCustomFields(initializeCustomFields(found));
        }
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }, [
    editedPerson,
    customFields,
    isAddMode,
    id,
    person,
    knownFields,
    navigate,
    initializeCustomFields,
  ]); // Dependencies for useCallback

  const handleDiscard = useCallback(() => {
    if (isAddMode) {
      navigate("/tables");
    } else {
      setEditedPerson(person); // Revert to original person data
      setCustomFields(initializeCustomFields(person)); // Revert custom fields
      setIsEditing(false);
      setSelectedFile(null); // Clear selected file
      setUploadError(null); // Clear upload error
    }
  }, [isAddMode, navigate, person, initializeCustomFields]);

  const handleDelete = useCallback(async () => {
    try {
      await deletePerson(id);
      localStorage.removeItem("people");
      await fetchPeople();
      navigate("/tables");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    setShowDeleteModal(false);
  }, [id, navigate]);

  // Handlers for editing person details (passed to PersonEditForm)
  const handleChange = useCallback((field, value) => {
    setEditedPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const addRelationshipField = useCallback(() => {
    const newRelationshipKey = `Relationship_${Date.now()}_${
      customFields.length
    }`;
    setCustomFields((prev) => [
      ...prev,
      { key: newRelationshipKey, value: "", value2: "" },
    ]);
  }, [customFields.length]); // Dependency on customFields.length to ensure unique key

  const updateCustomField = useCallback((index, field, value) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value }; // Ensure immutability
      return updated;
    });
  }, []);

  const removeCustomField = useCallback((index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handlers for profile picture upload (passed to PersonEditForm)
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  }, []);

  const handleProfilePicUpload = useCallback(async () => {
    if (!selectedFile) {
      setUploadError("Please select an image file first.");
      return;
    }
    if (isAddMode) {
      setUploadError(
        "Please create the person first before uploading an image."
      );
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const response = await uploadProfilePicture(id, selectedFile);
      setEditedPerson((prev) => ({
        ...prev,
        ProfilePic: response.profilePicUrl,
      }));
      setSelectedFile(null);
      localStorage.removeItem("people");
      await fetchPeople();
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setUploadError(
        error.response?.data?.message ||
          "Failed to upload image. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, isAddMode, id]);

  // Modal Handlers
  const handleCloseModal = useCallback(() => {
    setShowNotFoundModal(false);
    navigate("/tables");
  }, [navigate]);

  if (!isAddMode && !person && !showNotFoundModal) return <div>Loading...</div>;

  // Filter customFields based on the presence of 'value2' (relationship)
  // and ensure 'ProfilePic' is not rendered as a generic custom field
  const personalInfoCustomFieldsForRender = customFields.filter(
    (field) => !("value2" in field) && field.key !== "ProfilePic"
  );
  const relationshipCustomFieldsForRender = customFields.filter(
    (field) => "value2" in field
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header and Action Buttons (remain in parent as they control edit state) */}
          <MDBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={3}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <MDTypography variant="h4">
              {isAddMode
                ? "Add Person"
                : isEditing
                ? "Edit Person"
                : "Person Details"}{" "}
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

          {/* Main content area: Conditionally render EditForm or Display */}
          <MDBox p={3}>
            {isEditing || isAddMode ? (
              <PersonEditForm
                editedPerson={editedPerson}
                personalInfoCustomFieldsForRender={
                  personalInfoCustomFieldsForRender
                }
                relationshipCustomFieldsForRender={
                  relationshipCustomFieldsForRender
                }
                peopleList={peopleList}
                defaultProfilePic={defaultProfilePic}
                isAddMode={isAddMode}
                // Pass all relevant handlers and states
                handleChange={handleChange}
                addCustomField={addCustomField}
                addRelationshipField={addRelationshipField}
                updateCustomField={updateCustomField}
                removeCustomField={removeCustomField}
                handleFileChange={handleFileChange}
                handleProfilePicUpload={handleProfilePicUpload}
                selectedFile={selectedFile}
                isUploading={isUploading}
                uploadError={uploadError}
              />
            ) : (
              <PersonDisplay
                person={person}
                personalInfoCustomFieldsForRender={
                  personalInfoCustomFieldsForRender
                }
                relationshipCustomFieldsForRender={
                  relationshipCustomFieldsForRender
                }
                peopleList={peopleList}
                defaultProfilePic={defaultProfilePic}
              />
            )}
          </MDBox>
        </Card>
      </MDBox>

      {/* Dialogs (remain in parent as they are general UI for the page) */}
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
