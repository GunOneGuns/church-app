import { useEffect } from "react";

export default function useAutoFocusOnOpen({
  enabled,
  open,
  inputRef,
  delayMs = 0,
}) {
  useEffect(() => {
    if (!enabled) return undefined;
    if (!open) return undefined;

    const id = setTimeout(() => inputRef.current?.focus?.(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs, enabled, inputRef, open]);
}

