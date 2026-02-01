import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Slider from "@mui/material/Slider";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useTranslation } from "i18n";
import defaultProfilePic from "assets/images/default-profile-picture.png";

const FIELD_LABEL_SX = { fontSize: "1rem" };

function getPersonLabel(person, unknownLabel = "Unknown") {
  if (!person) return "";
  const name = person.Name || "";
  const nameChi = person.NameChi || "";
  if (name && nameChi) return `${name} (${nameChi})`;
  if (name || nameChi) return name || nameChi;
  const id = person?._id || person?.id;
  if (id) return `${unknownLabel} (${String(id).slice(-6)})`;
  return unknownLabel;
}

export default function GroupEditForm({
  editedGroup,
  peopleOptions = [],
  selectedFile,
  onChangeField,
  onChangeMembers,
  handleFileChange,
  registerGroupPicProcessor,
  uploadError,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));
  const [memberQuery, setMemberQuery] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const unknownLabel = t("common.unknown", "Unknown");
  const groupLabel = t("nav.groups", "Group");

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
    return editedGroup?.GroupPic || defaultProfilePic;
  }, [selectedFile, previewUrl, editedGroup?.GroupPic]);

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
    setImageOffset((prev) => ({
      x: clampOffset(prev.x, imageDimensions.width),
      y: clampOffset(prev.y, imageDimensions.height),
    }));
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
    if (!registerGroupPicProcessor) return undefined;

    if (!selectedFile) {
      registerGroupPicProcessor(null);
      return undefined;
    }

    const processor = async () => {
      const croppedFile = await createCroppedFile();
      return croppedFile || selectedFile;
    };

    registerGroupPicProcessor(processor);

    return () => {
      registerGroupPicProcessor(null);
    };
  }, [registerGroupPicProcessor, selectedFile, createCroppedFile]);

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

  const handleFileInputChange = (event) => {
    if (handleFileChange) {
      handleFileChange(event);
    }
    if (event.target.files && event.target.files[0]) {
      setIsCropperOpen(true);
    }
  };

  const openCropper = () => {
    if (selectedFile) setIsCropperOpen(true);
  };

  const handleCropperClose = () => {
    setIsCropperOpen(false);
  };

  const selectedPeople = useMemo(() => {
    const members = editedGroup?.Members || [];
    if (!Array.isArray(members)) return [];

    const byId = new Map(peopleOptions.map((p) => [p?._id, p]));
    return members
      .map((m) => (typeof m === "string" ? byId.get(m) : m))
      .filter(Boolean);
  }, [editedGroup?.Members, peopleOptions]);

  const filterPeopleOptions = useCallback((options, inputValue) => {
    const input = (inputValue || "").trim().toLowerCase();
    const base = Array.isArray(options) ? options.filter(Boolean) : [];
    if (!input) return base;
    return base.filter((person) => {
      const name = (person?.Name || "").toLowerCase();
      const nameChi = (person?.NameChi || "").toLowerCase();
      return name.includes(input) || nameChi.includes(input);
    });
  }, []);

  return (
    <>
      <Grid container spacing={3}>
        {/* Left Column: Group Picture and Upload Controls (matches Add Person) */}
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
                alt={`${editedGroup?.Name || groupLabel}'s picture`}
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
                {t("groupForm.photo.adjustPhoto", "Adjust Photo")}
              </MDButton>
            )}

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
                id="group-pic-upload-input"
              />
              <label htmlFor="group-pic-upload-input" style={{ width: "100%" }}>
                <MDButton
                  variant="outlined"
                  color="info"
                  component="span"
                  fullWidth
                  startIcon={<UploadFileIcon />}
                >
                  {selectedFile
                    ? selectedFile.name
                    : t(
                        "groupForm.photo.chooseGroupPicture",
                        "Choose Group Picture",
                      )}
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

        {/* Right Column: Group Information (matches Add Person panel style) */}
        <Grid item xs={12} md={8} lg={9}>
          <Card sx={{ p: 2 }}>
            <MDTypography variant="h6" fontWeight="bold" mb={2}>
              {t("groupForm.sections.groupInformation", "Group Information")}
            </MDTypography>

            <MDBox display="flex" flexDirection="column" gap={2}>
              <TextField
                variant="outlined"
                label={t("groupForm.fields.groupNameRequired", "Group Name *")}
                value={editedGroup?.Name ?? ""}
                onChange={(e) => onChangeField("Name", e.target.value)}
                fullWidth
                InputLabelProps={{ sx: FIELD_LABEL_SX }}
                sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
              />

              <TextField
                variant="outlined"
                label={t("groupForm.fields.description", "Description")}
                value={editedGroup?.Description ?? ""}
                onChange={(e) => onChangeField("Description", e.target.value)}
                fullWidth
                multiline
                minRows={isMobileView ? 4 : 3}
                maxRows={8}
                InputLabelProps={{
                  sx: {
                    ...FIELD_LABEL_SX,
                    backgroundColor: "background.paper",
                    px: 0.5,
                  },
                  shrink: true,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    alignItems: "flex-start",
                  },
                  "& textarea": {
                    overflow: "auto",
                  },
                }}
              />

              <Autocomplete
                multiple
                options={peopleOptions}
                value={selectedPeople}
                onChange={(_e, next) => onChangeMembers(next.map((p) => p._id))}
                inputValue={memberQuery}
                onInputChange={(_e, next) => {
                  setMemberQuery(next);
                  const trimmed = next.trim();
                  if (!trimmed) {
                    setMembersOpen(true); // show all on focus/click
                    return;
                  }
                  const matchCount = filterPeopleOptions(peopleOptions, next).length;
                  setMembersOpen(matchCount > 0);
                }}
                open={membersOpen}
                onOpen={() => setMembersOpen(true)}
                onClose={() => setMembersOpen(false)}
                openOnFocus
                disableCloseOnSelect
                getOptionLabel={(option) => getPersonLabel(option, unknownLabel)}
                isOptionEqualToValue={(opt, val) => opt?._id === val?._id}
                filterOptions={(options, state) =>
                  filterPeopleOptions(options, state.inputValue)
                }
                noOptionsText=""
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={option?._id || option?.id || key} {...rest}>
                      {getPersonLabel(option, unknownLabel)}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label={t("groupForm.fields.members", "Members")}
                    placeholder={t(
                      "groupForm.fields.searchPeople",
                      "Search people...",
                    )}
                    InputLabelProps={{ sx: FIELD_LABEL_SX }}
                  />
                )}
              />
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
        <DialogTitle>
          {t("groupForm.photo.adjustGroupPicture", "Adjust Group Picture")}
        </DialogTitle>
        <DialogContent>
          <MDBox width="100%" display="flex" justifyContent="center" mt={1} mb={2}>
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
                alt={`${editedGroup?.Name || groupLabel}'s picture`}
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
            {t(
              "groupForm.photo.cropperHelp",
              "Drag to reposition and use the slider or trackpad scroll to zoom; only the highlighted circle becomes the group picture.",
            )}
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
          <MDButton variant="text" color="secondary" onClick={handleCropperClose}>
            {t("buttons.close", "Close")}
          </MDButton>
          <MDButton variant="gradient" color="info" onClick={handleCropperClose}>
            {t("groupForm.photo.doneAdjusting", "Done Adjusting")}
          </MDButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
