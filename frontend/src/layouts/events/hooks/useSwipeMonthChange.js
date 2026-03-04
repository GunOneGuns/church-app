import { useEffect, useRef } from "react";

export default function useSwipeMonthChange({
  enabled,
  calendarRef,
  onChangeMonth,
  threshold,
}) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndX = useRef(null);
  const isSwipingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const calendarElement = calendarRef?.current;
    if (!calendarElement) return undefined;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchEndX.current = touch.clientX;
      isSwipingRef.current = false;
    };

    const handleTouchMove = (e) => {
      if (touchStartX.current === null) return;
      const touch = e.touches[0];
      touchEndX.current = touch.clientX;
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwipingRef.current = true;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartX.current === null || touchEndX.current === null) return;
      const deltaX = touchEndX.current - touchStartX.current;

      if (Math.abs(deltaX) > threshold && isSwipingRef.current) {
        if (deltaX > 0) onChangeMonth?.(-1);
        else onChangeMonth?.(1);
      }

      setTimeout(() => {
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        isSwipingRef.current = false;
      }, 50);
    };

    calendarElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    calendarElement.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    calendarElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      calendarElement.removeEventListener("touchstart", handleTouchStart);
      calendarElement.removeEventListener("touchmove", handleTouchMove);
      calendarElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [calendarRef, enabled, onChangeMonth, threshold]);

  return { isSwipingRef };
}

