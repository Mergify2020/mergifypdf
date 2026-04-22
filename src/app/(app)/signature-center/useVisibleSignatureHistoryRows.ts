"use client";

import { useViewportRowCount } from "./useViewportRowCount";

const HISTORY_BREAKPOINTS = [
  { minHeight: 960, count: 10 },
  { minHeight: 880, count: 9 },
  { minHeight: 820, count: 8 },
  { minHeight: 760, count: 7 },
  { minHeight: 700, count: 6 },
  { minHeight: 640, count: 5 },
  { minHeight: 0, count: 4 },
];

export function useVisibleSignatureHistoryRows() {
  return useViewportRowCount(HISTORY_BREAKPOINTS, 10);
}
