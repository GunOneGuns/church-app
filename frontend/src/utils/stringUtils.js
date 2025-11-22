import { styled } from "@mui/material/styles";

export const Highlight = styled("span")({
  fontWeight: 600,
});

export function splitMatch(label, query) {
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
