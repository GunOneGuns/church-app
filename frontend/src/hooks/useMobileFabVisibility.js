import { useEffect, useRef, useState } from "react";

export default function useMobileFabVisibility(isMobile) {
  const [fabVisible, setFabVisible] = useState(true);

  const scrollTimeoutRef = useRef(null);
  const isTouchingRef = useRef(false);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!isMobile) return undefined;

    const handleScroll = () => {
      setFabVisible(false);
      hasScrolledRef.current = true;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        if (!isTouchingRef.current) {
          setFabVisible(true);
        }
      }, 150);
    };

    const handleTouchStart = () => {
      isTouchingRef.current = true;
      hasScrolledRef.current = false;
    };

    const handleTouchEnd = () => {
      isTouchingRef.current = false;
      if (hasScrolledRef.current) {
        setFabVisible(true);
        hasScrolledRef.current = false;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isMobile]);

  return fabVisible;
}

