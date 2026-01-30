import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Slider from "@mui/material/Slider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FIELD_NAME_SUGGESTIONS,
  RELATION_SUGGESTIONS,
  RELATION_AUTO_RECIPROCALS,
  RELATION_RECIPROCAL_SUGGESTIONS,
} from "../../constants";
import { Highlight, splitMatch } from "../../utils/stringUtils";

const YES_NO_OPTIONS = ["Y", "N"];
const normalizeSelectValue = (value) =>
  value === null || value === undefined ? "" : String(value);

const FIELD_LABEL_SX = { fontSize: "1rem" };

const GROUP_TITLE_CHAR_LIMIT = 7;
const CREATE_GROUP_OPTION_ID = "__create_group__";
const CREATE_GROUP_OPTION = {
  _id: CREATE_GROUP_OPTION_ID,
  Name: "No groups — create one now",
};

function truncateText(value, limit = GROUP_TITLE_CHAR_LIMIT) {
  const text = String(value ?? "");
  if (text.length <= limit) return text;
  if (limit <= 1) return "…";
  return `${text.slice(0, limit - 1)}…`;
}

function PersonEditForm({
  editedPerson,
  personalInfoCustomFieldsForRender,
  relationshipCustomFieldsForRender,
  relationshipFieldErrors = {},
  peopleList, // Used for personNameOptions
  groupsList = [],
  selectedGroupIds = [],
  setSelectedGroupIds,
  defaultProfilePic,
  // Handlers passed from parent
  handleChange,
  addPersonalCustomField,
  addRelationshipField,
  updatePersonalCustomField,
  removePersonalCustomField,
  updateRelationshipField,
  removeRelationshipField,
  handleFileChange,
  registerProfilePicProcessor,
  // Upload states passed from parent
  selectedFile,
  uploadError,
}) {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));
  const navigate = useNavigate();
  const location = useLocation();

  const findPersonById = (id) =>
    peopleList.find((person) => person._id === id) || null;

  const normalizeRelation = (relation = "") => relation.trim().toLowerCase();
  const getAutoReciprocalValue = (relation = "") =>
    RELATION_AUTO_RECIPROCALS[normalizeRelation(relation)] || "";
  const getReciprocalOptions = (relation = "") =>
    RELATION_RECIPROCAL_SUGGESTIONS[normalizeRelation(relation)] ||
    RELATION_SUGGESTIONS;

  const announcementGroupValue = useMemo(
    () => normalizeSelectValue(editedPerson?.AnnouncementGroup),
    [editedPerson?.AnnouncementGroup],
  );

  const chatGroupValue = useMemo(
    () => normalizeSelectValue(editedPerson?.ChatGroup),
    [editedPerson?.ChatGroup],
  );

  const selectedGroups = useMemo(() => {
    const idSet = new Set((selectedGroupIds || []).map(String));
    return (groupsList || []).filter((g) => idSet.has(String(g?._id)));
  }, [groupsList, selectedGroupIds]);

  const groupOptions = useMemo(() => {
    if (Array.isArray(groupsList) && groupsList.length) return groupsList;
    return [CREATE_GROUP_OPTION];
  }, [groupsList]);

  const isValidRelationSuggestion = (relation = "") => {
    const trimmed = relation.trim();
    if (!trimmed) return false;
    return RELATION_SUGGESTIONS.some(
      (suggestion) => suggestion.toLowerCase() === trimmed.toLowerCase(),
    );
  };

  const getRelationCategory = (relation = "") => {
    const normalized = normalizeRelation(relation);
    const categoryMap = {
      son: "child",
      daughter: "child",
      child: "child",
      father: "parent",
      mother: "parent",
      parent: "parent",
      husband: "spouse",
      wife: "spouse",
      spouse: "spouse",
      brother: "sibling",
      sister: "sibling",
      sibling: "sibling",
    };
    return categoryMap[normalized] || null;
  };

  const getExistingReciprocalForRelation = (
    theirRelation = "",
    currentIndex = -1,
  ) => {
    const category = getRelationCategory(theirRelation);
    if (!category) return "";
    const existing = relationshipCustomFieldsForRender.find(
      (f, idx) =>
        idx !== currentIndex &&
        getRelationCategory(f.value2) === category &&
        f.value3,
    );
    return existing?.value3 || "";
  };

  const syncReciprocalAcrossCategory = (changedIndex, newReciprocal) => {
    const changedField = relationshipCustomFieldsForRender[changedIndex];
    if (!changedField) return;
    const category = getRelationCategory(changedField.value2);
    if (!category) return;
    relationshipCustomFieldsForRender.forEach((field, idx) => {
      if (
        idx !== changedIndex &&
        getRelationCategory(field.value2) === category
      ) {
        updateRelationshipField(field.originalIndex, "value3", newReciprocal);
      }
    });
  };

  const DRAG_CONTAINER_SIZE = 180;
  const PREVIEW_BOX_SIZE = 260;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [baseImageDimensions, setBaseImageDimensions] = useState({
    width: DRAG_CONTAINER_SIZE,
    height: DRAG_CONTAINER_SIZE,
  });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const displayImageSrc = useMemo(() => {
    if (selectedFile && previewUrl) return previewUrl;
    return editedPerson?.ProfilePic || defaultProfilePic;
  }, [selectedFile, previewUrl, editedPerson?.ProfilePic, defaultProfilePic]);

  const imageDimensions = useMemo(
    () => ({
      width: baseImageDimensions.width * zoom,
      height: baseImageDimensions.height * zoom,
    }),
    [baseImageDimensions, zoom],
  );

  const clampOffset = useCallback((value, dimension) => {
    const maxOffset = Math.max(0, (dimension - DRAG_CONTAINER_SIZE) / 2);
    if (dimension <= DRAG_CONTAINER_SIZE) return 0;
    return Math.min(Math.max(value, -maxOffset), maxOffset);
  }, []);

  const clampZoomValue = useCallback((value) => {
    if (value < MIN_ZOOM) return MIN_ZOOM;
    if (value > MAX_ZOOM) return MAX_ZOOM;
    return value;
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setImageOffset({ x: 0, y: 0 });
      setZoom(1);
      setIsCropperOpen(false);
      return undefined;
    }
    const fileUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(fileUrl);
    setImageOffset({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(fileUrl);
  }, [selectedFile]);

  useEffect(() => {
    setImageOffset((prev) => {
      const nextX = clampOffset(prev.x, imageDimensions.width);
      const nextY = clampOffset(prev.y, imageDimensions.height);
      if (nextX === prev.x && nextY === prev.y) {
        return prev;
      }
      return { x: nextX, y: nextY };
    });
  }, [imageDimensions.width, imageDimensions.height, clampOffset]);

  const handlePreviewImageLoad = useCallback(
    (event) => {
      if (!selectedFile) return;
      const { naturalWidth, naturalHeight } = event.target;
      if (!naturalWidth || !naturalHeight) return;
      const scale = Math.max(
        DRAG_CONTAINER_SIZE / naturalWidth,
        DRAG_CONTAINER_SIZE / naturalHeight,
      );
      setBaseImageDimensions({
        width: naturalWidth * scale,
        height: naturalHeight * scale,
      });
      setImageOffset({ x: 0, y: 0 });
      setZoom(1);
    },
    [selectedFile],
  );

  const getPointerPosition = (event) => {
    if ("touches" in event) {
      const touch = event.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: event.clientX, y: event.clientY };
  };

  const handleDragStart = (event) => {
    if (!selectedFile) return;
    event.preventDefault();
    const { x, y } = getPointerPosition(event);
    dragStateRef.current = {
      startX: x,
      startY: y,
      originX: imageOffset.x,
      originY: imageOffset.y,
    };
    setIsDragging(true);
  };

  const handleDragMove = (event) => {
    if (!isDragging || !selectedFile) return;
    event.preventDefault();
    const { x, y } = getPointerPosition(event);
    const deltaX = x - dragStateRef.current.startX;
    const deltaY = y - dragStateRef.current.startY;
    setImageOffset({
      x: clampOffset(
        dragStateRef.current.originX + deltaX,
        imageDimensions.width,
      ),
      y: clampOffset(
        dragStateRef.current.originY + deltaY,
        imageDimensions.height,
      ),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const createCroppedFile = useCallback(async () => {
    if (!selectedFile || !previewUrl) return null;
    const canvas = document.createElement("canvas");
    canvas.width = DRAG_CONTAINER_SIZE;
    canvas.height = DRAG_CONTAINER_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageElement = new Image();
    const loadPromise = new Promise((resolve, reject) => {
      imageElement.onload = () => resolve();
      imageElement.onerror = reject;
    });
    imageElement.src = previewUrl;

    try {
      await loadPromise;
    } catch (error) {
      console.error("Preview image failed to load", error);
      return null;
    }

    const drawX =
      (DRAG_CONTAINER_SIZE - imageDimensions.width) / 2 + imageOffset.x;
    const drawY =
      (DRAG_CONTAINER_SIZE - imageDimensions.height) / 2 + imageOffset.y;

    ctx.drawImage(
      imageElement,
      drawX,
      drawY,
      imageDimensions.width,
      imageDimensions.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const file = new File([blob], selectedFile.name, {
            type: selectedFile.type || blob.type || "image/png",
          });
          resolve(file);
        },
        selectedFile.type || "image/png",
        0.95,
      );
    });
  }, [
    selectedFile,
    previewUrl,
    imageDimensions.width,
    imageDimensions.height,
    imageOffset.x,
    imageOffset.y,
  ]);

  useEffect(() => {
    if (!registerProfilePicProcessor) return undefined;

    if (!selectedFile) {
      registerProfilePicProcessor(null);
      return undefined;
    }

    const processor = async () => {
      const croppedFile = await createCroppedFile();
      return croppedFile || selectedFile;
    };

    registerProfilePicProcessor(processor);

    return () => {
      registerProfilePicProcessor(null);
    };
  }, [registerProfilePicProcessor, selectedFile, createCroppedFile]);

  const handleZoomChange = (_, value) => {
    const numericValue = Array.isArray(value) ? value[0] : value;
    setZoom((prev) =>
      clampZoomValue(typeof numericValue === "number" ? numericValue : prev),
    );
  };

  const applyZoomDelta = useCallback(
    (delta) => {
      setZoom((prev) => clampZoomValue(prev + delta));
    },
    [clampZoomValue],
  );

  const handleFileInputChange = (event) => {
    if (handleFileChange) {
      handleFileChange(event);
    }
    if (event.target.files && event.target.files[0]) {
      setIsCropperOpen(true);
    }
  };

  const openCropper = () => {
    if (selectedFile) {
      setIsCropperOpen(true);
    }
  };

  const handleCropperClose = () => {
    setIsCropperOpen(false);
  };

  const handleWheelZoom = (event) => {
    if (!selectedFile) return;
    event.preventDefault();
    const delta = -event.deltaY * 0.0015;
    if (delta === 0) return;
    applyZoomDelta(delta);
  };

  const handleTouchStart = (event) => {
    if (event.touches.length === 1) {
      handleDragStart(event);
    }
  };

  const handleTouchMove = (event) => {
    if (event.touches.length === 1) {
      handleDragMove(event);
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  return (
    <>
      <Grid container spacing={3}>
        {/* Left Column: Profile Picture and Upload Controls */}
        <Grid item xs={12} md={4} lg={3}>
          <MDBox
            display="flex"
            flexDirection="column"
            alignItems="center"
            height="100%"
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.03)",
              borderRadius: 1,
              p: 2,
              border: "1px dashed #ccc",
            }}
          >
            {/* Profile Picture Display */}
            <MDBox
              width={`${DRAG_CONTAINER_SIZE}px`}
              height={`${DRAG_CONTAINER_SIZE}px`}
              borderRadius="50%"
              overflow="hidden"
              position="relative"
              border="2px solid #ddd"
              sx={{
                backgroundColor: "rgba(0, 0, 0, 0.05)",
                userSelect: "none",
              }}
            >
              <MDBox
                component="img"
                src={displayImageSrc}
                alt={`${editedPerson?.Name || "User"}'s profile`}
                draggable={false}
                onLoad={handlePreviewImageLoad}
                sx={{
                  width: selectedFile ? `${imageDimensions.width}px` : "100%",
                  height: selectedFile ? `${imageDimensions.height}px` : "100%",
                  objectFit: selectedFile ? "fill" : "cover",
                  position: selectedFile ? "absolute" : "static",
                  left: selectedFile
                    ? `${
                        (DRAG_CONTAINER_SIZE - imageDimensions.width) / 2 +
                        imageOffset.x
                      }px`
                    : "0px",
                  top: selectedFile
                    ? `${
                        (DRAG_CONTAINER_SIZE - imageDimensions.height) / 2 +
                        imageOffset.y
                      }px`
                    : "0px",
                  pointerEvents: "none",
                  transition: "left 0.1s ease-out, top 0.1s ease-out",
                }}
              />
            </MDBox>

            {selectedFile && (
              <MDButton
                variant="text"
                color="info"
                onClick={openCropper}
                sx={{ mt: 1 }}
              >
                Adjust Photo
              </MDButton>
            )}

            {/* Profile Picture Upload Controls */}
            <MDBox
              mt={2}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={1}
              width="100%"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                style={{ display: "none" }}
                id="profile-pic-upload-input"
              />
              <label
                htmlFor="profile-pic-upload-input"
                style={{ width: "100%" }}
              >
                <MDButton
                  variant="outlined"
                  color="info"
                  component="span"
                  fullWidth
                  startIcon={<UploadFileIcon />}
                >
                  {selectedFile ? selectedFile.name : "Choose Profile Picture"}
                </MDButton>
              </label>
              {uploadError && (
                <MDTypography variant="caption" color="error" mt={1}>
                  {uploadError}
                </MDTypography>
              )}
            </MDBox>
          </MDBox>
        </Grid>

        {/* Right Column: Editable Personal Info & Related Persons Panels */}
        <Grid item xs={12} md={8} lg={9}>
          {/* Panel 1: Personal Information */}
          <Card sx={{ mb: 3, p: 2 }}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>
              Personal Information
            </MDTypography>

            <MDBox display="flex" flexDirection="column" gap={2}>
              {/* Core personal info fields (schema default fields) */}
              <TextField
                variant="outlined"
                label="Name *"
                value={editedPerson?.Name ?? ""}
                onChange={(e) => handleChange("Name", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label="Chinese Name *"
                value={editedPerson?.NameChi ?? ""}
                onChange={(e) => handleChange("NameChi", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label="Birth Year"
                type="number"
                value={editedPerson?.BirthYear ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  handleChange("BirthYear", raw === "" ? "" : Number(raw));
                }}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label="Phone Number"
                type="number"
                value={editedPerson?.PhoneNumber ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  // keep empty in UI; store undefined if cleared
                  handleChange(
                    "PhoneNumber",
                    raw === "" ? undefined : Number(raw),
                  );
                }}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label="Email"
                value={editedPerson?.Email ?? ""}
                onChange={(e) => handleChange("Email", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label="District"
                value={editedPerson?.District ?? ""}
                onChange={(e) => handleChange("District", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{
                  "& .MuiOutlinedInput-root": { height: "56px" },
                }}
              />

              <TextField
                variant="outlined"
                label="Address"
                value={editedPerson?.Address ?? ""}
                onChange={(e) => handleChange("Address", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                select
                label="Announcement Group"
                value={announcementGroupValue}
                onChange={(e) =>
                  handleChange("AnnouncementGroup", e.target.value)
                }
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              >
                {!YES_NO_OPTIONS.includes(announcementGroupValue) &&
                  announcementGroupValue !== "" && (
                    <MenuItem value={announcementGroupValue}>
                      Other ({announcementGroupValue})
                    </MenuItem>
                  )}
                {YES_NO_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                variant="outlined"
                select
                label="Chat Group"
                value={chatGroupValue}
                onChange={(e) => handleChange("ChatGroup", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              >
                {!YES_NO_OPTIONS.includes(chatGroupValue) &&
                  chatGroupValue !== "" && (
                    <MenuItem value={chatGroupValue}>
                      Other ({chatGroupValue})
                    </MenuItem>
                  )}
                {YES_NO_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>

              {/* Generic custom fields */}
              {personalInfoCustomFieldsForRender.map((field, index) => {
                const fieldIndex =
                  typeof field.originalIndex === "number"
                    ? field.originalIndex
                    : index;
                const fieldName = String(field.key || "").trim();
                const cardTitle = fieldName || "Custom";
                const hasFieldName = Boolean(fieldName);

                return (
                  <Card
                    key={`pcf-${fieldIndex}`}
                    variant="outlined"
                    sx={{
                      position: "relative",
                      p: 2,
                      pt: 3,
                      borderRadius: 2,
                      borderColor: "divider",
                      overflow: "visible",
                    }}
                  >
                    <MDBox
                      sx={{
                        position: "absolute",
                        top: -10,
                        left: 14,
                        px: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <MDTypography variant="caption" fontWeight="medium">
                        {cardTitle}
                      </MDTypography>
                    </MDBox>

                    <IconButton
                      size="small"
                      aria-label="Remove custom field"
                      onClick={() => removePersonalCustomField(fieldIndex)}
                      sx={{
                        position: "absolute",
                        top: -14,
                        right: -14,
                        color: "text.secondary",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          bgcolor: "background.paper",
                        },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>

                    <MDBox
                      display="flex"
                      flexDirection={isMobileView ? "column" : "row"}
                      gap={2}
                      sx={{ pt: 0.5 }}
                    >
                      <Autocomplete
                        freeSolo
                        options={FIELD_NAME_SUGGESTIONS}
                        value={field.key || ""}
                        onChange={(event, newValue) =>
                          updatePersonalCustomField(
                            fieldIndex,
                            "key",
                            newValue || "",
                          )
                        }
                        onInputChange={(event, newInputValue) =>
                          updatePersonalCustomField(
                            fieldIndex,
                            "key",
                            newInputValue,
                          )
                        }
                        sx={{
                          flex: isMobileView ? "unset" : "1 1 0",
                          minWidth: 0,
                          width: "100%",
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            label="Field Name"
                            sx={{
                              "& .MuiOutlinedInput-root": { height: "56px" },
                            }}
                          />
                        )}
                        renderOption={(props, option) => {
                          const [start, match, end] = splitMatch(
                            option,
                            field.key || "",
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

                      <TextField
                        variant="outlined"
                        label="Value"
                        value={field.value}
                        disabled={!hasFieldName}
                        onChange={(e) =>
                          updatePersonalCustomField(
                            fieldIndex,
                            "value",
                            e.target.value,
                          )
                        }
                        sx={{
                          flex: isMobileView ? "unset" : "1 1 0",
                          minWidth: 0,
                          width: "100%",
                          "& .MuiOutlinedInput-root": { height: "56px" },
                        }}
                      />
                    </MDBox>
                  </Card>
                );
              })}

              <MDButton
                variant="outlined"
                color="info"
                onClick={addPersonalCustomField}
                sx={{ mt: 1, height: "56px" }}
                startIcon={<AddIcon />}
              >
                Add Custom Field
              </MDButton>
            </MDBox>
          </Card>

          {/* Panel 2: Related Persons */}
          <Card sx={{ p: 2 }}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>
              Related Persons
            </MDTypography>

            <MDBox display="flex" flexDirection="column" gap={2}>
              {relationshipCustomFieldsForRender.map((field, index) => {
                const fieldIndex =
                  typeof field.originalIndex === "number"
                    ? field.originalIndex
                    : index;

                const selectedPerson = field.personId
                  ? findPersonById(field.personId)
                  : null;

                const fieldError = relationshipFieldErrors[fieldIndex] || {};
                const relationInput = field.value2 || "";
                const relationHasValue = Boolean(relationInput.trim());
                const relationIsValid =
                  isValidRelationSuggestion(relationInput);
                const autoReciprocalValue = relationIsValid
                  ? getAutoReciprocalValue(relationInput)
                  : "";
                const reciprocalOptions = relationIsValid
                  ? getReciprocalOptions(relationInput)
                  : [];
                const showReciprocalField = relationIsValid;

                const personErrorMessage = fieldError.person || "";
                const relationErrorMessage =
                  fieldError.relationType ||
                  (relationHasValue && !relationIsValid
                    ? "Please select a relation from the list."
                    : "");
                const reciprocalErrorMessage = fieldError.reciprocal || "";

                const alreadyAddedIds = relationshipCustomFieldsForRender
                  .filter((f, idx) => idx !== index && f.personId)
                  .map((f) => f.personId);

                const availablePeople = peopleList.filter(
                  (p) => !alreadyAddedIds.includes(p._id),
                );

                return (
                  <Card
                    key={`rcf-${fieldIndex}`}
                    variant="outlined"
                    sx={{
                      position: "relative",
                      p: 2,
                      pt: 3,
                      borderRadius: 2,
                      borderColor: "divider",
                      overflow: "visible",
                    }}
                  >
                    <MDBox
                      sx={{
                        position: "absolute",
                        top: -10,
                        left: 14,
                        px: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <MDTypography variant="caption" fontWeight="medium">
                        Relationship
                      </MDTypography>
                    </MDBox>

                    <IconButton
                      size="small"
                      aria-label="Remove relationship"
                      onClick={() => removeRelationshipField(fieldIndex)}
                      sx={{
                        position: "absolute",
                        top: -14,
                        right: -14,
                        color: "text.secondary",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          bgcolor: "background.paper",
                        },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>

                    <MDBox
                      display="flex"
                      flexDirection={isMobileView ? "column" : "row"}
                      gap={2}
                      sx={{ pt: 0.5 }}
                    >
                      <MDBox
                        display="flex"
                        flexDirection="column"
                        gap={0.5}
                        sx={{
                          flex: isMobileView ? "unset" : "1 1 0",
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        {personErrorMessage && (
                          <MDTypography variant="caption" color="error">
                            {personErrorMessage}
                          </MDTypography>
                        )}

                        <Autocomplete
                          freeSolo
                          options={availablePeople}
                          getOptionLabel={(option) =>
                            option?.Name || option?.value || ""
                          }
                          value={selectedPerson}
                          inputValue={field.value || ""}
                          isOptionEqualToValue={(option, value) =>
                            option?._id && value?._id
                              ? option._id === value._id
                              : option?.Name === value?.Name
                          }
                          filterOptions={(options, { inputValue }) => {
                            if (!inputValue) return options;
                            const input = inputValue.toLowerCase();
                            return options.filter((option) => {
                              const name = (option?.Name || "").toLowerCase();
                              if (name.includes(input)) return true;
                              // Fuzzy match: check if all input chars appear in order
                              let nameIdx = 0;
                              for (let i = 0; i < input.length; i++) {
                                nameIdx = name.indexOf(input[i], nameIdx);
                                if (nameIdx === -1) return false;
                                nameIdx++;
                              }
                              return true;
                            });
                          }}
                          onChange={(_, newValue) => {
                            if (typeof newValue === "string") {
                              updateRelationshipField(
                                fieldIndex,
                                "value",
                                newValue,
                              );
                              updateRelationshipField(
                                fieldIndex,
                                "personId",
                                "",
                              );
                            } else if (
                              newValue &&
                              typeof newValue === "object"
                            ) {
                              updateRelationshipField(
                                fieldIndex,
                                "value",
                                newValue.Name || "",
                              );
                              updateRelationshipField(
                                fieldIndex,
                                "personId",
                                newValue._id || "",
                              );
                            } else {
                              updateRelationshipField(fieldIndex, "value", "");
                              updateRelationshipField(
                                fieldIndex,
                                "personId",
                                "",
                              );
                            }
                          }}
                          onInputChange={(_, newInputValue, reason) => {
                            if (reason === "input") {
                              updateRelationshipField(
                                fieldIndex,
                                "value",
                                newInputValue,
                              );
                              updateRelationshipField(
                                fieldIndex,
                                "personId",
                                "",
                              );
                            }
                          }}
                          renderOption={(
                            props,
                            option,
                            { index: optionIndex },
                          ) => (
                            <li
                              {...props}
                              key={`${
                                option?._id || option?.Name || "option"
                              }-${optionIndex}`}
                            >
                              {option?.Name || ""}
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Person's Name"
                              error={Boolean(personErrorMessage)}
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                        />
                      </MDBox>

                      <MDBox
                        display="flex"
                        flexDirection="column"
                        gap={0.5}
                        sx={{
                          flex: isMobileView ? "unset" : "1 1 0",
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        {relationErrorMessage && (
                          <MDTypography variant="caption" color="error">
                            {relationErrorMessage}
                          </MDTypography>
                        )}

                        <Autocomplete
                          freeSolo
                          options={RELATION_SUGGESTIONS}
                          value={field.value2 || ""}
                          filterOptions={(options, { inputValue }) => {
                            if (!inputValue) return options;
                            const input = inputValue.toLowerCase();
                            return options.filter((option) => {
                              const rel = option.toLowerCase();
                              if (rel.includes(input)) return true;
                              let relIdx = 0;
                              for (let i = 0; i < input.length; i++) {
                                relIdx = rel.indexOf(input[i], relIdx);
                                if (relIdx === -1) return false;
                                relIdx++;
                              }
                              return true;
                            });
                          }}
                          onChange={(event, newValue) => {
                            const updatedValue = newValue || "";
                            updateRelationshipField(
                              fieldIndex,
                              "value2",
                              updatedValue,
                            );

                            if (isValidRelationSuggestion(updatedValue)) {
                              const autoValue =
                                getAutoReciprocalValue(updatedValue) ||
                                getExistingReciprocalForRelation(
                                  updatedValue,
                                  index,
                                );
                              updateRelationshipField(
                                fieldIndex,
                                "value3",
                                autoValue || "",
                              );
                            } else {
                              updateRelationshipField(fieldIndex, "value3", "");
                            }
                          }}
                          onInputChange={(event, newInputValue) => {
                            updateRelationshipField(
                              fieldIndex,
                              "value2",
                              newInputValue,
                            );

                            if (isValidRelationSuggestion(newInputValue)) {
                              const autoValue =
                                getAutoReciprocalValue(newInputValue) ||
                                getExistingReciprocalForRelation(
                                  newInputValue,
                                  index,
                                );
                              updateRelationshipField(
                                fieldIndex,
                                "value3",
                                autoValue || "",
                              );
                            } else {
                              updateRelationshipField(fieldIndex, "value3", "");
                            }
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Their Relation to Me"
                              error={Boolean(relationErrorMessage)}
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                        />
                      </MDBox>

                      {showReciprocalField &&
                        (autoReciprocalValue ? (
                          <TextField
                            variant="outlined"
                            label="My Relation to Them"
                            value={autoReciprocalValue}
                            disabled
                            sx={{
                              flex: isMobileView ? "unset" : "1 1 0",
                              width: "100%",
                              minWidth: 0,
                              "& .MuiOutlinedInput-root": { height: "56px" },
                            }}
                          />
                        ) : (
                          <MDBox
                            display="flex"
                            flexDirection="column"
                            gap={0.5}
                            sx={{
                              flex: isMobileView ? "unset" : "1 1 0",
                              width: "100%",
                              minWidth: 0,
                            }}
                          >
                            {reciprocalErrorMessage && (
                              <MDTypography variant="caption" color="error">
                                {reciprocalErrorMessage}
                              </MDTypography>
                            )}

                            <Autocomplete
                              freeSolo
                              options={reciprocalOptions}
                              value={field.value3 || ""}
                              filterOptions={(options, { inputValue }) => {
                                if (!inputValue) return options;
                                const input = inputValue.toLowerCase();
                                return options.filter((option) => {
                                  const rel = option.toLowerCase();
                                  if (rel.includes(input)) return true;
                                  let relIdx = 0;
                                  for (let i = 0; i < input.length; i++) {
                                    relIdx = rel.indexOf(input[i], relIdx);
                                    if (relIdx === -1) return false;
                                    relIdx++;
                                  }
                                  return true;
                                });
                              }}
                              onChange={(event, newValue) => {
                                const newReciprocal = newValue || "";
                                updateRelationshipField(
                                  fieldIndex,
                                  "value3",
                                  newReciprocal,
                                );
                                syncReciprocalAcrossCategory(
                                  index,
                                  newReciprocal,
                                );
                              }}
                              onInputChange={(event, newInputValue) => {
                                updateRelationshipField(
                                  fieldIndex,
                                  "value3",
                                  newInputValue,
                                );
                                syncReciprocalAcrossCategory(
                                  index,
                                  newInputValue,
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  variant="outlined"
                                  label="My Relation to Them"
                                  error={Boolean(reciprocalErrorMessage)}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      height: "56px",
                                    },
                                  }}
                                />
                              )}
                            />
                          </MDBox>
                        ))}
                    </MDBox>
                  </Card>
                );
              })}

              <MDButton
                variant="outlined"
                color="info"
                onClick={addRelationshipField}
                sx={{ mt: 1, height: "56px" }}
                startIcon={<AddIcon />}
              >
                Add Relationship
              </MDButton>
            </MDBox>
          </Card>

          {/* Panel 3: Groups */}
          <Card sx={{ p: 2, mt: 3 }}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>
              Groups
            </MDTypography>

            <Autocomplete
              multiple
              options={groupOptions}
              value={selectedGroups}
              onChange={(_e, next) => {
                if (!setSelectedGroupIds) return;
                const wantsCreate = (next || []).some(
                  (g) => String(g?._id) === CREATE_GROUP_OPTION_ID,
                );
                if (wantsCreate) {
                  navigate("/group/add", {
                    state: { add: true, from: location.pathname },
                  });
                  return;
                }
                setSelectedGroupIds(next.map((g) => g?._id).filter(Boolean));
              }}
              getOptionLabel={(option) => option?.Name || ""}
              isOptionEqualToValue={(opt, val) =>
                String(opt?._id) === String(val?._id)
              }
              disableCloseOnSelect
              openOnFocus
              noOptionsText=""
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Add to groups"
                  placeholder="Search groups..."
                  sx={{ "& .MuiOutlinedInput-root": { minHeight: "56px" } }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                const groupName = option?.Name || "NIL";
                const groupPic = option?.GroupPic || defaultProfilePic;
                const isCreateOption =
                  String(option?._id) === CREATE_GROUP_OPTION_ID;

                if (isCreateOption) {
                  return (
                    <li
                      key={option?._id || key}
                      {...rest}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate("/group/add", {
                          state: { add: true, from: location.pathname },
                        });
                      }}
                      style={{
                        ...rest.style,
                        fontStyle: "italic",
                      }}
                    >
                      {groupName}
                    </li>
                  );
                }
                return (
                  <li
                    key={option?._id || key}
                    {...rest}
                    style={{
                      ...rest.style,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <MDBox
                      component="img"
                      src={groupPic}
                      alt={`${groupName}'s picture`}
                      width="28px"
                      height="28px"
                      borderRadius="50%"
                      sx={{ objectFit: "cover", flexShrink: 0 }}
                    />
                    <span>{groupName}</span>
                  </li>
                );
              }}
              renderTags={() => null}
            />

            <MDBox mt={2} display="flex" flexWrap="wrap" gap={2}>
              {selectedGroups.map((group) => {
                const groupId = group?._id;
                const groupName = group?.Name || "NIL";
                const truncatedGroupName = truncateText(groupName);
                const groupPic = group?.GroupPic || defaultProfilePic;

                return (
                  <MDBox
                    key={`group-pill-${groupId || groupName}`}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    textAlign="center"
                    width="80px"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!setSelectedGroupIds || !groupId) return;
                      setSelectedGroupIds((prev) =>
                        (prev || []).filter(
                          (gid) => String(gid) !== String(groupId),
                        ),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (!setSelectedGroupIds || !groupId) return;
                        setSelectedGroupIds((prev) =>
                          (prev || []).filter(
                            (gid) => String(gid) !== String(groupId),
                          ),
                        );
                      }
                    }}
                    sx={{ cursor: "pointer", outline: "none" }}
                    title={`${groupName} (click to remove)`}
                    aria-label={`${groupName} (click to remove)`}
                  >
                    <MDBox
                      component="img"
                      src={groupPic}
                      alt={`${groupName}'s picture`}
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
                      {truncatedGroupName}
                    </MDTypography>
                  </MDBox>
                );
              })}

              {selectedGroups.length === 0 && (
                <MDTypography variant="body2" color="text">
                  No groups selected.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(selectedFile) && isCropperOpen}
        onClose={handleCropperClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Adjust Profile Picture</DialogTitle>
        <DialogContent>
          <MDBox
            width="100%"
            display="flex"
            justifyContent="center"
            mt={1}
            mb={2}
          >
            <MDBox
              width={`${PREVIEW_BOX_SIZE}px`}
              height={`${PREVIEW_BOX_SIZE}px`}
              borderRadius="16px"
              overflow="hidden"
              position="relative"
              border="1px solid rgba(255,255,255,0.2)"
              sx={{
                cursor: selectedFile
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "default",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                userSelect: "none",
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheelZoom}
            >
              <MDBox
                component="img"
                src={displayImageSrc}
                alt={`${editedPerson?.Name || "User"}'s profile`}
                draggable={false}
                onLoad={handlePreviewImageLoad}
                sx={{
                  width: selectedFile ? `${imageDimensions.width}px` : "100%",
                  height: selectedFile ? `${imageDimensions.height}px` : "100%",
                  objectFit: selectedFile ? "fill" : "cover",
                  position: selectedFile ? "absolute" : "static",
                  left: selectedFile
                    ? `${
                        (PREVIEW_BOX_SIZE - imageDimensions.width) / 2 +
                        imageOffset.x
                      }px`
                    : "0px",
                  top: selectedFile
                    ? `${
                        (PREVIEW_BOX_SIZE - imageDimensions.height) / 2 +
                        imageOffset.y
                      }px`
                    : "0px",
                  pointerEvents: "none",
                  transition: isDragging
                    ? "none"
                    : "left 0.1s ease-out, top 0.1s ease-out",
                }}
              />

              <MDBox
                position="absolute"
                top="50%"
                left="50%"
                width={`${DRAG_CONTAINER_SIZE}px`}
                height={`${DRAG_CONTAINER_SIZE}px`}
                borderRadius="50%"
                border="2px solid rgba(255,255,255,0.9)"
                sx={{
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                  mixBlendMode: "normal",
                }}
              />
            </MDBox>
          </MDBox>

          <MDTypography variant="caption" color="text">
            Drag to reposition and use the slider or trackpad scroll to zoom;
            only the highlighted circle becomes the profile photo.
          </MDTypography>

          <MDBox width="100%" mt={1}>
            <Slider
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={handleZoomChange}
              valueLabelDisplay="auto"
            />
          </MDBox>
        </DialogContent>

        <DialogActions>
          <MDButton
            variant="text"
            color="secondary"
            onClick={handleCropperClose}
          >
            Close
          </MDButton>
          <MDButton
            variant="gradient"
            color="info"
            onClick={handleCropperClose}
          >
            Done Adjusting
          </MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PersonEditForm;
