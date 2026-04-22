"use client";

import { useViewportRowCount } from "./useViewportRowCount";

const TASK_AND_REQUEST_BREAKPOINTS = [
  { minHeight: 1080, count: 4 },
  { minHeight: 1000, count: 4 },
  { minHeight: 920, count: 4 },
  { minHeight: 860, count: 3 },
  { minHeight: 800, count: 3 },
  { minHeight: 740, count: 2 },
  { minHeight: 0, count: 2 },
];

export function useVisibleSignatureRows(reservedBottomSpace = 16) {
  return useViewportRowCount(TASK_AND_REQUEST_BREAKPOINTS, 4, reservedBottomSpace);
}
