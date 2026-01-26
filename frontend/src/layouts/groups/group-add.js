import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Toast from "components/Toast";
import GroupEditForm from "components/GroupDetail/GroupEditForm";
import {
  createGroup,
  fetchPeople,
  uploadGroupPicture,
} from "services/convo-broker.js";
import { ACCENT_CYAN } from "constants.js";

const DEFAULT_GROUP = {
  Name: "",
  Description: "",
  Members: [],
  GroupPic: "",
};

export default function GroupAdd() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));
  const [editedGroup, setEditedGroup] = useState(DEFAULT_GROUP);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const groupPicProcessorRef = useRef(null);
  const [peopleOptions, setPeopleOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const breadcrumbRoute = useMemo(() => {
    const baseRoute = ["groups"];
    const trimmedName = editedGroup?.Name?.trim() || "";
    if (trimmedName) baseRoute.push(trimmedName);
    else baseRoute.push("add");
    return baseRoute;
  }, [editedGroup?.Name]);

  const navigateBack = useCallback(() => {
    const from = location.state?.from;
    if (typeof from === "string" && from.length) {
      navigate(from);
      return;
    }
    navigate("/groups");
  }, [location.state, navigate]);

  useEffect(() => {
    const loadPeople = async () => {
      await fetchPeople();
      const stored = localStorage.getItem("people");
      if (stored) setPeopleOptions(JSON.parse(stored));
    };
    loadPeople();
  }, []);

  const handleCloseToast = useCallback(
    () => setToast((prev) => ({ ...prev, open: false })),
    [],
  );

  const canSubmit = useMemo(
    () => editedGroup.Name.trim().length > 0 && !isSaving,
    [editedGroup.Name, isSaving],
  );

  const onChangeField = useCallback((key, value) => {
    setEditedGroup((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onChangeMembers = useCallback((memberIds) => {
    setEditedGroup((prev) => ({ ...prev, Members: memberIds }));
  }, []);

  const handleFileChange = useCallback((event) => {
    const file = event?.target?.files?.[0] || null;
    setUploadError(null);
    setSelectedFile(file);
  }, []);

  const registerGroupPicProcessor = useCallback((processor) => {
    groupPicProcessorRef.current = processor;
  }, []);

  const handleAdd = useCallback(async () => {
    if (!editedGroup.Name.trim()) {
      setToast({
        open: true,
        message: "Group name is required.",
        severity: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const created = await createGroup({
        Name: editedGroup.Name.trim(),
        Description: editedGroup.Description || "",
        Members: editedGroup.Members || [],
      });

      if (selectedFile) {
        const processor = groupPicProcessorRef.current;
        const fileToUpload = processor ? await processor() : selectedFile;
        if (fileToUpload) {
          await uploadGroupPicture(created._id, fileToUpload);
        }
      }

      navigate(`/group/${created._id}`, {
        state: {
          toast: {
            message: "Group added successfully.",
            severity: "success",
          },
        },
      });
    } catch (error) {
      setToast({
        open: true,
        message: error?.message || "Failed to add group.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editedGroup, navigate, selectedFile]);

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={breadcrumbRoute} />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox
            display={isMobileView ? "grid" : "flex"}
            gridTemplateColumns={isMobileView ? "48px 1fr 48px" : undefined}
            justifyContent={isMobileView ? undefined : "space-between"}
            alignItems="center"
            p={3}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <IconButton
              onClick={navigateBack}
              size={isMobileView ? "medium" : "small"}
              sx={
                isMobileView
                  ? {
                      "& .MuiSvgIcon-root": { fontSize: 28 },
                    }
                  : undefined
              }
            >
              <ArrowBackIosNewIcon />
            </IconButton>

            <MDTypography
              variant="h4"
              sx={isMobileView ? { textAlign: "center", m: 0, lineHeight: 1.1 } : undefined}
            >
              Add Group
            </MDTypography>

            {isMobileView ? (
              <MDBox />
            ) : (
              <MDBox display="flex" gap={1}>
                <MDButton
                  variant="gradient"
                  color="info"
                  disabled={!canSubmit}
                  onClick={handleAdd}
                >
                  Add
                </MDButton>
                <MDButton
                  variant="gradient"
                  color="error"
                  onClick={navigateBack}
                  disabled={isSaving}
                >
                  Cancel
                </MDButton>
              </MDBox>
            )}
          </MDBox>

          <MDBox p={3}>
            <GroupEditForm
              editedGroup={editedGroup}
              peopleOptions={peopleOptions}
              selectedFile={selectedFile}
              onChangeField={onChangeField}
              onChangeMembers={onChangeMembers}
              handleFileChange={handleFileChange}
              registerGroupPicProcessor={registerGroupPicProcessor}
              uploadError={uploadError}
            />
          </MDBox>
        </Card>

        {/* MOBILE action card (Cancel) */}
        {isMobileView && (
          <MDBox>
            <Card
              onClick={navigateBack}
              sx={{
                mt: 2,
                p: 2,
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "error.main",
                boxShadow: "none",
                opacity: isSaving ? 0.6 : 1,
                pointerEvents: isSaving ? "none" : "auto",
              }}
            >
              <MDTypography
                variant="button"
                fontWeight="medium"
                sx={{ color: "white.main", fontSize: "17px" }}
              >
                Cancel
              </MDTypography>
            </Card>
          </MDBox>
        )}
      </MDBox>
      <Footer />

      {/* MOBILE floating save button (add form) */}
      {isMobileView && (
        <IconButton
          disabled={!canSubmit}
          onClick={handleAdd}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: "calc(env(safe-area-inset-bottom) + 88px)",
            width: 77,
            height: 77,
            borderRadius: "50%",
            backgroundColor: ACCENT_CYAN,
            opacity: canSubmit ? 1 : 0.45,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            "&:hover": {
              backgroundColor: ACCENT_CYAN,
              filter: canSubmit ? "brightness(0.9)" : "none",
            },
            "&.Mui-disabled": {
              backgroundColor: ACCENT_CYAN,
              color: "#fff",
              opacity: 0.45,
            },
          })}
        >
          <Icon fontSize="large" sx={{ color: "#fff" }}>
            save
          </Icon>
        </IconButton>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={handleCloseToast}
      />
    </DashboardLayout>
  );
}
