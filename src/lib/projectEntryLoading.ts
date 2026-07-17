export const PROJECT_ENTRY_PROGRESS_INITIAL_STEP_MS = 700;
export const PROJECT_ENTRY_PROGRESS_SECOND_STEP_MS = 1800;
export const PROJECT_ENTRY_PROGRESS_PRE_COMPLETE_MAX = 0.82;
export const PROJECT_ENTRY_PROGRESS_COMPLETE_HOLD_MS = 90;
export const PROJECT_ENTRY_ELLIPSIS_INTERVAL_MS = 420;
export const PROJECT_ENTRY_PROGRESS_FIRST_SEGMENT = 0.32;
export const PROJECT_ENTRY_PROGRESS_SECOND_SEGMENT = 0.38;
export const PROJECT_ENTRY_PROGRESS_TAIL_BASE = 0.7;
export const PROJECT_ENTRY_PROGRESS_TAIL_MAX = 0.12;
export const PROJECT_ENTRY_PROGRESS_COMPLETE_EASE_MS = 360;
export const PROJECT_ENTRY_LOADING_MAX_HOLD_MS = 12000;
export const PROJECT_ENTRY_MIN_VISIBLE_MS = 320;
export const PROJECT_ENTRY_EXIT_MS = 160;

export type ProjectEntryLoadingContext = "studio" | "existing-project" | "new-project";

export type ProjectEntryLoadingCopy = {
  title: string;
  subtitle: string;
};

export function getProjectEntryLoadingCopy(context: ProjectEntryLoadingContext, fileCount = 0): ProjectEntryLoadingCopy {
  switch (context) {
    case "new-project":
      return {
        title: "Preparing your workspace",
        subtitle: fileCount > 0 ? "Combining pages..." : "Loading editor...",
      };
    case "existing-project":
    case "studio":
    default:
      return {
        title: "Opening project",
        subtitle: "Loading editor...",
      };
  }
}
