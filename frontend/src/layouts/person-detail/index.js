import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"; // Added useCallback
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import defaultProfilePic from "assets/images/default-profile-picture.png";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Toast from "components/Toast";
import { useTranslation } from "i18n";
import {
  updatePerson,
  fetchPeople,
  createPerson,
  deletePerson,
  uploadProfilePicture,
  fetchGroup,
  fetchGroups,
  updateGroup,
} from "services/convo-broker.js";
import {
  RELATION_INVERSE_MAP,
  RELATION_AUTO_RECIPROCALS,
  RELATION_SUGGESTIONS,
  ACCENT_CYAN,
} from "constants.js";

// Import your new sub-components
import PersonEditForm from "../../components/PersonDetail/PersonEditForm"; // Adjust path as needed
import PersonDisplay from "../../components/PersonDetail/PersonDisplay"; // Adjust path as needed

// REMOVED: Highlight, splitMatch (now imported in PersonEditForm)

const MOBILE_FAB_BOTTOM_OFFSET = "calc(env(safe-area-inset-bottom) + 88px)";

const stableStringify = (value) => {
  const seen = new WeakSet();
  const stringify = (input) => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) return undefined;
    seen.add(input);
    if (Array.isArray(input)) return input.map(stringify);
    return Object.keys(input)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stringify(input[key]);
        return acc;
      }, {});
  };
  return JSON.stringify(stringify(value));
};

const sanitizeTextInput = (value, { maxLength = 200 } = {}) => {
  if (value === null || value === undefined) return "";
  const text = String(value)
    // remove control chars (incl. newlines/tabs)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

// Client-side guard only. Real injection prevention must be enforced server-side
// (parameterized queries, escaping, validation).
const looksLikeSqlInjection = (value) => {
  const text = String(value || "").toLowerCase();
  // Very conservative checks for a *name* field; avoids blocking normal names.
  if (/[;`]/.test(text)) return true;
  if (text.includes("--")) return true;
  if (text.includes("/*") || text.includes("*/")) return true;
  if (
    /\b(union\s+select|drop\s+table|insert\s+into|delete\s+from)\b/.test(text)
  )
    return true;
  if (/\b(or|and)\b\s+\d+\s*=\s*\d+/.test(text)) return true;
  return false;
};

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
};

// Define known fields that should NOT be treated as generic custom fields
const knownFields = [
  "_id",
  "id",
  "Name",
  "NameChi",
  "BirthYear",
  "PhoneNumber",
  "AnnouncementGroup",
  "ChatGroup",
  "Email",
  "District",
  "Address",
  "ProfilePic",
  "deletedAt",
];

const normalizeTextValue = (value = "") => value.trim().toLowerCase();

const getInverseRelationLabel = (label = "") => {
  const normalized = normalizeTextValue(label);
  if (!normalized) {
    return label || "";
  }
  if (Object.prototype.hasOwnProperty.call(RELATION_INVERSE_MAP, normalized)) {
    return RELATION_INVERSE_MAP[normalized] || "";
  }
  return label;
};

const getAutoReciprocalForRelation = (relation = "") => {
  const normalized = normalizeTextValue(relation);
  return RELATION_AUTO_RECIPROCALS[normalized] || "";
};

const propagateImmediateFamilyRelationships = async ({
  relationDetails,
  currentPerson,
  currentPersonGender,
  getFieldsForPerson,
  resolvePersonFromField,
  upsertRelationshipField,
  markPersonDirty,
}) => {
  let derivedCurrentGender = currentPersonGender || "";
  const childEntryMap = new Map();
  const spouseEntries = [];
  const parentEntries = [];
  const siblingEntries = [];

  const addChildEntry = (person, gender = "") => {
    if (!person || !person._id) return false;
    const existing = childEntryMap.get(person._id);
    if (existing) {
      if (!existing.gender && gender) {
        existing.gender = gender;
      }
      return false;
    }
    childEntryMap.set(person._id, { person, gender });
    return true;
  };

  const collectChildrenFromFields = (fields) => {
    if (!fields) return;
    fields.forEach((field) => {
      if (!("value2" in field)) return;
      if (getRelationCategory(field.value2) !== "child") return;
      const relatedPerson = resolvePersonFromField(field);
      if (!relatedPerson) return;
      addChildEntry(
        relatedPerson,
        getGenderFromRelationType(field.value2 || ""),
      );
    });
  };

  const expandChildrenViaSiblingRelationships = () => {
    const visited = new Set();
    const queue = Array.from(childEntryMap.values());
    while (queue.length > 0) {
      const entry = queue.shift();
      const childId = entry?.person?._id;
      if (!childId || visited.has(childId)) {
        continue;
      }
      visited.add(childId);
      const childFields = getFieldsForPerson(entry.person);
      if (!childFields) continue;
      childFields.forEach((field) => {
        if (!("value2" in field)) return;
        if (getRelationCategory(field.value2) !== "sibling") return;
        const siblingPerson = resolvePersonFromField(field);
        if (!siblingPerson || siblingPerson._id === childId) {
          return;
        }
        const siblingGender = getGenderFromRelationType(field.value2 || "");
        if (addChildEntry(siblingPerson, siblingGender)) {
          const siblingEntry = childEntryMap.get(siblingPerson._id);
          if (siblingEntry) {
            queue.push(siblingEntry);
          }
        }
      });
    }
  };

  relationDetails.forEach(
    ({ category, person, targetGender = "", selfGender = "" }) => {
      if (!person || !category) return;
      if (!derivedCurrentGender && selfGender) {
        derivedCurrentGender = selfGender;
      }
      if (category === "child") {
        addChildEntry(person, targetGender);
      } else if (category === "spouse") {
        spouseEntries.push({ person, gender: targetGender });
      } else if (category === "parent") {
        parentEntries.push({ person, gender: targetGender });
      } else if (category === "sibling") {
        siblingEntries.push({ person, gender: targetGender });
      }
    },
  );

  // Only collect existing spouses and children if we're adding parent relationships
  // This ensures we link grandparents to existing family members
  const currentPersonFields =
    currentPerson && currentPerson._id
      ? getFieldsForPerson(currentPerson)
      : null;

  if (currentPersonFields && parentEntries.length > 0) {
    currentPersonFields.forEach((field) => {
      if (!("value2" in field)) return;
      const category = getRelationCategory(field.value2);
      const relatedPerson = resolvePersonFromField(field);
      if (!relatedPerson) return;

      if (
        category === "spouse" &&
        !spouseEntries.some((s) => s.person._id === relatedPerson._id)
      ) {
        spouseEntries.push({
          person: relatedPerson,
          gender: getGenderFromRelationType(field.value2 || ""),
        });
      } else if (
        category === "child" &&
        !childEntryMap.has(relatedPerson._id)
      ) {
        addChildEntry(
          relatedPerson,
          getGenderFromRelationType(field.value2 || ""),
        );
      }
    });
  }

  collectChildrenFromFields(currentPersonFields);
  spouseEntries.forEach((spouse) => {
    collectChildrenFromFields(getFieldsForPerson(spouse.person));
  });

  expandChildrenViaSiblingRelationships();

  const childEntries = Array.from(childEntryMap.values());

  // Create sibling relationships among all child entries (when editing a parent)
  for (let i = 0; i < childEntries.length; i += 1) {
    for (let j = i + 1; j < childEntries.length; j += 1) {
      const firstChild = childEntries[i];
      const secondChild = childEntries[j];
      const firstFields = getFieldsForPerson(firstChild.person);
      const secondFields = getFieldsForPerson(secondChild.person);
      if (!firstFields || !secondFields) continue;

      const labelFirstToSecond = getSiblingLabelForGender(secondChild.gender);
      const reciprocalFirstToSecond = getSiblingLabelForGender(
        firstChild.gender,
      );
      const labelSecondToFirst = getSiblingLabelForGender(firstChild.gender);
      const reciprocalSecondToFirst = getSiblingLabelForGender(
        secondChild.gender,
      );

      if (
        upsertRelationshipField(
          firstFields,
          secondChild.person,
          labelFirstToSecond,
          reciprocalFirstToSecond,
        )
      ) {
        markPersonDirty(firstChild.person);
      }
      if (
        upsertRelationshipField(
          secondFields,
          firstChild.person,
          labelSecondToFirst,
          reciprocalSecondToFirst,
        )
      ) {
        markPersonDirty(secondChild.person);
      }
    }
  }

  // Link spouses to all children
  spouseEntries.forEach((spouse) => {
    const spouseFields = getFieldsForPerson(spouse.person);
    if (!spouseFields) return;
    const parentLabel = getParentLabelForGender(spouse.gender);
    childEntries.forEach((child) => {
      const childFields = getFieldsForPerson(child.person);
      if (!childFields) return;
      const childLabel = getChildLabelForGender(child.gender);

      if (
        upsertRelationshipField(
          spouseFields,
          child.person,
          childLabel,
          parentLabel,
        )
      ) {
        markPersonDirty(spouse.person);
      }
      if (
        upsertRelationshipField(
          childFields,
          spouse.person,
          parentLabel,
          childLabel,
        )
      ) {
        markPersonDirty(child.person);
      }
    });
  });

  // Link current person to all known children (including inherited ones)
  if (currentPersonFields && childEntries.length > 0) {
    const parentLabel = getParentLabelForGender(derivedCurrentGender || "");
    childEntries.forEach((child) => {
      const childFields = getFieldsForPerson(child.person);
      if (!childFields) return;
      const childLabel = getChildLabelForGender(child.gender);
      if (
        upsertRelationshipField(
          currentPersonFields,
          child.person,
          childLabel,
          parentLabel,
        )
      ) {
        markPersonDirty(currentPerson);
      }
      if (
        upsertRelationshipField(
          childFields,
          currentPerson,
          parentLabel,
          childLabel,
        )
      ) {
        markPersonDirty(child.person);
      }
    });
  }

  // If parents were specified, connect them to the current person and siblings
  if (parentEntries.length > 0) {
    const childrenForParents = [];
    if (currentPerson?._id) {
      childrenForParents.push({
        person: currentPerson,
        gender: derivedCurrentGender || "",
      });
    }
    siblingEntries.forEach((sibling) => {
      childrenForParents.push(sibling);
    });

    parentEntries.forEach((parent) => {
      const parentFields = getFieldsForPerson(parent.person);
      if (!parentFields) return;
      const parentLabel = getParentLabelForGender(parent.gender);
      childrenForParents.forEach((child) => {
        if (!child.person?._id) return;
        const childLabel = getChildLabelForGender(child.gender);
        const childFields = getFieldsForPerson(child.person);
        if (!childFields) return;
        if (
          upsertRelationshipField(
            parentFields,
            child.person,
            childLabel,
            parentLabel,
          )
        ) {
          markPersonDirty(parent.person);
        }
        if (
          upsertRelationshipField(
            childFields,
            parent.person,
            parentLabel,
            childLabel,
          )
        ) {
          markPersonDirty(child.person);
        }
      });
    });

    // Link siblings (including current person) together if multiple entries provided
    for (let i = 0; i < childrenForParents.length; i += 1) {
      for (let j = i + 1; j < childrenForParents.length; j += 1) {
        const firstChild = childrenForParents[i];
        const secondChild = childrenForParents[j];
        if (
          !firstChild?.person?._id ||
          !secondChild?.person?._id ||
          firstChild.person._id === secondChild.person._id
        ) {
          continue;
        }
        const firstFields = getFieldsForPerson(firstChild.person);
        const secondFields = getFieldsForPerson(secondChild.person);
        if (!firstFields || !secondFields) continue;
        const labelFirstToSecond = getSiblingLabelForGender(secondChild.gender);
        const reciprocalFirstToSecond = getSiblingLabelForGender(
          firstChild.gender,
        );
        const labelSecondToFirst = getSiblingLabelForGender(firstChild.gender);
        const reciprocalSecondToFirst = getSiblingLabelForGender(
          secondChild.gender,
        );

        if (
          upsertRelationshipField(
            firstFields,
            secondChild.person,
            labelFirstToSecond,
            reciprocalFirstToSecond,
          )
        ) {
          markPersonDirty(firstChild.person);
        }
        if (
          upsertRelationshipField(
            secondFields,
            firstChild.person,
            labelSecondToFirst,
            reciprocalSecondToFirst,
          )
        ) {
          markPersonDirty(secondChild.person);
        }
      }
    }
  }

  // Link spouses with current person's parents (in-laws)
  if (parentEntries.length > 0 && spouseEntries.length > 0) {
    spouseEntries.forEach((spouse) => {
      const spouseFields = getFieldsForPerson(spouse.person);
      if (!spouseFields) return;
      const childInLawLabel = getChildInLawLabelForGender(spouse.gender);
      parentEntries.forEach((parent) => {
        if (!parent.person?._id) return;
        const parentFields = getFieldsForPerson(parent.person);
        if (!parentFields) return;
        const parentInLawLabel = getParentInLawLabelForGender(parent.gender);
        if (
          upsertRelationshipField(
            spouseFields,
            parent.person,
            parentInLawLabel,
            childInLawLabel,
          )
        ) {
          markPersonDirty(spouse.person);
        }
        if (
          upsertRelationshipField(
            parentFields,
            spouse.person,
            childInLawLabel,
            parentInLawLabel,
          )
        ) {
          markPersonDirty(parent.person);
        }
      });
    });
  }

  // Link spouses with current person's siblings (siblings-in-law)
  if (siblingEntries.length > 0 && spouseEntries.length > 0) {
    spouseEntries.forEach((spouse) => {
      const spouseFields = getFieldsForPerson(spouse.person);
      if (!spouseFields) return;
      const spouseSiblingLabel = getSiblingInLawLabelForGender(spouse.gender);
      siblingEntries.forEach((sibling) => {
        if (!sibling.person?._id) return;
        const siblingFields = getFieldsForPerson(sibling.person);
        if (!siblingFields) return;
        const siblingLabel = getSiblingInLawLabelForGender(sibling.gender);
        if (
          upsertRelationshipField(
            spouseFields,
            sibling.person,
            siblingLabel,
            spouseSiblingLabel,
          )
        ) {
          markPersonDirty(spouse.person);
        }
        if (
          upsertRelationshipField(
            siblingFields,
            spouse.person,
            spouseSiblingLabel,
            siblingLabel,
          )
        ) {
          markPersonDirty(sibling.person);
        }
      });
    });
  }

  // Link grandparents (parent entries) with all known children (grandchildren)
  if (parentEntries.length > 0 && childEntries.length > 0) {
    parentEntries.forEach((grandparent) => {
      const grandparentFields = getFieldsForPerson(grandparent.person);
      if (!grandparentFields) return;
      const grandparentLabel = getGrandparentLabelForGender(grandparent.gender);
      childEntries.forEach((child) => {
        if (!child.person?._id) return;
        const childFields = getFieldsForPerson(child.person);
        if (!childFields) return;
        const grandchildLabel = getGrandchildLabelForGender(child.gender);
        if (
          upsertRelationshipField(
            grandparentFields,
            child.person,
            grandchildLabel,
            grandparentLabel,
          )
        ) {
          markPersonDirty(grandparent.person);
        }
        if (
          upsertRelationshipField(
            childFields,
            grandparent.person,
            grandparentLabel,
            grandchildLabel,
          )
        ) {
          markPersonDirty(child.person);
        }
      });
    });
  }
};

const RELATION_CATEGORY_MAP = {
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
  grandson: "grandchild",
  granddaughter: "grandchild",
  grandchild: "grandchild",
  grandfather: "grandparent",
  grandmother: "grandparent",
  grandparent: "grandparent",
};

const RELATION_GENDER_MAP = {
  son: "male",
  brother: "male",
  father: "male",
  husband: "male",
  grandson: "male",
  grandfather: "male",
  "father-in-law": "male",
  "son-in-law": "male",
  "brother-in-law": "male",
  daughter: "female",
  sister: "female",
  mother: "female",
  wife: "female",
  granddaughter: "female",
  grandmother: "female",
  "mother-in-law": "female",
  "daughter-in-law": "female",
  "sister-in-law": "female",
};

const getRelationCategory = (relation = "") =>
  RELATION_CATEGORY_MAP[normalizeTextValue(relation)] || null;

const getGenderFromRelationType = (relation = "") =>
  RELATION_GENDER_MAP[normalizeTextValue(relation)] || "";

const getParentLabelForGender = (gender = "") => {
  if (gender === "male") return "Father";
  if (gender === "female") return "Mother";
  return "Parent";
};

const getChildLabelForGender = (gender = "") => {
  if (gender === "male") return "Son";
  if (gender === "female") return "Daughter";
  return "Child";
};

const getSiblingLabelForGender = (gender = "") => {
  if (gender === "male") return "Brother";
  if (gender === "female") return "Sister";
  return "Sibling";
};

const getGrandparentLabelForGender = (gender = "") => {
  if (gender === "male") return "Grandfather";
  if (gender === "female") return "Grandmother";
  return "";
};

const getGrandchildLabelForGender = (gender = "") => {
  if (gender === "male") return "Grandson";
  if (gender === "female") return "Granddaughter";
  return "";
};

const getParentInLawLabelForGender = (gender = "") => {
  if (gender === "male") return "Father-in-law";
  if (gender === "female") return "Mother-in-law";
  return "Parent-in-law";
};

const getChildInLawLabelForGender = (gender = "") => {
  if (gender === "male") return "Son-in-law";
  if (gender === "female") return "Daughter-in-law";
  return "Child-in-law";
};

const getSiblingInLawLabelForGender = (gender = "") => {
  if (gender === "male") return "Brother-in-law";
  if (gender === "female") return "Sister-in-law";
  return "Sibling-in-law";
};

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const isAddMode = id === "add";
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down("xl"));
  const openedFromGroup = useMemo(() => {
    const from = location.state?.from;
    if (typeof from !== "string") return false;
    return from.toLowerCase().startsWith("/group/");
  }, [location.state]);

  // Core State for the Person Detail View
  const [person, setPerson] = useState(null); // The original person data (for view mode/discard)
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { ProfilePic: "" } : null,
  );
  const isAddActionDisabled =
    isAddMode &&
    !(
      (editedPerson?.Name || "").trim().length ||
      (editedPerson?.NameChi || "").trim().length
    );
  const [personalCustomFields, setPersonalCustomFields] = useState([]);
  const [relationshipFields, setRelationshipFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
    actionLabel: null,
    onAction: null,
    autoHideDuration: 2000,
  });
  const [peopleList, setPeopleList] = useState([]); // List of all people for relationship suggestions
  const [relationshipFieldErrors, setRelationshipFieldErrors] = useState({});
  const [personGroups, setPersonGroups] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  // Profile Picture Upload States (kept here as they are part of the save/discard flow)
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const profilePicProcessorRef = useRef(null);
  const pendingDiscardActionRef = useRef(null);

  const breadcrumbRoute = useMemo(() => {
    const baseRoute = ["people"];
    const trimmedEditedName = editedPerson?.Name?.trim() || "";
    const trimmedPersonName = person?.Name?.trim() || "";
    const displayName = trimmedEditedName || trimmedPersonName || "";
    if (displayName) {
      baseRoute.push(displayName);
    } else if (id) {
      baseRoute.push(id);
    }
    return baseRoute;
  }, [editedPerson?.Name, person?.Name, id]);

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
            const relationValue = personData[key].relation || "";
            const personValue = personData[key].person || "";
            const reciprocalValue = personData[key].reciprocal || "";
            const personIdValue =
              personData[key].personId || personData[key].personID || "";

            // Migration/guard: if something looks like a relationship object but has no relation/personId,
            // treat it as a plain custom field (older bug saved personal custom fields as {person,relation,...}).
            if (
              !String(relationValue || "").trim() &&
              !String(personIdValue || "").trim() &&
              !String(reciprocalValue || "").trim()
            ) {
              initialCustomFields.push({
                key: key,
                value: personValue,
              });
              return;
            }

            initialCustomFields.push({
              key: key,
              value: personValue,
              value2: relationValue,
              value3:
                reciprocalValue ||
                getAutoReciprocalForRelation(relationValue) ||
                "",
              personId: personIdValue,
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
    [knownFields, isRelationshipFieldData],
  ); // Dependencies for useCallback

  const splitDynamicFields = useCallback((fields = []) => {
    const personal = [];
    const relationships = [];
    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(field, "value2")) {
        relationships.push(field);
      } else if (field?.key !== "ProfilePic") {
        personal.push(field);
      }
    });
    return { personal, relationships };
  }, []);

  const buildPersonPayloadWithCustomFields = useCallback(
    (basePersonData = {}, fields = []) => {
      const data = { ...basePersonData };
      const existingDynamicKeys = Object.keys(basePersonData || {}).filter(
        (key) => !knownFields.includes(key),
      );
      existingDynamicKeys.forEach((key) => delete data[key]);

      fields.forEach((field, index) => {
        let actualKey = field.key;
        if (actualKey === "ProfilePic") {
          console.warn(
            "Attempted to save a custom field named 'ProfilePic'. Ignoring as this is a reserved field.",
          );
          return;
        }
        if (!actualKey) {
          actualKey = `CustomField_${index}`;
        }
        if (Object.prototype.hasOwnProperty.call(field, "value2")) {
          const autoReciprocal = getAutoReciprocalForRelation(field.value2);
          data[actualKey] = {
            personId: field.personId || "",
            person: field.value || "",
            relation: field.value2 || "",
            reciprocal: field.value3 || autoReciprocal || "",
          };
        } else {
          data[actualKey] = field.value;
        }
      });

      return data;
    },
    [],
  );

  const getRelationshipTargetKey = useCallback((field) => {
    if (!field) return "";
    return field.key || field.personId || normalizeTextValue(field.value || "");
  }, []);

  const findPersonForField = useCallback((people, field) => {
    if (!field) return null;
    if (field.personId) {
      return people.find((p) => p._id === field.personId) || null;
    }
    const name = (field.value || "").trim();
    if (!name) return null;
    return people.find((p) => (p.Name || "").trim() === name) || null;
  }, []);

  const syncReciprocalRelationships = useCallback(
    async ({
      currentPersonName,
      currentPersonId,
      currentRelationships = [],
      previousRelationships = [],
    }) => {
      const trimmedCurrentName = (currentPersonName || "").trim();
      if (!trimmedCurrentName) {
        return;
      }

      let storedPeople = localStorage.getItem("people");
      if (!storedPeople) {
        await fetchPeople();
        storedPeople = localStorage.getItem("people");
      }
      if (!storedPeople) {
        return;
      }

      const people = JSON.parse(storedPeople);
      const findPersonByName = (name) =>
        people.find((p) => (p.Name || "").trim() === (name || "").trim());

      const prevTargets = new Map();
      previousRelationships.forEach((field) => {
        const key = getRelationshipTargetKey(field);
        if (key) {
          prevTargets.set(key, field);
        }
      });

      const currentTargets = new Map();
      currentRelationships.forEach((field) => {
        const key = getRelationshipTargetKey(field);
        if (key) {
          currentTargets.set(key, field);
        }
      });

      const currentPersonRef = {
        _id: currentPersonId || "",
        Name: currentPersonName || "",
      };
      const currentPersonFieldsSnapshot = JSON.parse(
        JSON.stringify([...personalCustomFields, ...relationshipFields]),
      );
      const personById = new Map(people.map((person) => [person._id, person]));
      const personFieldsCache = new Map();
      const dirtyPersonIds = new Set();
      const relationDetails = [];
      let currentPersonGenderGuess = "";

      const getFieldsForPerson = (person) => {
        if (!person?._id) return null;
        if (currentPersonId && person._id === currentPersonId) {
          if (!personFieldsCache.has(person._id)) {
            const clonedFields = currentPersonFieldsSnapshot.map((field) => ({
              ...field,
            }));
            personFieldsCache.set(person._id, clonedFields);
          }
          return personFieldsCache.get(person._id);
        }
        if (!personFieldsCache.has(person._id)) {
          personFieldsCache.set(person._id, initializeCustomFields(person));
        }
        return personFieldsCache.get(person._id);
      };

      const markPersonDirty = (person) => {
        if (person?._id) {
          dirtyPersonIds.add(person._id);
        }
      };

      const upsertRelationshipField = (
        fields,
        targetPerson,
        relationLabel,
        reciprocalLabel,
      ) => {
        if (!fields || !targetPerson || !relationLabel) {
          return false;
        }
        const targetId = targetPerson._id || "";
        const targetName = (targetPerson.Name || "").trim();
        const normalizedName = normalizeTextValue(targetName);
        let matchIndex = -1;
        if (targetId) {
          matchIndex = fields.findIndex(
            (field) => "value2" in field && field.personId === targetId,
          );
        }
        if (matchIndex === -1 && normalizedName) {
          matchIndex = fields.findIndex(
            (field) =>
              "value2" in field &&
              normalizeTextValue(field.value || "") === normalizedName,
          );
        }
        if (matchIndex >= 0) {
          const existing = fields[matchIndex];
          if (
            existing.value2 === relationLabel &&
            (reciprocalLabel ? existing.value3 === reciprocalLabel : true) &&
            (targetId ? existing.personId === targetId : true)
          ) {
            return false;
          }
          fields[matchIndex] = {
            ...existing,
            value: targetName || existing.value,
            value2: relationLabel,
            value3: reciprocalLabel || existing.value3 || "",
            personId: targetId || existing.personId || "",
          };
          return true;
        }
        fields.push({
          key: `Relationship_auto_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          value: targetName,
          value2: relationLabel,
          value3: reciprocalLabel || "",
          personId: targetId,
        });
        return true;
      };

      const removeRelationshipField = (fields, referencePerson) => {
        if (!fields || !referencePerson) {
          return false;
        }
        const targetId = referencePerson._id || "";
        const normalizedName = normalizeTextValue(referencePerson.Name || "");
        const filtered = fields.filter((field) => {
          if (!("value2" in field)) return true;
          if (targetId && field.personId) {
            return field.personId !== targetId;
          }
          return normalizeTextValue(field.value || "") !== normalizedName;
        });
        if (filtered.length === fields.length) {
          return false;
        }
        fields.length = 0;
        filtered.forEach((field) => fields.push(field));
        return true;
      };

      for (const [targetKey, prevField] of prevTargets.entries()) {
        if (currentTargets.has(targetKey)) {
          continue;
        }
        const targetPerson = findPersonForField(people, prevField);
        if (!targetPerson) {
          continue;
        }
        const targetFields = getFieldsForPerson(targetPerson);
        if (!targetFields) continue;
        if (removeRelationshipField(targetFields, currentPersonRef)) {
          markPersonDirty(targetPerson);
        }
      }

      for (const [, relationshipField] of currentTargets.entries()) {
        const targetPerson = findPersonForField(people, relationshipField);
        if (!targetPerson || targetPerson._id === currentPersonId) {
          continue;
        }
        const relationCategory = getRelationCategory(
          relationshipField.value2 || "",
        );
        const targetGender = getGenderFromRelationType(
          relationshipField.value2 || "",
        );
        const selfGender = getGenderFromRelationType(
          relationshipField.value3 || "",
        );
        if (!currentPersonGenderGuess && selfGender) {
          currentPersonGenderGuess = selfGender;
        }
        relationDetails.push({
          field: relationshipField,
          person: targetPerson,
          category: relationCategory,
          targetGender,
          selfGender,
        });
        const targetFields = getFieldsForPerson(targetPerson);
        if (!targetFields) continue;
        const inverseRelation =
          relationshipField.value3 ||
          getInverseRelationLabel(relationshipField.value2 || "");
        if (
          upsertRelationshipField(
            targetFields,
            currentPersonRef,
            inverseRelation,
            relationshipField.value2 || "",
          )
        ) {
          markPersonDirty(targetPerson);
        }
      }

      if (relationDetails.length > 0) {
        await propagateImmediateFamilyRelationships({
          relationDetails,
          currentPerson: currentPersonRef,
          currentPersonGender: currentPersonGenderGuess,
          getFieldsForPerson,
          resolvePersonFromField: (field) => findPersonForField(people, field),
          upsertRelationshipField,
          markPersonDirty,
        });
      }

      if (dirtyPersonIds.size > 0) {
        await Promise.all(
          Array.from(dirtyPersonIds).map((personId) => {
            const person = personById.get(personId);
            if (!person) {
              return null;
            }
            const fields = personFieldsCache.get(personId);
            if (!fields) {
              return null;
            }
            const payload = buildPersonPayloadWithCustomFields(person, fields);
            return updatePerson(personId, payload);
          }),
        );
      }
    },
    [
      initializeCustomFields,
      buildPersonPayloadWithCustomFields,
      getRelationshipTargetKey,
      findPersonForField,
      updatePerson,
      fetchPeople,
      personalCustomFields,
      relationshipFields,
    ],
  );

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
          const { personal, relationships } = splitDynamicFields(
            initializeCustomFields(found),
          );
          setPersonalCustomFields(personal);
          setRelationshipFields(relationships);
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
      setPersonalCustomFields([]);
      setRelationshipFields([]);
    }
  }, [id, isAddMode, initializeCustomFields, splitDynamicFields]);

  // Effect to load people list for relationship suggestions
  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      setPeopleList(people);
    }
  }, []);

  useEffect(() => {
    const loadGroupsForPerson = async () => {
      try {
        const groups = await fetchGroups();
        setGroupsList(groups || []);

        if (isAddMode) {
          setPersonGroups([]);
          setSelectedGroupIds([]);
          return;
        }

        const personId = String(id);
        const filtered = (groups || []).filter((g) => {
          const memberIds = Array.isArray(g?.Members) ? g.Members : [];
          return memberIds.map(String).includes(personId);
        });
        setPersonGroups(filtered);
        setSelectedGroupIds(filtered.map((g) => g?._id).filter(Boolean));
      } catch (error) {
        console.error("Failed to load groups for person:", error);
        setGroupsList([]);
        setPersonGroups([]);
        setSelectedGroupIds([]);
      }
    };

    loadGroupsForPerson();
  }, [id, isAddMode]);

  const syncGroupsForPerson = useCallback(
    async (personId) => {
      const isMongoObjectId = (value) =>
        typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
      if (!personId || personId === "add") return;

      const selectedSet = new Set((selectedGroupIds || []).map(String));

      const updates = (groupsList || [])
        .filter((g) => isMongoObjectId(g?._id))
        .map(async (group) => {
          const groupId = group._id;
          const currentMembers = Array.isArray(group?.Members)
            ? group.Members
            : [];
          const memberIds = currentMembers
            .map((m) => (typeof m === "string" ? m : m?._id || m?.id))
            .filter(Boolean)
            .map(String);

          const hasMember = memberIds.includes(String(personId));
          const shouldHave = selectedSet.has(String(groupId));
          if (hasMember === shouldHave) return;

          const nextMembers = shouldHave
            ? Array.from(new Set([...memberIds, String(personId)]))
            : memberIds.filter((mid) => mid !== String(personId));

          await updateGroup(groupId, {
            Name: group?.Name || "",
            Description: group?.Description || "",
            GroupPic: group?.GroupPic || "",
            Members: nextMembers,
          });
        });

      await Promise.all(updates);
      localStorage.removeItem("groups");
      const refreshedGroups = await fetchGroups();
      setGroupsList(refreshedGroups || []);

      const personIdString = String(personId);
      const filtered = (refreshedGroups || []).filter((g) => {
        const memberIds = Array.isArray(g?.Members) ? g.Members : [];
        return memberIds.map(String).includes(personIdString);
      });
      setPersonGroups(filtered);
      setSelectedGroupIds(filtered.map((g) => g?._id).filter(Boolean));
    },
    [fetchGroups, groupsList, selectedGroupIds, updateGroup],
  );

  // Handlers for main actions (Edit, Save, Discard, Delete)
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      open: false,
      actionLabel: null,
      onAction: null,
    }));
  }, []);

  const closeDiscardConfirmModal = useCallback(() => {
    setShowDiscardConfirmModal(false);
    pendingDiscardActionRef.current = null;
  }, []);

  const handleProfilePicUpload = useCallback(
    async (fileOverride = null, personIdOverride = null) => {
      const fileToUpload = fileOverride || selectedFile;
      if (!fileToUpload) {
        return;
      }
	      const targetPersonId = personIdOverride || id;
	      if (!targetPersonId || targetPersonId === "add") {
	        setUploadError(
	          t(
	            "personDetailPage.errors.createFirstBeforeUpload",
	            "Please create the person first before uploading an image.",
	          ),
	        );
	        return;
	      }
      setUploadError(null);
      try {
        const response = await uploadProfilePicture(
          targetPersonId,
          fileToUpload,
        );
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
	            t(
	              "personDetailPage.errors.uploadFailed",
	              "Failed to upload image. Please try again.",
	            ),
	        );
	      }
	    },
	    [selectedFile, id, t],
	  );

  const handleSave = useCallback(
    async (fieldsOverride = null) => {
      const combinedFields = [...personalCustomFields, ...relationshipFields];
      const fieldsToUse = fieldsOverride || combinedFields;
      try {
        // Add-person guard: require Name OR Chinese Name
        if (isAddMode) {
          const name = sanitizeTextInput(editedPerson?.Name, {
            maxLength: 120,
          });
          const nameChi = sanitizeTextInput(editedPerson?.NameChi, {
            maxLength: 120,
          });

	          if (!name && !nameChi) {
	            setToast({
	              open: true,
	              message: t(
	                "personDetailPage.errors.nameRequired",
	                "Please fill in Name or Chinese Name.",
	              ),
	              severity: "error",
	            });
	            return;
	          }

	          if (looksLikeSqlInjection(name) || looksLikeSqlInjection(nameChi)) {
	            setToast({
	              open: true,
	              message:
	                t(
	                  "personDetailPage.errors.invalidNameChars",
	                  "Invalid characters detected in Name/Chinese Name. Please remove special symbols.",
	                ),
	              severity: "error",
	            });
	            return;
	          }
        }

        const cleanedFieldsToUse = fieldsToUse.filter((field) => {
          const key = sanitizeTextInput(field?.key, { maxLength: 60 });
          const value =
            typeof field?.value === "string"
              ? sanitizeTextInput(field.value, { maxLength: 240 })
              : field?.value;

          if (Object.prototype.hasOwnProperty.call(field, "value2")) {
            const relation = sanitizeTextInput(field?.value2, {
              maxLength: 60,
            });
            const reciprocal = sanitizeTextInput(field?.value3, {
              maxLength: 60,
            });
            const personId = String(field?.personId || "").trim();
            const person = typeof value === "string" ? value : "";
            return Boolean(personId || person || relation || reciprocal);
          }

          // Personal custom field: skip if user added row but left it blank.
          return Boolean(key || (typeof value === "string" ? value : ""));
        });

        const errors = {};
        let isValid = true;

        const relationshipFieldsToValidate =
          fieldsOverride === null
            ? relationshipFields
            : cleanedFieldsToUse.filter((field) =>
                Object.prototype.hasOwnProperty.call(field, "value2"),
              );

        relationshipFieldsToValidate.forEach((field, index) => {
          const personId = String(field?.personId || "").trim();
          const personName = sanitizeTextInput(field?.value, {
            maxLength: 240,
          });
          const relationValue = sanitizeTextInput(field?.value2, {
            maxLength: 60,
          });
          const reciprocalValue = sanitizeTextInput(field?.value3, {
            maxLength: 60,
          });

          const isBlankRelationship = !(
            personId ||
            personName ||
            relationValue ||
            reciprocalValue
          );
          if (isBlankRelationship) {
            return;
          }

          const normalizedRelation = normalizeTextValue(relationValue);
          const relationValid = RELATION_SUGGESTIONS.some(
            (option) => normalizeTextValue(option) === normalizedRelation,
          );
          if (!relationValid) {
            isValid = false;
            errors[index] = {
              ...(errors[index] || {}),
              relationType: "Please select a relation from the list.",
            };
          }
          const requiresReciprocal =
            relationValid && !getAutoReciprocalForRelation(relationValue);
          if (requiresReciprocal && !(field.value3 || "").trim()) {
            isValid = false;
            errors[index] = {
              ...(errors[index] || {}),
              reciprocal: "Please fill in this relation.",
            };
          }
        });
        setRelationshipFieldErrors(errors);
        if (!isValid) {
          return;
        }
        let pendingProfilePicFile = null;
        if (profilePicProcessorRef.current) {
          pendingProfilePicFile = await profilePicProcessorRef.current();
        }

        // Basic sanitization for common string fields before saving.
        const sanitizedEditedPerson = {
          ...editedPerson,
          Name: sanitizeTextInput(editedPerson?.Name, { maxLength: 120 }),
          NameChi: sanitizeTextInput(editedPerson?.NameChi, { maxLength: 120 }),
          Email: sanitizeTextInput(editedPerson?.Email, { maxLength: 200 }),
          District: sanitizeTextInput(editedPerson?.District, {
            maxLength: 120,
          }),
          Address: sanitizeTextInput(editedPerson?.Address, { maxLength: 240 }),
          AnnouncementGroup: sanitizeTextInput(
            editedPerson?.AnnouncementGroup,
            { maxLength: 10 },
          ),
          ChatGroup: sanitizeTextInput(editedPerson?.ChatGroup, {
            maxLength: 10,
          }),
        };

        const dataToSave = buildPersonPayloadWithCustomFields(
          sanitizedEditedPerson,
          cleanedFieldsToUse.map((field) => {
            const key = sanitizeTextInput(field?.key, { maxLength: 60 });
            const value =
              typeof field?.value === "string"
                ? sanitizeTextInput(field.value, { maxLength: 240 })
                : field?.value;

            if (Object.prototype.hasOwnProperty.call(field, "value2")) {
              return {
                key,
                value,
                value2:
                  typeof field?.value2 === "string"
                    ? sanitizeTextInput(field.value2, { maxLength: 60 })
                    : field?.value2,
                value3:
                  typeof field?.value3 === "string"
                    ? sanitizeTextInput(field.value3, { maxLength: 60 })
                    : field?.value3,
                personId: field?.personId || "",
              };
            }

            // Personal custom field: ensure we don't accidentally create relationship-only keys
            // (e.g. `value2: undefined`) which would cause the backend payload to become an object.
            return { key, value };
          }),
        );
        const currentRelationshipFields = cleanedFieldsToUse.filter((field) =>
          Object.prototype.hasOwnProperty.call(field, "value2"),
        );
        const previousRelationshipFields = isAddMode
          ? []
          : initializeCustomFields(person || {}).filter((field) =>
              Object.prototype.hasOwnProperty.call(field, "value2"),
            );
        if (isAddMode) {
          const createdPerson = await createPerson(dataToSave);
          const createdPersonId = createdPerson?._id || createdPerson?.id;
          await syncReciprocalRelationships({
            currentPersonId: createdPersonId,
            currentPersonName: dataToSave.Name || createdPerson?.Name || "",
            currentRelationships: currentRelationshipFields,
            previousRelationships: [],
          });
          if (pendingProfilePicFile && createdPersonId) {
            await handleProfilePicUpload(
              pendingProfilePicFile,
              createdPersonId,
            );
          }
          if (createdPersonId) {
            await syncGroupsForPerson(createdPersonId);
          }
          localStorage.removeItem("people");
          await fetchPeople();
          const storedPeople = localStorage.getItem("people");
          if (storedPeople) {
            setPeopleList(JSON.parse(storedPeople));
          }
	          navigate("/people", {
	            state: {
	              toast: {
	                message: t("personDetailPage.toasts.created", "Created"),
	                severity: "success",
	              },
	            },
	          });
        } else {
          await updatePerson(id, dataToSave);
          if (pendingProfilePicFile) {
            await handleProfilePicUpload(pendingProfilePicFile);
          }
          await syncReciprocalRelationships({
            currentPersonId: id,
            currentPersonName: dataToSave.Name || person?.Name || "",
            currentRelationships: currentRelationshipFields,
            previousRelationships: previousRelationshipFields,
          });
          await syncGroupsForPerson(id);
          localStorage.removeItem("people");
          await fetchPeople();
          const stored = localStorage.getItem("people");
          if (stored) {
            const people = JSON.parse(stored);
            const found = people.find((p) => p._id === id);
            setPerson(found);
            setEditedPerson(found);
            const { personal, relationships } = splitDynamicFields(
              initializeCustomFields(found || {}),
            );
            setPersonalCustomFields(personal);
            setRelationshipFields(relationships);
            setPeopleList(people);
          }
          setIsEditing(false);
	          setToast({
	            open: true,
	            message: t("personDetailPage.toasts.saved", "Saved"),
	            severity: "success",
	          });
        }
        setRelationshipFieldErrors({});
      } catch (error) {
        console.error("Failed to save:", error);
      }
    },
    [
      editedPerson,
      personalCustomFields,
      relationshipFields,
	      isAddMode,
	      id,
	      person,
	      navigate,
	      t,
	      initializeCustomFields,
	      splitDynamicFields,
	      buildPersonPayloadWithCustomFields,
	      syncReciprocalRelationships,
	      handleProfilePicUpload,
      syncGroupsForPerson,
    ],
  ); // Dependencies for useCallback

  const handleDiscard = useCallback(() => {
    if (isAddMode) {
      navigate("/people");
    } else {
      setEditedPerson(person); // Revert to original person data
      const { personal, relationships } = splitDynamicFields(
        initializeCustomFields(person || {}),
      );
      setPersonalCustomFields(personal);
      setRelationshipFields(relationships);
      setIsEditing(false);
      setSelectedFile(null); // Clear selected file
      setUploadError(null); // Clear upload error
      setRelationshipFieldErrors({});
    }
  }, [isAddMode, navigate, person, initializeCustomFields, splitDynamicFields]);

  const isDirty = useMemo(() => {
    if (selectedFile) return true;

    if (isAddMode) {
      if ((selectedGroupIds || []).length > 0) return true;
      if (hasMeaningfulValue(editedPerson?.ProfilePic)) return true;
      if (hasMeaningfulValue(editedPerson?.Name)) return true;
      if (hasMeaningfulValue(editedPerson?.NameChi)) return true;
      if (hasMeaningfulValue(editedPerson?.BirthYear)) return true;
      if (hasMeaningfulValue(editedPerson?.PhoneNumber)) return true;
      if (hasMeaningfulValue(editedPerson?.Email)) return true;
      if (hasMeaningfulValue(editedPerson?.District)) return true;
      if (hasMeaningfulValue(editedPerson?.Address)) return true;
      if (hasMeaningfulValue(editedPerson?.AnnouncementGroup)) return true;
      if (hasMeaningfulValue(editedPerson?.ChatGroup)) return true;
      const combinedFields = [...personalCustomFields, ...relationshipFields];
      return combinedFields.some(
        (field) =>
          hasMeaningfulValue(field?.key) ||
          hasMeaningfulValue(field?.value) ||
          hasMeaningfulValue(field?.value2) ||
          hasMeaningfulValue(field?.value3) ||
          hasMeaningfulValue(field?.personId),
      );
    }

    if (!person) return false;

    const baselineGroupIds = (personGroups || [])
      .map((g) => g?._id)
      .filter(Boolean)
      .map(String)
      .sort()
      .join(",");
    const currentGroupIds = (selectedGroupIds || [])
      .map(String)
      .sort()
      .join(",");
    if (baselineGroupIds !== currentGroupIds) return true;

    const baselineFields = initializeCustomFields(person);
    const baselinePayload = buildPersonPayloadWithCustomFields(
      person,
      baselineFields,
    );
    const combinedFields = [...personalCustomFields, ...relationshipFields];
    const currentPayload = buildPersonPayloadWithCustomFields(
      editedPerson,
      combinedFields,
    );

    return stableStringify(baselinePayload) !== stableStringify(currentPayload);
  }, [
    buildPersonPayloadWithCustomFields,
    editedPerson,
    initializeCustomFields,
    isAddMode,
    personalCustomFields,
    relationshipFields,
    person,
    personGroups,
    selectedFile,
    selectedGroupIds,
  ]);

  const requestDiscardIfDirty = useCallback(
    (action) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingDiscardActionRef.current = action;
      setShowDiscardConfirmModal(true);
    },
    [isDirty],
  );

  const confirmDiscard = useCallback(() => {
    const action = pendingDiscardActionRef.current;
    closeDiscardConfirmModal();
    if (action) action();
  }, [closeDiscardConfirmModal]);

  const handleRemoveFromGroup = useCallback(() => {
    const from = location.state?.from;
    if (typeof from !== "string" || !from.toLowerCase().startsWith("/group/")) {
      return;
    }

    const groupId = from.split("/group/")[1]?.split("/")[0];
    if (!groupId) return;

    const isMongoObjectId = (value) =>
      typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

	    if (!isMongoObjectId(groupId)) {
	      setToast({
	        open: true,
	        message: t(
	          "personDetailPage.errors.removeFromGroupSavedOnly",
	          "Remove from group is only available for saved groups.",
	        ),
	        severity: "warning",
	      });
	      return;
	    }

    const run = async () => {
      try {
        const group = await fetchGroup(groupId);
        const currentIds = (group?.Members || [])
          .map((m) => m?._id || m?.id || m)
          .filter(Boolean)
          .map(String);

        const nextMembers = currentIds.filter((mid) => mid !== String(id));

        await updateGroup(groupId, {
          Name: group?.Name || "",
          Description: group?.Description || "",
          GroupPic: group?.GroupPic || "",
          Members: nextMembers,
        });

	        navigate(from, {
	          state: {
	            toast: {
	              message: t(
	                "personDetailPage.toasts.removedFromGroup",
	                "Removed from group.",
	              ),
	              severity: "success",
	              actionLabel: t("actions.undo", "Undo"),
	              autoHideDuration: 6000,
	              undo: { members: currentIds },
	            },
	          },
	        });
	      } catch (error) {
	        setToast({
	          open: true,
	          message:
	            error?.message ||
	            t(
	              "personDetailPage.errors.removeFromGroupFailed",
	              "Failed to remove from group.",
	            ),
	          severity: "error",
	        });
	      }
    };

    run();
	  }, [id, location.state?.from, navigate, t]);

  const handleDelete = useCallback(() => {
    setShowDeleteModal(false);
    const personId = id;
    const snapshot = person || editedPerson;

    const run = async () => {
      try {
        await deletePerson(personId);
        localStorage.removeItem("people");
        await fetchPeople();
	        navigate("/people", {
	          state: {
	            toast: {
	              message: t(
	                "personDetailPage.toasts.personDeleted",
	                "Person deleted.",
	              ),
	              severity: "success",
	              autoHideDuration: 6000,
	              actionLabel: t("actions.undo", "Undo"),
	              undo: { person: snapshot },
	            },
	          },
	        });
      } catch (error) {
        console.error("Failed to delete:", error);
	        setToast({
	          open: true,
	          message:
	            error?.message ||
	            t("personDetailPage.errors.deleteFailed", "Failed to delete person."),
	          severity: "error",
	          actionLabel: null,
	          onAction: null,
	          autoHideDuration: 2000,
	        });
      }
    };

    run();
	  }, [deletePerson, editedPerson, fetchPeople, id, navigate, person, t]);

  // Handlers for editing person details (passed to PersonEditForm)
  const handleChange = useCallback((field, value) => {
    setEditedPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addPersonalCustomField = useCallback(() => {
    setPersonalCustomFields((prev) => [...prev, { key: "", value: "" }]);
    setRelationshipFieldErrors({});
  }, []);

  const updatePersonalCustomField = useCallback((index, field, value) => {
    setPersonalCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removePersonalCustomField = useCallback((index) => {
    setPersonalCustomFields((prev) => prev.filter((_, i) => i !== index));
    setRelationshipFieldErrors({});
  }, []);

  const addRelationshipField = useCallback(() => {
    const newRelationshipKey = `Relationship_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    setRelationshipFields((prev) => [
      ...prev,
      {
        key: newRelationshipKey,
        value: "",
        value2: "",
        value3: "",
        personId: "",
      },
    ]);
    setRelationshipFieldErrors({});
  }, []);

  const updateRelationshipField = useCallback((index, field, value) => {
    setRelationshipFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeRelationshipField = useCallback((index) => {
    setRelationshipFields((prev) => prev.filter((_, i) => i !== index));
    setRelationshipFieldErrors({});
  }, []);

  const handleClearAllRelationshipsNow = useCallback(async () => {
    if (relationshipFields.length === 0) {
      return;
    }
    setRelationshipFields([]);
    setRelationshipFieldErrors({});
    await handleSave([...personalCustomFields]);
  }, [handleSave, personalCustomFields, relationshipFields.length]);

  // Handlers for profile picture upload (passed to PersonEditForm)
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  }, []);

  const registerProfilePicProcessor = useCallback((processor) => {
    profilePicProcessorRef.current = processor;
  }, []);

  // Modal Handlers
  const handleCloseModal = useCallback(() => {
    setShowNotFoundModal(false);
    navigate("/people");
  }, [navigate]);

  useEffect(() => {
    if (!isEditing && !isAddMode) {
      closeDiscardConfirmModal();
    }
  }, [closeDiscardConfirmModal, isAddMode, isEditing]);

  if (!isAddMode && !person && !showNotFoundModal) {
    return <div>{t("common.loading", "Loading...")}</div>;
  }

  const personalInfoCustomFieldsForRender = personalCustomFields
    .map((field, index) => ({
      ...field,
      originalIndex: index,
    }))
    .filter((field) => field.key !== "ProfilePic");

  const relationshipCustomFieldsForRender = relationshipFields.map(
    (field, index) => ({
      ...field,
      originalIndex: index,
    }),
  );

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={breadcrumbRoute} />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header and Action Buttons (remain in parent as they control edit state) */}
          <MDBox
            display={isMobileView ? "grid" : "flex"}
            gridTemplateColumns={isMobileView ? "48px 1fr 48px" : undefined}
            justifyContent={isMobileView ? undefined : "space-between"}
            alignItems="center"
            p={3}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <IconButton
              onClick={() => {
                if (isEditing && !isAddMode) {
                  requestDiscardIfDirty(handleDiscard);
                  return;
                }
                const from = location.state?.from;
                if (from) {
                  navigate(from);
                } else {
                  navigate("/people");
                }
              }}
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
              sx={
                isMobileView
                  ? { textAlign: "center", m: 0, lineHeight: 1.1 }
                  : undefined
              }
            >
              {isAddMode
                ? t("personDetailPage.header.addTitle", "Add Person")
                : isEditing
                ? t("personDetailPage.header.editTitle", "Edit Person")
                : t("personDetailPage.header.viewTitle", "Person Details")}
            </MDTypography>

            {isMobileView ? (
              <MDBox />
            ) : (
              <MDBox display="flex" gap={1}>
                {isEditing || isAddMode ? (
                  <>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={() => handleSave()}
                    >
                      {isAddMode
                        ? t("buttons.add", "Add")
                        : t("buttons.save", "Save")}
                    </MDButton>
                    <MDButton
                      variant="gradient"
                      color="error"
                      onClick={() => requestDiscardIfDirty(handleDiscard)}
                    >
                      {isAddMode
                        ? t("buttons.cancel", "Cancel")
                        : t("buttons.discard", "Discard")}
                    </MDButton>
                  </>
                ) : (
                  <>
                    {openedFromGroup ? (
                      <MDBox display="flex" gap={1} flexWrap="wrap">
                        <MDButton
                          variant="gradient"
                          color="info"
                          onClick={handleEdit}
                        >
                          {t("actions.edit", "Edit")}
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color="error"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          {t("actions.delete", "Delete")}
                        </MDButton>
                        <MDButton
                          variant="gradient"
                          color="error"
                          onClick={handleRemoveFromGroup}
                        >
                          {t(
                            "personDetailPage.groupsPanel.removeFromGroup",
                            "Remove From Group",
                          )}
                        </MDButton>
                      </MDBox>
                    ) : (
                      <>
                        <MDButton
                          variant="gradient"
                          color="info"
                          onClick={handleEdit}
                        >
                          {t("actions.edit", "Edit")}
                        </MDButton>
                        <MDBox display="flex" flexDirection="column" gap={1}>
                          <MDButton
                            variant="gradient"
                            color="error"
                            onClick={() => setShowDeleteModal(true)}
                          >
                            {t("actions.delete", "Delete")}
                          </MDButton>
                        </MDBox>
                      </>
                    )}
                  </>
                )}
              </MDBox>
            )}
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
                relationshipFieldErrors={relationshipFieldErrors}
                peopleList={peopleList.filter((p) => p._id !== id)}
                groupsList={groupsList}
                selectedGroupIds={selectedGroupIds}
                setSelectedGroupIds={setSelectedGroupIds}
                defaultProfilePic={defaultProfilePic}
                // Pass all relevant handlers and states
                handleChange={handleChange}
                addPersonalCustomField={addPersonalCustomField}
                addRelationshipField={addRelationshipField}
                updatePersonalCustomField={updatePersonalCustomField}
                removePersonalCustomField={removePersonalCustomField}
                updateRelationshipField={updateRelationshipField}
                removeRelationshipField={removeRelationshipField}
                handleFileChange={handleFileChange}
                registerProfilePicProcessor={registerProfilePicProcessor}
                selectedFile={selectedFile}
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
                personGroups={personGroups}
                peopleList={peopleList}
                defaultProfilePic={defaultProfilePic}
                onClearRelationships={handleClearAllRelationshipsNow}
              />
            )}
          </MDBox>
        </Card>

        {/* MOBILE action card (button as its own card) */}
        {isMobileView && (
          <MDBox>
            <Card
              onClick={() => {
                if (isEditing || isAddMode) {
                  requestDiscardIfDirty(handleDiscard);
                } else {
                  setShowDeleteModal(true);
                }
              }}
              sx={{
                mt: 2,
                p: 2,
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "error.main",
                boxShadow: "none",
              }}
            >
              <MDTypography
                variant="button"
                fontWeight="medium"
                sx={{ color: "white.main", fontSize: "17px" }}
              >
                {isEditing || isAddMode
                  ? isAddMode
                    ? t("buttons.cancel", "Cancel")
                    : t("buttons.discard", "Discard")
                  : t("actions.delete", "Delete")}
              </MDTypography>
            </Card>

            {openedFromGroup && !isEditing && !isAddMode && (
              <Card
                onClick={handleRemoveFromGroup}
                sx={{
                  mt: 1,
                  p: 2,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "error.main",
                  boxShadow: "none",
                }}
              >
                <MDTypography
                  variant="button"
                  fontWeight="medium"
                  sx={{ color: "white.main", fontSize: "17px" }}
                >
                  {t(
                    "personDetailPage.groupsPanel.removeFromGroup",
                    "Remove From Group",
                  )}
                </MDTypography>
              </Card>
            )}
          </MDBox>
        )}
      </MDBox>

      {/* MOBILE floating edit button (matches list FAB styling) */}
      {isMobileView && !isEditing && !isAddMode && (
        <IconButton
          onClick={handleEdit}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: MOBILE_FAB_BOTTOM_OFFSET,
            width: 77,
            height: 77,
            borderRadius: "50%",
            background: ACCENT_CYAN,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            "&:hover": {
              background: ACCENT_CYAN,
              filter: "brightness(0.9)",
            },
          })}
        >
          <Icon fontSize="large" sx={{ color: "#fff" }}>
            edit
          </Icon>
        </IconButton>
      )}

      {/* MOBILE floating save button (add/edit form) */}
      {isMobileView && (isEditing || isAddMode) && (
        <IconButton
          onClick={() => handleSave()}
          sx={(muiTheme) => ({
            position: "fixed",
            right: 17,
            bottom: MOBILE_FAB_BOTTOM_OFFSET,
            width: 77,
            height: 77,
            borderRadius: "50%",
            backgroundColor: ACCENT_CYAN,
            opacity: isAddActionDisabled ? 0.45 : 1,
            color: "#fff",
            zIndex: muiTheme.zIndex.modal - 1,
            "&:hover": {
              backgroundColor: ACCENT_CYAN,
              filter: isAddActionDisabled ? "none" : "brightness(0.9)",
            },
          })}
        >
          <Icon fontSize="large" sx={{ color: "#fff" }}>
            save
          </Icon>
        </IconButton>
      )}

      {/* Dialogs (remain in parent as they are general UI for the page) */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        autoHideDuration={toast.autoHideDuration}
        onClose={handleCloseToast}
      />
      <Dialog open={showDiscardConfirmModal} onClose={closeDiscardConfirmModal}>
        <DialogTitle>
          {t("personDetailPage.dialogs.discardTitle", "Discard changes?")}
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            {t(
              "personDetailPage.dialogs.discardBody",
              "You have unsaved changes. Discard them?",
            )}
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={closeDiscardConfirmModal} color="info">
            {t("buttons.keepEditing", "Keep editing")}
          </MDButton>
          <MDButton onClick={confirmDiscard} color="error">
            {t("buttons.discard", "Discard")}
          </MDButton>
        </DialogActions>
      </Dialog>
      <Dialog open={showNotFoundModal} onClose={handleCloseModal}>
        <DialogTitle>
          {t("personDetailPage.dialogs.notFoundTitle", "Person Not Found")}
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            {t(
              "personDetailPage.dialogs.notFoundBody",
              "The person you are looking for does not exist.",
            )}
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={handleCloseModal} color="info">
            {t("buttons.ok", "OK")}
          </MDButton>
        </DialogActions>
      </Dialog>
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>
          {t("personDetailPage.dialogs.deleteTitle", "Delete")}
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            {t("personDetailPage.dialogs.deleteBody", "Delete this person?")}
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setShowDeleteModal(false)} color="secondary">
            {t("buttons.cancel", "Cancel")}
          </MDButton>
          <MDButton onClick={handleDelete} color="error">
            {t("actions.delete", "Delete")}
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default PersonDetail;
