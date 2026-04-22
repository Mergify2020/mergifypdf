"use client";

import { useEffect, useState } from "react";

type RowBreakpoint = {
  minHeight: number;
  count: number;
};

export function useViewportRowCount(
  breakpoints: RowBreakpoint[],
  fallbackCount: number,
  reservedBottomSpace = 0,
) {
  const [visibleRowCount, setVisibleRowCount] = useState(fallbackCount);

  useEffect(() => {
    function updateVisibleRowCount() {
      const viewportHeight = window.innerHeight - reservedBottomSpace;
      const matchedBreakpoint = breakpoints.find((breakpoint) => viewportHeight >= breakpoint.minHeight);
      setVisibleRowCount(matchedBreakpoint?.count ?? fallbackCount);
    }

    updateVisibleRowCount();
    window.addEventListener("resize", updateVisibleRowCount);

    return () => {
      window.removeEventListener("resize", updateVisibleRowCount);
    };
  }, [breakpoints, fallbackCount, reservedBottomSpace]);

  return visibleRowCount;
}
