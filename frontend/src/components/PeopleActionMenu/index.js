import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ListItemIcon from "@mui/material/ListItemIcon";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

export default function PeopleActionMenu({
  person,
  from,
  onDelete,
  iconColor,
}) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const personId = person?._id || person?.id;
  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        edge="end"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={iconColor ? { color: iconColor } : undefined}
        aria-label="Person actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={(e) => {
          e?.stopPropagation?.();
          closeMenu();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            if (!personId) return;
            navigate(`/person/${personId}`, { state: { from } });
          }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          View
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            if (!personId) return;
            navigate(`/person/${personId}`, { state: { edit: true, from } });
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu();
            if (!personId) return;
            if (onDelete) onDelete(person);
          }}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}

PeopleActionMenu.propTypes = {
  person: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
  }).isRequired,
  from: PropTypes.string,
  onDelete: PropTypes.func,
  iconColor: PropTypes.string,
};

PeopleActionMenu.defaultProps = {
  from: "/people",
  onDelete: null,
  iconColor: null,
};
