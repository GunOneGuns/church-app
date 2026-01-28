import PropTypes from "prop-types";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";

function defaultGetKey(item, index) {
  return item?._id || item?.id || item?.Name || item?.name || index;
}

export default function PersonMobileViewList({
  items,
  emptyText,
  getKey,
  getAvatarSrc,
  getAvatarName,
  getPrimary,
  getSecondary,
  onItemClick,
  renderAction,
  itemButtonSx,
  primaryTypographyProps,
  secondaryTypographyProps,
}) {
  const hasAction = typeof renderAction === "function";

  if (!items?.length) {
    return (
      <MDBox p={2}>
        <MDTypography variant="button" color="text">
          {emptyText}
        </MDTypography>
      </MDBox>
    );
  }

  return (
    <List disablePadding>
      {items.map((item, index) => {
        const key = (getKey || defaultGetKey)(item, index);
        const avatarSrc = getAvatarSrc ? getAvatarSrc(item) : undefined;
        const avatarName = getAvatarName ? getAvatarName(item) : "";
        const primary = getPrimary ? getPrimary(item) : "";
        const secondary = getSecondary ? getSecondary(item) : null;
        const secondaryAction = hasAction ? renderAction(item) : null;

        return (
          <ListItem
            key={key}
            disablePadding
            divider
            secondaryAction={secondaryAction}
          >
            <ListItemButton
              onClick={() => onItemClick?.(item)}
              sx={{ pr: hasAction ? 6 : 2, ...(itemButtonSx || {}) }}
            >
              <ListItemAvatar>
                <MDAvatar src={avatarSrc} name={avatarName} size="sm" />
              </ListItemAvatar>
              <ListItemText
                primary={primary}
                secondary={secondary}
                primaryTypographyProps={primaryTypographyProps}
                secondaryTypographyProps={secondaryTypographyProps}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

PersonMobileViewList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  emptyText: PropTypes.string,
  getKey: PropTypes.func,
  getAvatarSrc: PropTypes.func,
  getAvatarName: PropTypes.func,
  getPrimary: PropTypes.func,
  getSecondary: PropTypes.func,
  onItemClick: PropTypes.func,
  renderAction: PropTypes.func,
  itemButtonSx: PropTypes.object,
  primaryTypographyProps: PropTypes.object,
  secondaryTypographyProps: PropTypes.object,
};

PersonMobileViewList.defaultProps = {
  items: [],
  emptyText: "No items found.",
  getKey: null,
  getAvatarSrc: null,
  getAvatarName: null,
  getPrimary: null,
  getSecondary: null,
  onItemClick: null,
  renderAction: null,
  itemButtonSx: null,
  primaryTypographyProps: { noWrap: true },
  secondaryTypographyProps: { noWrap: true },
};

