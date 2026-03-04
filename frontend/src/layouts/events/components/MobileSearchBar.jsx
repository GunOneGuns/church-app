import Collapse from "@mui/material/Collapse";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import SearchFilterAdornment from "./SearchFilterAdornment";

export default function MobileSearchBar({
  open,
  inputRef,
  placeholder,
  value,
  onChangeValue,
  filter,
  onSelectFilter,
}) {
  return (
    <MDBox px={2} mb={2}>
      <Collapse in={open} timeout={180} unmountOnExit>
        <TextField
          inputRef={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChangeValue?.(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Icon sx={{ color: "text.secondary" }}>search</Icon>
              </InputAdornment>
            ),
            endAdornment: (
              <SearchFilterAdornment
                filter={filter}
                onSelectFilter={onSelectFilter}
              />
            ),
          }}
          size="small"
          fullWidth
        />
      </Collapse>
    </MDBox>
  );
}

