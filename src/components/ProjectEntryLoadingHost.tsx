"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import WorkspaceLaunchLoadingState from "@/components/WorkspaceLaunchLoadingState";
import type { PendingWorkspaceFile } from "@/components/useWorkspaceFilePreloader";
import {
  getProjectEntryLoadingCopy,
  PROJECT_ENTRY_EXIT_MS,
  PROJECT_ENTRY_LOADING_MAX_HOLD_MS,
  type ProjectEntryLoadingContext,
} from "@/lib/projectEntryLoading";
import { clearWorkspaceOpenHandoffStorage } from "@/lib/workspaceOpenHandoff";
import { logDevTiming } from "@/lib/devTiming";

function debugProjectEntry(event: string, detail: Record<string, unknown>) {
  logDevTiming("project-entry", event, detail);
}

function clearProjectEntrySessionState() {
  clearWorkspaceOpenHandoffStorage();
}

type ProjectEntryHostState = {
  context: ProjectEntryLoadingContext;
  files: PendingWorkspaceFile[];
  startedAtMs: number | null;
  initialProgress: number | null;
  complete: boolean;
  source: "event" | "route";
  routeKey: string | null;
};

function readRouteEntryState(
  pathname: string | null,
  searchParams: { get(name: string): string | null; toString(): string } | null,
) {
  if (!pathname?.startsWith("/studio")) return null;
  const projectId = searchParams?.get("project") ?? null;
  if (!projectId) return null;
  return {
    context: "studio" as const,
    files: [],
    startedAtMs: null,
    initialProgress: null,
    complete: false,
    source: "route" as const,
    routeKey: pathname + "?" + (searchParams?.toString() ?? ""),
  };
}

export default function ProjectEntryLoadingHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeState = useMemo(() => readRouteEntryState(pathname, searchParams), [pathname, searchParams]);
  const routeKey = routeState?.routeKey ?? null;
  const [state, setState] = useState<ProjectEntryHostState | null>(() => routeState);
  const [consumedRouteKey, setConsumedRouteKey] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const autoDismissTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const entryStartedAtRef = useRef<number | null>(null);
  const hasEnteredStudioRef = useRef(pathname?.startsWith("/studio") ?? false);

  const activeState = state ?? (routeState && routeState.routeKey !== consumedRouteKey ? routeState : null);
  const loadingCopy = activeState ? getProjectEntryLoadingCopy(activeState.context, activeState.files.length) : null;

  const dismissEntry = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      clearProjectEntrySessionState();
      setConsumedRouteKey(routeKey);
      setState(null);
      setExiting(false);
      exitTimerRef.current = null;
    }, PROJECT_ENTRY_EXIT_MS);
  }, [exiting, routeKey]);

  useEffect(() => {
    if (autoDismissTimerRef.current !== null) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (!activeState || activeState.complete || exiting) return;
    autoDismissTimerRef.current = window.setTimeout(() => {
      debugProjectEntry("timeout", { routeKey, maxHoldMs: PROJECT_ENTRY_LOADING_MAX_HOLD_MS });
      dismissEntry();
      autoDismissTimerRef.current = null;
    }, PROJECT_ENTRY_LOADING_MAX_HOLD_MS);
    return () => {
      if (autoDismissTimerRef.current !== null) {
        window.clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeState, dismissEntry, exiting, routeKey]);

  useEffect(() => {
    const prepareForEntry = () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExiting(false);
    };

    const handleLaunch = (event: Event) => {
      const detail = (event as CustomEvent<{ files?: PendingWorkspaceFile[]; startedAtMs?: number | null }>).detail;
      entryStartedAtRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
      debugProjectEntry("show", { context: "new-project", source: "event" });
      prepareForEntry();
      setConsumedRouteKey(null);
      setState({
        context: "new-project",
        files: Array.isArray(detail?.files) ? detail.files : [],
        startedAtMs: typeof detail?.startedAtMs === "number" ? detail.startedAtMs : Date.now(),
        initialProgress: null,
        complete: false,
        source: "event",
        routeKey: null,
      });
    };

    const handleExisting = (event: Event) => {
      const detail = (event as CustomEvent<{ startedAtMs?: number | null }>).detail;
      entryStartedAtRef.current = typeof performance !== "undefined" ? performance.now() : Date.now();
      debugProjectEntry("show", { context: "existing-project", source: "event" });
      prepareForEntry();
      setConsumedRouteKey(null);
      setState({
        context: "existing-project",
        files: [],
        startedAtMs: typeof detail?.startedAtMs === "number" ? detail.startedAtMs : Date.now(),
        initialProgress: null,
        complete: false,
        source: "event",
        routeKey: null,
      });
    };

    const handleReady = () => {
      const startedAt = entryStartedAtRef.current;
      debugProjectEntry("ready", {
        elapsedMs: startedAt !== null ? Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt) : null,
        routeKey,
      });
      setState((current) => {
        if (current) return { ...current, complete: true };
        return routeState ? { ...routeState, complete: true } : null;
      });
    };

    const handleHide = () => {
      const startedAt = entryStartedAtRef.current;
      debugProjectEntry("hide", {
        elapsedMs: startedAt !== null ? Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt) : null,
        routeKey,
      });
      clearProjectEntrySessionState();
      setConsumedRouteKey(routeKey);
      setState(null);
      setExiting(false);
    };

    window.addEventListener("workspace-launch-overlay-show", handleLaunch as EventListener);
    window.addEventListener("workspace-existing-overlay-show", handleExisting as EventListener);
    window.addEventListener("workspace-content-ready", handleReady);
    window.addEventListener("workspace-launch-overlay-hide", handleHide);

    return () => {
      window.removeEventListener("workspace-launch-overlay-show", handleLaunch as EventListener);
      window.removeEventListener("workspace-existing-overlay-show", handleExisting as EventListener);
      window.removeEventListener("workspace-content-ready", handleReady);
      window.removeEventListener("workspace-launch-overlay-hide", handleHide);
    };
  }, [routeKey, routeState]);

  useEffect(() => {
    const isStudioRoute = pathname?.startsWith("/studio") ?? false;
    if (isStudioRoute) {
      hasEnteredStudioRef.current = true;
      return;
    }
    if (!hasEnteredStudioRef.current) return;

    hasEnteredStudioRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      clearProjectEntrySessionState();
      setConsumedRouteKey(null);
      setState(null);
      setExiting(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  if (!activeState || !loadingCopy) return null;

  return (
    <div
      className={`fixed inset-0 z-[1295] transition-opacity ease-out motion-reduce:transition-none ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${PROJECT_ENTRY_EXIT_MS}ms` }}
    >
      <div className="absolute inset-0 bg-[var(--app-surface)]" />
      <div className="relative min-h-screen">
        <WorkspaceLaunchLoadingState
          files={activeState.files}
          complete={activeState.complete}
          startedAtMs={activeState.startedAtMs}
          initialProgress={activeState.initialProgress}
          title={loadingCopy.title}
          subtitle={loadingCopy.subtitle}
          presentation={activeState.context === "new-project" ? "progress" : "spinner"}
          onCompleteVisualReady={dismissEntry}
        />
      </div>
    </div>
  );
}
