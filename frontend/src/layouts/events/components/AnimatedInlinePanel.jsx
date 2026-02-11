import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import MDBox from "components/MDBox";

const INLINE_PICKER_ANIMATION_MS = 220;

export default function AnimatedInlinePanel({ open, mode, children }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [contentOpacity, setContentOpacity] = useState(1);
  const shouldRender = open || isClosing;
  const prevOpenRef = useRef(open);
  const prevModeRef = useRef(mode);
  const modeFadeTimeoutRef = useRef(null);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      return undefined;
    }
    if (!shouldRender) return undefined;
    setIsClosing(true);
    const id = setTimeout(
      () => setIsClosing(false),
      INLINE_PICKER_ANIMATION_MS,
    );
    return () => clearTimeout(id);
  }, [open, shouldRender]);

  useEffect(() => {
    if (!open) {
      setContentOpacity(1);
      prevModeRef.current = mode;
      if (modeFadeTimeoutRef.current) {
        clearTimeout(modeFadeTimeoutRef.current);
        modeFadeTimeoutRef.current = null;
      }
      return undefined;
    }

    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    if (!prevMode || !mode || prevMode === mode) return undefined;

    setContentOpacity(0);
    if (modeFadeTimeoutRef.current) clearTimeout(modeFadeTimeoutRef.current);
    modeFadeTimeoutRef.current = setTimeout(
      () => {
        setContentOpacity(1);
        modeFadeTimeoutRef.current = null;
      },
      Math.round(INLINE_PICKER_ANIMATION_MS * 0.25),
    );

    return () => {
      if (modeFadeTimeoutRef.current) {
        clearTimeout(modeFadeTimeoutRef.current);
        modeFadeTimeoutRef.current = null;
      }
    };
  }, [open, mode]);

  const measureHeight = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    setHeight(el.scrollHeight);
  }, []);

  useLayoutEffect(() => {
    if (!shouldRender) return undefined;
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && !wasOpen) {
      setHeight(0);
      const id = requestAnimationFrame(measureHeight);
      return () => cancelAnimationFrame(id);
    }

    if (open) measureHeight();
    return undefined;
  }, [open, mode, shouldRender, measureHeight]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    if (typeof ResizeObserver === "undefined") return undefined;
    const el = innerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => measureHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, measureHeight]);

  return (
    <MDBox
      sx={{
        height: open ? `${height}px` : "0px",
        opacity: open ? 1 : 0,
        overflow: "hidden",
        transition: `height ${INLINE_PICKER_ANIMATION_MS}ms ease, opacity ${Math.round(
          INLINE_PICKER_ANIMATION_MS * 0.75,
        )}ms ease`,
        willChange: "height, opacity",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {shouldRender ? (
        <MDBox
          ref={innerRef}
          sx={{
            opacity: contentOpacity,
            transition: `opacity ${Math.round(
              INLINE_PICKER_ANIMATION_MS * 0.6,
            )}ms ease`,
          }}
        >
          {children}
        </MDBox>
      ) : null}
    </MDBox>
  );
}

