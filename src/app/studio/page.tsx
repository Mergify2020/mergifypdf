"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  SVGProps,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  PDFDocument,
  rgb,
  LineCapStyle,
  degrees,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import { AnimatePresence, motion } from "framer-motion";
import {
  Highlighter,
  Minus,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Shapes,
  MousePointer2,
	  ArrowRight,
	  Check,
	  Circle,
	  Triangle,
	  Square,
	  Eraser,
	  Pencil,
	  PencilLine,
	  RotateCcw,
	  Move,
	  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  MoreHorizontal,
	  Copy,
	  ListOrdered,
	  Signature as SignatureIcon,
	  UploadCloud,
  X,
  Mail,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import WorkspaceSettingsMenu from "@/components/WorkspaceSettingsMenu";
import LoadingOverlay from "@/components/LoadingOverlay";
import { addRecentProject } from "@/lib/recentProjects";
import { PROJECT_NAME_STORAGE_KEY, projectNameToFile, sanitizeProjectName } from "@/lib/projectName";
import { PENDING_UPLOAD_STORAGE_KEY } from "@/lib/pendingUpload";

type SourceRef = { storageId: string; url: string; name: string; size: number; updatedAt: number };
type PageItem = {
  id: string;
  srcIdx: number; // which source file
  pageIdx: number; // page index inside that source
  thumb: string; // small preview
  preview: string; // large preview
  rotation: number;
  width: number;
  height: number;
};
type Point = { x: number; y: number; move?: boolean };
type DrawingTool = "highlight" | "pen" | "pencil" | "text";
type HeaderMode = "default" | "pen" | "highlight" | "shapes";
type ShapeType = "line" | "arrow" | "check" | "x" | "rect" | "ellipse" | "triangle";
type ShapeAnnotation = {
  id: string;
  type: ShapeType;
  pageId: string;
  start: Point;
  end: Point;
  color: string;
  thickness: number;
};
type HighlightStroke = {
  id: string;
  tool: DrawingTool;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
};
type DraftHighlight = {
  tool: Exclude<DrawingTool, "text">;
  pageId: string;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
};
type HighlightHistoryEntry =
  | { type: "add"; pageId: string; highlight: HighlightStroke }
  | { type: "delete"; pageId: string; highlight: HighlightStroke }
  | { type: "addShape"; pageId: string; shape: ShapeAnnotation }
  | { type: "deleteShape"; pageId: string; shape: ShapeAnnotation }
  | {
      type: "clear";
      previous: {
        highlights: Record<string, HighlightStroke[]>;
        shapes: Record<string, ShapeAnnotation[]>;
        textAnnotations: Record<string, TextAnnotation[]>;
      };
    };

type Project = {
  id: string;
  name: string;
  data: any;
  createdAt: string;
  updatedAt: string;
};

type TextAnnotation = {
  id: string;
  pageId: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  rotation?: number;
};
type TextFont =
  | "Inter"
  | "Arial"
  | "Roboto"
  | "Times New Roman"
  | "Courier New"
  | "Georgia"
  | "Poppins";
type TextFontVariant = "normal" | "bold" | "italic" | "boldItalic";
type SignaturePanelMode = "none" | "draw" | "upload" | "saved";
type SavedSignature = {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
};
type SignaturePlacement = {
  id: string;
  signatureId: string;
  name: string;
  dataUrl: string;
  pageId: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  status: "draft" | "placed";
};

type CloudProject = {
  id: string;
  name: string;
  data: unknown;
  createdAt?: string | number;
  updatedAt?: string | number;
  previewUrl?: string | null;
  pagesCount?: number | null;
};

const TYPED_SIGNATURE_STYLES = [
  { id: "script", label: "Script", fontFamily: "'Segoe Script', 'Comic Sans MS', cursive" },
  { id: "classic", label: "Classic", fontFamily: "'Georgia', 'Times New Roman', serif" },
  { id: "minimal", label: "Minimal", fontFamily: "'Inter', 'Helvetica', sans-serif" },
  { id: "marker", label: "Marker", fontFamily: "'Poppins', 'Arial', sans-serif" },
] as const;

type FontOption =
  | {
      label: string;
      cssFamily: string;
      pdf: { type: "standard"; variants: Record<TextFontVariant, StandardFonts> };
    }
  | {
      label: string;
      cssFamily: string;
      pdf: {
        type: "custom";
        variants: Record<TextFontVariant, string>;
        fallback: StandardFonts;
      };
    };

const TEXT_FONT_OPTIONS: Record<TextFont, FontOption> = {
  Inter: {
    label: "Inter",
    cssFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Inter-Regular.ttf",
        bold: "/fonts/Inter-Bold.ttf",
        italic: "/fonts/Inter-Italic.ttf",
        boldItalic: "/fonts/Inter-BoldItalic.ttf",
      },
      fallback: StandardFonts.Helvetica,
    },
  },
  Arial: {
    label: "Arial",
    cssFamily: "'Arimo', 'Arial', 'Helvetica Neue', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Arimo-Regular.ttf",
        bold: "/fonts/Arimo-Bold.ttf",
        italic: "/fonts/Arimo-Italic.ttf",
        boldItalic: "/fonts/Arimo-BoldItalic.ttf",
      },
      fallback: StandardFonts.Helvetica,
    },
  },
  Roboto: {
    label: "Roboto",
    cssFamily: "'Roboto', 'Arial', 'Helvetica Neue', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Roboto-Regular.ttf",
        bold: "/fonts/Roboto-Bold.ttf",
        italic: "/fonts/Roboto-Italic.ttf",
        boldItalic: "/fonts/Roboto-BoldItalic.ttf",
      },
      fallback: StandardFonts.Helvetica,
    },
  },
  Poppins: {
    label: "Poppins",
    cssFamily: "'Poppins', 'Helvetica Neue', 'Arial', sans-serif",
    pdf: {
      type: "custom",
      variants: {
        normal: "/fonts/Poppins-Regular.ttf",
        bold: "/fonts/Poppins-Bold.ttf",
        italic: "/fonts/Poppins-Italic.ttf",
        boldItalic: "/fonts/Poppins-BoldItalic.ttf",
      },
      fallback: StandardFonts.Helvetica,
    },
  },
  "Times New Roman": {
    label: "Times New Roman",
    cssFamily: "'Times New Roman', Times, serif",
    pdf: {
      type: "standard",
      variants: {
        normal: StandardFonts.TimesRoman,
        bold: StandardFonts.TimesRomanBold,
        italic: StandardFonts.TimesRomanItalic,
        boldItalic: StandardFonts.TimesRomanBoldItalic,
      },
    },
  },
  "Courier New": {
    label: "Courier New",
    cssFamily: "'Courier New', 'SFMono-Regular', Consolas, monospace",
    pdf: {
      type: "standard",
      variants: {
        normal: StandardFonts.Courier,
        bold: StandardFonts.CourierBold,
        italic: StandardFonts.CourierOblique,
        boldItalic: StandardFonts.CourierBoldOblique,
      },
    },
  },
  Georgia: {
    label: "Georgia",
    cssFamily: "'Georgia', 'Times New Roman', serif",
    pdf: {
      type: "standard",
      variants: {
        normal: StandardFonts.TimesRoman,
        bold: StandardFonts.TimesRomanBold,
        italic: StandardFonts.TimesRomanItalic,
        boldItalic: StandardFonts.TimesRomanBoldItalic,
      },
    },
  },
};

const HIGHLIGHT_COLORS = {
  yellow: "#fff266",
  green: "#b7ff9a",
  blue: "#9ad9ff",
  pink: "#ffc5f1",
} as const;
const PEN_COLOR = "#111827";

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

  const HIGHLIGHT_CURSOR =
    "data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 24 L24 2 L30 8 L10 28 L3 29 Z' fill='%23024d7c'/%3E%3Crect x='5' y='25' width='10' height='3' fill='%23ffd43b'/%3E%3C/svg%3E";
// Render PDF pages at a higher base scale so
// previews stay razor sharp even when downscaled
// into small project cards and slideshows.
const PREVIEW_BASE_SCALE = 4;
const MAX_DEVICE_PIXEL_RATIO = 4;
const TEXT_PLACEHOLDER = "Type here";
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.98;
const WORKSPACE_SESSION_KEY = "mpdf:files";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const WORKSPACE_SIGNATURES_KEY = "mpdf:signatures";
const DEFAULT_ASPECT_RATIO = 792 / 612; // fallback letter portrait
const SOFT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const ZOOM_MIN_PERCENT = 50;
const ZOOM_MAX_PERCENT = 300;
const ZOOM_STEP_PERCENT = 25;
const MAX_ZOOM_MULTIPLIER = ZOOM_MAX_PERCENT / 100;
const VIEW_TRANSITION = { duration: 0.2, ease: SOFT_EASE };
const GRID_VARIANTS = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: SOFT_EASE, staggerChildren: 0.05, delayChildren: 0.02 },
  },
};
const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function toCardPreviewDataUrl(canvas: HTMLCanvasElement) {
  try {
    const webp = canvas.toDataURL("image/webp", PREVIEW_IMAGE_QUALITY);
    if (webp.startsWith("data:image/webp")) return webp;
  } catch {
  }
  return canvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);
}

type StoredSourceMeta = { id: string; name?: string; size?: number; updatedAt?: number };
type FileStoreEntry = { blob: Blob; name?: string; size?: number; updatedAt: number };

let fileStorePromise: Promise<IDBDatabase> | null = null;

function getFileStore(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }
  if (!fileStorePromise) {
    fileStorePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(WORKSPACE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACE_DB_STORE)) {
          db.createObjectStore(WORKSPACE_DB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }
  return fileStorePromise;
}

async function storeFileBlob(id: string, file: Blob, name: string, size: number) {
  const db = await getFileStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(WORKSPACE_DB_STORE).put({ blob: file, name, size, updatedAt: Date.now() }, id);
  });
}

async function readFileBlob(id: string): Promise<FileStoreEntry | null> {
  const db = await getFileStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_DB_STORE, "readonly");
    const request = tx.objectStore(WORKSPACE_DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (err) {
    console.error("LocalStorage unavailable", err);
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch (err) {
    console.error("SessionStorage unavailable", err);
    return null;
  }
}

function workspaceFilesKey(projectId: string | null) {
  return projectId ? `${WORKSPACE_SESSION_KEY}:${projectId}` : WORKSPACE_SESSION_KEY;
}

function persistSourceMetadata(list: SourceRef[], projectId: string | null) {
  const storage = getLocalStorage();
  if (!storage) return;
  const key = workspaceFilesKey(projectId);
  if (list.length === 0) {
    storage.removeItem(key);
    return;
  }
  const payload = list.map(({ storageId, name, size, updatedAt }) => ({
    id: storageId,
    name,
    size,
    updatedAt,
  }));
  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to persist workspace metadata", err);
  }
}

function dataURLToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
  const binary = atob(data);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    u8[i] = binary.charCodeAt(i);
  }
  return new Blob([u8], { type: mime });
}

function buildPageId(sourceId: string, pageIdx: number) {
  return `${sourceId}::${pageIdx}`;
}

function getDevicePixelRatio() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio ? Math.min(window.devicePixelRatio, MAX_DEVICE_PIXEL_RATIO) : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function useProjects() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectParam = typeof window !== "undefined" ? searchParams.get("project") : null;
  const initialProjectId = projectParam;
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!projectParam) return;
    setCurrentProjectId((prev) => (prev === projectParam ? prev : projectParam));
  }, [projectParam]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      setLoadingProjects(true);
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: CloudProject[] };
        if (!cancelled && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      } catch {
        // ignore network errors
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProject = useCallback(
    async (name: string, data: unknown): Promise<CloudProject | null> => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;
      setSavingProject(true);
      try {
        const payload = { name: trimmedName, data };
        if (currentProjectId) {
          const res = await fetch(`/api/projects/${currentProjectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) return null;
          const json = (await res.json().catch(() => null)) as { project?: CloudProject } | null;
          const updated =
            json?.project ??
            ({
              id: currentProjectId,
              name: trimmedName,
              data,
              updatedAt: Date.now(),
            } as CloudProject);
          setProjects((prev) =>
            prev.map((project) => (project.id === updated.id ? { ...project, ...updated } : project))
          );
          return updated;
        } else {
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) return null;
          const json = (await res.json().catch(() => null)) as { project?: CloudProject } | null;
          const created =
            json?.project ??
            ({
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `${Date.now()}`,
              name: trimmedName,
              data,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as CloudProject);
          setProjects((prev) => [created, ...prev]);
          setCurrentProjectId(created.id);
          router.replace(`/studio?project=${encodeURIComponent(created.id)}`);
          return created;
        }
      } catch {
        // ignore network errors
      } finally {
        setSavingProject(false);
      }
      return null;
    },
    [currentProjectId, router]
  );

  return {
    projects,
    currentProjectId,
    loadingProjects,
    savingProject,
    saveProject,
    setCurrentProjectId,
  };
}

function pointDistance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cloneStroke(stroke: HighlightStroke): HighlightStroke {
  return {
    ...stroke,
    points: stroke.points.map((pt) => ({ ...pt })),
  };
}

function cloneHighlightMap(map: Record<string, HighlightStroke[]>): Record<string, HighlightStroke[]> {
  return Object.fromEntries(
    Object.entries(map).map(([pageId, list]) => [pageId, list.map((stroke) => cloneStroke(stroke))])
  );
}

function cloneShapeMap(map: Record<string, ShapeAnnotation[]>): Record<string, ShapeAnnotation[]> {
  return Object.fromEntries(
    Object.entries(map).map(([pageId, list]) => [
      pageId,
      list.map((shape) => ({
        ...shape,
        start: { ...shape.start },
        end: { ...shape.end },
      })),
    ])
  );
}

function cloneTextAnnotationMap(map: Record<string, TextAnnotation[]>): Record<string, TextAnnotation[]> {
  return Object.fromEntries(
    Object.entries(map).map(([pageId, list]) => [pageId, list.map((annotation) => ({ ...annotation }))])
  );
}

function createThumbnailDataUrl(canvas: HTMLCanvasElement) {
  if (canvas.width <= THUMB_MAX_WIDTH) {
    return toCardPreviewDataUrl(canvas);
  }
  const ratio = THUMB_MAX_WIDTH / canvas.width;
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = THUMB_MAX_WIDTH;
  thumbCanvas.height = Math.floor(canvas.height * ratio);
  const thumbCtx = thumbCanvas.getContext("2d")!;
  thumbCtx.imageSmoothingEnabled = true;
  thumbCtx.imageSmoothingQuality = "high";
  thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return toCardPreviewDataUrl(thumbCanvas);
}

function getAspectPadding(width?: number, height?: number) {
  if (!width || !height || width === 0) {
    return `${DEFAULT_ASPECT_RATIO * 100}%`;
  }
  return `${(height / width) * 100}%`;
}

function normalizeRotation(rotation?: number) {
  const value = rotation ?? 0;
  return ((value % 360) + 360) % 360;
}

function smoothStrokePoints(points: Point[], tool: Exclude<DrawingTool, "text">): Point[] {
  if (points.length < 3) return points;
  const baseIterations = 1;
  const iterations = points.length > 180 ? 1 : baseIterations;

  const segments: Point[][] = [];
  let currentSegment: Point[] = [];
  points.forEach((pt, idx) => {
    if (idx === 0 || pt.move) {
      if (currentSegment.length > 0) segments.push(currentSegment);
      currentSegment = [{ x: pt.x, y: pt.y }];
      return;
    }
    currentSegment.push({ x: pt.x, y: pt.y });
  });
  if (currentSegment.length > 0) segments.push(currentSegment);

  const smoothSegment = (segment: Point[]) => {
    if (segment.length < 3) return segment;
    let current = segment;
    for (let it = 0; it < iterations; it++) {
      const next: Point[] = [current[0]];
      for (let i = 0; i < current.length - 1; i++) {
        const p0 = current[i];
        const p1 = current[i + 1];
        next.push(
          { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y },
          { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y }
        );
      }
      next.push(current[current.length - 1]);
      current = next;
    }
    return current;
  };

  const smoothedSegments = segments.map(smoothSegment);
  const result: Point[] = [];
  smoothedSegments.forEach((segment, idx) => {
    segment.forEach((pt, ptIdx) => {
      result.push({ ...pt, move: idx > 0 && ptIdx === 0 ? true : undefined });
    });
  });
  return result;
}

function snapHighlightSegments(points: Point[]) {
  if (points.length < 3) return points;
  const result: Point[] = [];
  let segment: Point[] = [];
  const flush = () => {
    if (segment.length === 0) return;
    const xs = segment.map((p) => p.x);
    const ys = segment.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const dx = maxX - minX;
    const dy = maxY - minY;
    if (dx > 0.08 && dy < dx * 0.12) {
      const yAvg = ys.reduce((sum, y) => sum + y, 0) / ys.length;
      segment.forEach((p) => result.push({ ...p, y: yAvg }));
    } else {
      segment.forEach((p) => result.push(p));
    }
    segment = [];
  };
  points.forEach((pt, idx) => {
    if (idx === 0 || pt.move) {
      flush();
      segment = [{ ...pt }];
      return;
    }
    segment.push({ ...pt });
  });
  flush();
  return result;
}

function pointsToSvgPath(points: Point[]) {
  if (points.length === 0) return "";
  let d = "";
  points.forEach((pt, idx) => {
    const x = pt.x * 1000;
    const y = pt.y * 1000;
    if (idx === 0 || pt.move) d += `M ${x} ${y} `;
    else d += `L ${x} ${y} `;
  });
  return d.trim();
}

function shapeBounds(shape: Pick<ShapeAnnotation, "start" | "end">) {
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

function shapeToSvgElements(
  shape: Pick<ShapeAnnotation, "type" | "start" | "end">,
  opts: { stroke: string; strokeWidth: number; strokeOpacity?: number; interactiveProps?: SVGProps<SVGElement> }
) {
  const strokeOpacity = opts.strokeOpacity ?? 1;
  const common = {
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    strokeOpacity,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const x1 = shape.start.x * 1000;
  const y1 = shape.start.y * 1000;
  const x2 = shape.end.x * 1000;
  const y2 = shape.end.y * 1000;

  const makeArrowHead = () => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy));
    const headLen = clamp(len * 0.16, 22, 44);
    const angle = Math.atan2(dy, dx);
    const left = angle + (Math.PI * 5) / 6;
    const right = angle - (Math.PI * 5) / 6;
    return {
      lx: x2 + Math.cos(left) * headLen,
      ly: y2 + Math.sin(left) * headLen,
      rx: x2 + Math.cos(right) * headLen,
      ry: y2 + Math.sin(right) * headLen,
    };
  };

  const { minX, minY, w, h } = shapeBounds(shape);
  const minXPx = minX * 1000;
  const minYPx = minY * 1000;
  const wPx = Math.max(1, w * 1000);
  const hPx = Math.max(1, h * 1000);

	switch (shape.type) {
	    case "line":
	      return <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} {...(opts.interactiveProps as any)} />;
	    case "arrow": {
      const head = makeArrowHead();
      return (
        <g {...(opts.interactiveProps as any)}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />
          <line x1={x2} y1={y2} x2={head.lx} y2={head.ly} {...common} />
          <line x1={x2} y1={y2} x2={head.rx} y2={head.ry} {...common} />
        </g>
      );
    }
    case "rect":
      return <rect x={minXPx} y={minYPx} width={wPx} height={hPx} rx={0} {...common} {...(opts.interactiveProps as any)} />;
	    case "ellipse":
	      return (
	        <ellipse
	          cx={minXPx + wPx / 2}
	          cy={minYPx + hPx / 2}
	          rx={wPx / 2}
	          ry={hPx / 2}
	          {...common}
	          {...(opts.interactiveProps as any)}
	        />
	      );
	    case "triangle": {
	      const top = { x: minXPx + wPx / 2, y: minYPx };
	      const left = { x: minXPx, y: minYPx + hPx };
	      const right = { x: minXPx + wPx, y: minYPx + hPx };
	      return (
	        <polygon
	          points={`${top.x},${top.y} ${right.x},${right.y} ${left.x},${left.y}`}
	          {...common}
	          {...(opts.interactiveProps as any)}
	        />
	      );
	    }
	    case "x":
	      return (
	        <g {...(opts.interactiveProps as any)}>
	          <line x1={minXPx} y1={minYPx} x2={minXPx + wPx} y2={minYPx + hPx} {...common} />
          <line x1={minXPx + wPx} y1={minYPx} x2={minXPx} y2={minYPx + hPx} {...common} />
        </g>
      );
    case "check": {
      const p1 = { x: minXPx + wPx * 0.18, y: minYPx + hPx * 0.55 };
      const p2 = { x: minXPx + wPx * 0.42, y: minYPx + hPx * 0.78 };
      const p3 = { x: minXPx + wPx * 0.82, y: minYPx + hPx * 0.26 };
      return (
        <polyline
          points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          {...common}
          {...(opts.interactiveProps as any)}
        />
      );
    }
    default:
      return null;
  }
}

function intersectUnitSquareBoundary(
  from: Point,
  to: Point,
  preferMaxT: boolean
): { x: number; y: number } | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const candidates: Array<{ t: number; x: number; y: number }> = [];

  const pushIfValid = (t: number) => {
    if (!Number.isFinite(t) || t < 0 || t > 1) return;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    if (x < -1e-6 || x > 1 + 1e-6 || y < -1e-6 || y > 1 + 1e-6) return;
    candidates.push({ t, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
  };

  if (dx !== 0) {
    pushIfValid((0 - from.x) / dx);
    pushIfValid((1 - from.x) / dx);
  }
  if (dy !== 0) {
    pushIfValid((0 - from.y) / dy);
    pushIfValid((1 - from.y) / dy);
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (preferMaxT ? b.t - a.t : a.t - b.t));
  return { x: candidates[0].x, y: candidates[0].y };
}


/** One sortable thumbnail tile */
function SortableThumb({
  item,
  index,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  disableMoveDown,
}: {
  item: PageItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disableMoveDown: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "default",
  };
  const rotationDegrees = normalizeRotation(item.rotation);
  const isQuarterTurn = rotationDegrees % 180 !== 0;
  const ratio = item.width && item.height ? item.width / item.height : 1;
  const scaleFix = isQuarterTurn ? Math.min(ratio, 1 / ratio) : 1;

	  return (
	    <li ref={setNodeRef} style={style} className="flex w-full justify-center" {...attributes}>
	      <div
	        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
	        className="group relative w-full max-w-[200px] cursor-pointer select-none"
	        {...listeners}
	      >
	        <div className="relative w-full" style={{ paddingBottom: getAspectPadding(item.width, item.height) }}>
	          <div
		            className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-none border bg-white shadow-[0_8px_18px_rgba(15,23,42,0.10)] transition ${
		              selected
		                ? "border-[3px] border-[#51bdff] shadow-[0_12px_26px_rgba(15,23,42,0.14)]"
		                : "border-slate-200 hover:border-slate-300"
		            }`}
	          >
	            <span
	              className={`absolute left-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-none text-xs font-semibold tabular-nums ${
	                selected ? "bg-[#51bdff] text-slate-900" : "bg-slate-200 text-slate-700"
	              }`}
	            >
	              {index + 1}
	            </span>
	            <div
	              className="z-0 flex h-full w-full items-center justify-center"
	              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
	            >
	              {/* eslint-disable-next-line @next/next/no-img-element */}
	              <img
	                src={item.thumb}
	                alt={`Page ${index + 1}`}
	                className="block h-full w-full object-contain"
	                draggable={false}
	              />
	            </div>
	            <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex justify-center opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
	              <div className="flex items-center gap-1 rounded-md border border-slate-400 bg-white/95 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur">
	                <button
	                  type="button"
	                  onPointerDown={(event) => event.stopPropagation()}
	                  onClick={(event) => {
	                    event.stopPropagation();
	                    onMoveUp();
	                  }}
	                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40"
	                  aria-label="Move page up"
	                  disabled={index === 0}
	                >
	                  <ChevronUp className="h-4 w-4" aria-hidden />
	                </button>
	                <div className="h-6 w-px bg-slate-400" aria-hidden />
	                <button
	                  type="button"
	                  onPointerDown={(event) => event.stopPropagation()}
	                  onClick={(event) => {
	                    event.stopPropagation();
	                    onMoveDown();
	                  }}
	                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40"
	                  aria-label="Move page down"
	                  disabled={disableMoveDown}
	                >
	                  <ChevronDown className="h-4 w-4" aria-hidden />
	                </button>
	                <div className="h-6 w-px bg-slate-400" aria-hidden />
	                <button
	                  type="button"
	                  onPointerDown={(event) => event.stopPropagation()}
	                  onClick={(event) => {
	                    event.stopPropagation();
	                    onDelete();
	                  }}
	                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
	                  aria-label="Delete page"
	                >
	                  <Trash2 className="h-4 w-4" aria-hidden />
	                </button>
	                <div className="h-6 w-px bg-slate-400" aria-hidden />
	                <button
	                  type="button"
	                  onPointerDown={(event) => event.stopPropagation()}
	                  onClick={(event) => {
	                    event.stopPropagation();
	                  }}
	                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
	                  aria-label="More page actions"
	                >
	                  <MoreHorizontal className="h-4 w-4" aria-hidden />
	                </button>
	              </div>
	            </div>
	          </div>
	        </div>
	      </div>
	    </li>
	  );
}

function SortableOrganizeTile({
  item,
  index,
  onRotate,
  onDelete,
  animateIn,
}: {
  item: PageItem;
  index: number;
  onRotate: () => void;
  onDelete: () => void;
  animateIn?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };
  const rotationDegrees = normalizeRotation(item.rotation);
  const isQuarterTurn = rotationDegrees % 180 !== 0;
  const ratio = item.width && item.height ? item.width / item.height : 1;
  const scaleFix = isQuarterTurn ? Math.min(ratio, 1 / ratio) : 1;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className="w-full"
      variants={TILE_VARIANTS}
      initial={animateIn ? "hidden" : false}
      animate={animateIn ? "visible" : false}
      transition={{ duration: 0.2, ease: SOFT_EASE }}
      {...attributes}
      {...listeners}
    >
      {/* Page preview (no rounded corners) */}
      <div className="relative w-full h-[360px] sm:h-[380px] lg:h-[420px]">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden group">
          <div
            className={`h-full w-full transition-transform duration-200 ease-out ${
              isDragging ? "" : "group-hover:scale-[1.02] group-hover:-translate-y-1"
            }`}
          >
            <div
              className={`h-full w-full bg-white border border-[rgba(148,163,184,0.5)] ${
                isDragging
                  ? "shadow-[0_8px_26px_rgba(15,23,42,0.24),_0_24px_60px_rgba(15,23,42,0.30)]"
                  : "shadow-[0_6px_20px_rgba(15,23,42,0.18),_0_18px_45px_rgba(15,23,42,0.22)] group-hover:outline group-hover:outline-[rgba(37,99,235,0.35)] group-hover:outline-1 group-hover:outline-offset-2 group-hover:shadow-[0_6px_20px_rgba(15,23,42,0.21),_0_18px_45px_rgba(15,23,42,0.25)]"
              } transition-shadow duration-200 ease-out`}
              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={`Page ${index + 1}`}
                className="h-full w-full object-contain select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Controls: page number + two circular buttons (no grouped background) */}
      <div className="mt-1">
        <div className="text-center text-sm font-semibold text-slate-800">Page {index + 1}</div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Rotate page"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRotate();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete page"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-600 shadow-[0_4px_14px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function WorkspaceClient() {
  const { data: authSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveProject, savingProject, currentProjectId } = useProjects();
  const projectParam = searchParams.get("project");
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [showDelayOverlay, setShowDelayOverlay] = useState<"intro" | "progress" | null>(null);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageIndexState, setActivePageIndex] = useState(0);
  const [pageNumberDraft, setPageNumberDraft] = useState("");
  const [pageActionMenuId, setPageActionMenuId] = useState<string | null>(null);
		  const [shouldCenterOnChange, setShouldCenterOnChange] = useState(false);
		  const [zoomPercent, setZoomPercent] = useState(100);
		  const [baseScale, setBaseScale] = useState(1);
		  const [userAdjustedZoom, setUserAdjustedZoom] = useState(false);
  const [showPageOrderPanel, setShowPageOrderPanel] = useState(true);
  const pageNavigationLockRef = useRef<{ until: number; targetId: string } | null>(null);
  const scrollRatioRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0 });
  const restoreScrollOnNextZoomRef = useRef(false);
  const [previewHeightLimit, setPreviewHeightLimit] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [highlightOpacity, setHighlightOpacity] = useState(0.35);
  const [penMode, setPenMode] = useState(false);
  const [penThickness, setPenThickness] = useState(3);
  const [penColor, setPenColor] = useState(PEN_COLOR);
  const [selectMode, setSelectMode] = useState(true);
  const [shapeMode, setShapeMode] = useState(false);
  const [shapeType, setShapeType] = useState<ShapeType>("arrow");
  const [shapeThickness, setShapeThickness] = useState(3);
  const [shapeColor, setShapeColor] = useState(PEN_COLOR);
  const [headerMode, setHeaderMode] = useState<HeaderMode>("default");
  const [toolbarPreviewMode, setToolbarPreviewMode] = useState<Exclude<HeaderMode, "default"> | null>(null);
  const toolPreviewTimerRef = useRef<number | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [signaturePanelMode, setSignaturePanelMode] = useState<SignaturePanelMode>("none");
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [signatureNameError, setSignatureNameError] = useState<string | null>(null);
  const [pendingSignatureForPlacement, setPendingSignatureForPlacement] = useState<SavedSignature | null>(null);
  const [signaturePlacements, setSignaturePlacements] = useState<Record<string, SignaturePlacement[]>>({});
  const [activeSignaturePlacementId, setActiveSignaturePlacementId] = useState<string | null>(null);
  const [signatureDrag, setSignatureDrag] = useState<{
    pageId: string;
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [signatureResize, setSignatureResize] = useState<{
    pageId: string;
    id: string;
    pointerId: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [signatureRotate, setSignatureRotate] = useState<{
    pageId: string;
    id: string;
    pointerId: number;
    centerX: number;
    centerY: number;
    baseRotation: number;
  } | null>(null);
  const [showSignatureHub, setShowSignatureHub] = useState(false);
  const [signatureHubStep, setSignatureHubStep] = useState<"gallery" | "type" | "draw" | "upload" | "qr" | "email">(
    "gallery"
  );
  const [typeSignatureText, setTypeSignatureText] = useState("");
  const [typeSignatureStyle, setTypeSignatureStyle] = useState<(typeof TYPED_SIGNATURE_STYLES)[number]["id"]>(
    TYPED_SIGNATURE_STYLES[0].id
  );
  const [typedSignaturePreview, setTypedSignaturePreview] = useState<string | null>(null);
  const [typedSignatureError, setTypedSignatureError] = useState<string | null>(null);
  const [mobileEmail, setMobileEmail] = useState("");
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);
  const [mobileSessionUrl, setMobileSessionUrl] = useState<string | null>(null);
  const [mobileSessionStatus, setMobileSessionStatus] = useState<"idle" | "waiting" | "received" | "error">("idle");
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [drawStep, setDrawStep] = useState<"canvas" | "name">("canvas");
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawLastPointRef = useRef<Point | null>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [drawnSignatureData, setDrawnSignatureData] = useState<string | null>(null);
  const [drawSignatureName, setDrawSignatureName] = useState("");
  const [drawSignatureError, setDrawSignatureError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, HighlightStroke[]>>({});
  const [textAnnotations, setTextAnnotations] = useState<Record<string, TextAnnotation[]>>({});
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textFont, setTextFont] = useState<TextFont>("Inter");
  const [textSize, setTextSize] = useState(12);
  const [highlightHistory, setHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [redoHighlightHistory, setRedoHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [shapesByPage, setShapesByPage] = useState<Record<string, ShapeAnnotation[]>>({});
  const [draftShape, setDraftShape] = useState<{
    pageId: string;
    type: ShapeType;
    start: Point;
    end: Point;
    color: string;
    thickness: number;
  } | null>(null);
  const [draftHighlight, setDraftHighlight] = useState<DraftHighlight | null>(null);
  const strokeOutsidePageRef = useRef(false);
  const lastOutsideRawRef = useRef<{ x: number; y: number } | null>(null);
  const [draggingText, setDraggingText] = useState<{
    pageId: string;
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const textDragCleanupRef = useRef<(() => void) | null>(null);
  const [rotatingText, setRotatingText] = useState<{
    pageId: string;
    id: string;
    pointerId: number;
  } | null>(null);
  const textRotateCleanupRef = useRef<(() => void) | null>(null);
  const [resizingText, setResizingText] = useState<{
    pageId: string;
    id: string;
    startWidth: number;
    startHeight: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const textResizeCleanupRef = useRef<(() => void) | null>(null);
  const [draftTextBox, setDraftTextBox] = useState<{
    pageId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement | null>(null);
  const [focusedTextId, setFocusedTextId] = useState<string | null>(null);
  const focusedTextIdRef = useRef<string | null>(null);
  const textNodeRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const textAnnotationRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const customFontBytesRef = useRef<Map<string, Uint8Array>>(new Map());
  const pdfFontCacheRef = useRef<Map<string, PDFFont>>(new Map());
  const fontkitModuleRef = useRef<null | { default?: unknown }>(null);
  const hasHydratedCloudAnnotationsRef = useRef(false);

  function resolveFontVariant(bold: boolean, italic: boolean): TextFontVariant {
    if (bold && italic) return "boldItalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  }

  function focusTextAnnotation(id: string) {
    setFocusedTextId(id);
    const node = textNodeRefs.current.get(id);
    if (node) {
      node.focus();
    }
  }

  const clearTextFocus = useCallback(() => {
    const activeId = focusedTextIdRef.current;
    if (!activeId) return;
    const node = textNodeRefs.current.get(activeId);
    node?.blur();
    setFocusedTextId(null);
  }, []);

  const startTextDrag = useCallback(
    (
      pageId: string,
      annotationId: string,
      startEvent: ReactPointerEvent<HTMLButtonElement> | ReactPointerEvent<HTMLDivElement>
    ) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();

      const annotation = textAnnotations[pageId]?.find((a) => a.id === annotationId);
      if (!annotation) return;
      const startPoint = getPageNormalizedPoint(pageId, startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;

      textDragCleanupRef.current?.();

      const offsetX = startPoint.x - annotation.x;
      const offsetY = startPoint.y - annotation.y;

      const pointerId = startEvent.pointerId;

      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        setTextAnnotations((prev) => {
          const existing = prev[pageId] ?? [];
          const active = existing.find((a) => a.id === annotationId);
          const width = active?.width ?? 0;
          const height = active?.height ?? 0;
          const nextX = clamp(point.x - offsetX, 0, 1 - width);
          const nextY = clamp(point.y - offsetY, 0, 1 - height);
          const updated = existing.map((item) =>
            item.id === annotationId ? { ...item, x: nextX, y: nextY } : item
          );
          return { ...prev, [pageId]: updated };
        });
      };

      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        textDragCleanupRef.current = null;
      }

      function handleUp() {
        setDraggingText(null);
        cleanup();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);

      textDragCleanupRef.current = cleanup;
      setDraggingText({ pageId, id: annotationId, offsetX, offsetY });
    },
    [getPageNormalizedPoint, textAnnotations]
  );

  const startTextResize = useCallback(
    (
      pageId: string,
      annotationId: string,
      startEvent: ReactPointerEvent<HTMLDivElement>
    ) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const annotation = textAnnotations[pageId]?.find((a) => a.id === annotationId);
      if (!annotation) return;
      const startPoint = getPageNormalizedPoint(pageId, startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;
      const pointerId = startEvent.pointerId;

      textResizeCleanupRef.current?.();
      const startWidth = annotation.width ?? 0.14;
      const startHeight = annotation.height ?? 0.06;
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        setTextAnnotations((prev) => {
          const existing = prev[pageId] ?? [];
          const current = existing.find((a) => a.id === annotationId);
          if (!current) return prev;
          const deltaX = point.x - startPoint.x;
          const deltaY = point.y - startPoint.y;
          const nextWidth = clamp(startWidth + deltaX, 0.04, 1 - current.x);
          const nextHeight = clamp(startHeight + deltaY, 0.03, 1 - current.y);
          const updated = existing.map((item) =>
            item.id === annotationId
              ? { ...item, width: nextWidth, height: nextHeight }
              : item
          );
          return { ...prev, [pageId]: updated };
        });
      };
      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        setResizingText(null);
        cleanup();
      };
      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        textResizeCleanupRef.current = null;
      }
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      textResizeCleanupRef.current = cleanup;
      setResizingText({
        pageId,
        id: annotationId,
        startWidth,
        startHeight,
        startX: startPoint.x,
        startY: startPoint.y,
        pointerId,
      });
    },
    [getPageNormalizedPoint, textAnnotations]
  );
  const [deleteMode, setDeleteMode] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectNameEditing, setProjectNameEditing] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("Untitled Project");
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [organizeMode, setOrganizeMode] = useState(false);
  const [firstPageThumb, setFirstPageThumb] = useState<string | null>(null);
  const lastPersistedThumbRef = useRef<string | null>(null);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const viewerScrollRef = previewContainerRef;
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasHydratedSources = useRef(false);
  const objectUrlCacheRef = useRef<Map<string, string>>(new Map());
  const hasHydratedHighlights = useRef(false);
  const hasHydratedSignatures = useRef(false);
  const pendingInsertedPageRef = useRef<{ afterId: string; newId: string } | null>(null);
  const updatePreviewHeightLimit = useCallback(() => {
    if (typeof window === "undefined") return;
    const container = previewContainerRef.current;
    const sidebarLimit = window.innerHeight * 0.7; // mirrors the 70vh sidebar list
    const containerLimit = container?.clientHeight ?? Infinity;
    const next = Math.min(sidebarLimit, containerLimit);
    setPreviewHeightLimit(Number.isFinite(next) ? Math.max(0, next) : null);
  }, []);
  const MIN_HIGHLIGHT_THICKNESS = 6;
  const MAX_HIGHLIGHT_THICKNESS = 32;
  const toolSwitchBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition";
  const toolSwitchActive = "bg-[#024d7c] text-white shadow-sm";
  const toolSwitchInactive = "bg-white text-slate-700 hover:bg-slate-50";
  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition";
  const buttonNeutral =
    `${buttonBase} border border-slate-200 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50`;
  const buttonPrimary =
    `${buttonBase} bg-[#024d7c] text-white shadow-md shadow-[#012a44]/30 hover:-translate-y-0.5 hover:bg-[#013d63]`;
	  const toolButtonBase =
	    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009DFD]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F5F9] disabled:cursor-not-allowed";
	  const toolIconButton =
	    "justify-center px-1.5";
	  const toolButtonInactiveNeutral =
	    "border-transparent bg-[#F1F5F9] text-[#475569] shadow-none hover:bg-[#E5E7EB] hover:text-[#475569] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
	  const toolButtonInactiveBlack =
	    "border-transparent bg-[#F1F5F9] text-black shadow-none hover:bg-[#E5E7EB] hover:text-black hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
	  const toolButtonActive =
	    "border-transparent bg-[#024d7c] text-white shadow-md shadow-[#012a44]/25 hover:bg-[#013d63] hover:shadow-md";
  const controlButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40";
  const bottomBarButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-full border border-[#1f2937] bg-[#1f2937] text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition hover:bg-[#111827] hover:shadow-[0_12px_24px_rgba(15,23,42,0.20)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f2937]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3f6fb]";
  const signatureTabBase =
    "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.06)] transition hover:border-[#024d7c]/40 hover:text-[#024d7c]";
  const signatureTabActive = "border-[#024d7c] bg-[#024d7c] text-white shadow-[0_10px_24px_rgba(2,77,124,0.2)]";
  const signatureTabInactive = "";

  // Better drag in grids
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** Rehydrate stored project name */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage?.getItem(PROJECT_NAME_STORAGE_KEY);
      if (stored) {
        const clean = sanitizeProjectName(stored);
        setProjectName(clean);
        setProjectNameDraft(clean);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setProjectNameDraft(projectName);
  }, [projectName]);

  useEffect(() => {
    updatePreviewHeightLimit();
    window.addEventListener("resize", updatePreviewHeightLimit);
    return () => window.removeEventListener("resize", updatePreviewHeightLimit);
  }, [updatePreviewHeightLimit]);

  /** Rehydrate annotations from the cloud project when editing an existing one */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasHydratedCloudAnnotationsRef.current) return;
    const projectId = searchParams.get("project");
    if (!projectId) return;
    if (pages.length === 0) return;

    let cancelled = false;

    async function hydrateAnnotations(targetProjectId: string) {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(targetProjectId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as {
          project?: { data?: any };
        } | null;
        const project = json?.project;
        if (!project || !project.data || cancelled) return;

	        const data = project.data as {
	          highlights?: Record<string, HighlightStroke[]>;
	          shapesByPage?: Record<string, ShapeAnnotation[]>;
	          textAnnotations?: Record<string, TextAnnotation[]>;
	          signaturePlacements?: Record<string, SignaturePlacement[]>;
	          savedSignatures?: SavedSignature[];
	          pages?: {
            id: string;
            rotation?: number;
          }[];
        };

	        if (data.highlights) {
	          setHighlights(data.highlights);
	        }
	        if (data.shapesByPage) {
	          setShapesByPage(data.shapesByPage);
	        }
	        if (data.textAnnotations) {
	          setTextAnnotations(data.textAnnotations);
	        }
        if (data.signaturePlacements) {
          setSignaturePlacements(data.signaturePlacements);
        }
        if (data.savedSignatures) {
          setSavedSignatures(data.savedSignatures);
        }
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          const rotationById = new Map<string, number>();
          data.pages.forEach((page) => {
            if (page && typeof page.id === "string" && typeof page.rotation === "number") {
              rotationById.set(page.id, page.rotation);
            }
          });
          if (rotationById.size > 0) {
            setPages((current) =>
              current.map((page) =>
                rotationById.has(page.id)
                  ? { ...page, rotation: rotationById.get(page.id) ?? page.rotation }
                  : page
              )
            );
          }
        }

        if (!cancelled) {
          hasHydratedCloudAnnotationsRef.current = true;
        }
      } catch {
        // ignore cloud hydration failures; fall back to local state
      }
    }

    void hydrateAnnotations(projectId);

    return () => {
      cancelled = true;
    };
  }, [pages.length, searchParams]);

  /** Derive a small annotated thumbnail of the first page for project cards */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pages.length === 0) {
      setFirstPageThumb(null);
      return;
    }

    let cancelled = false;

    async function generateThumb() {
      const page = pages[0];
      if (!page.preview) {
        setFirstPageThumb(null);
        return;
      }

      try {
        const baseImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new window.Image();
          img.src = page.preview;
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load base preview image"));
        });
        if (cancelled) return;

        const naturalWidth = page.width || baseImage.width || 612;
        const naturalHeight = page.height || baseImage.height || naturalWidth * DEFAULT_ASPECT_RATIO;
        const rotationDegrees = normalizeRotation(page.rotation);
        const rotated = rotationDegrees % 180 !== 0;
        const baseWidth = rotated ? naturalHeight : naturalWidth;
        const baseHeight = rotated ? naturalWidth : naturalHeight;

        // Render a high-resolution thumbnail for project cards.
        // Target ~2–3x the typical display width so the
        // image can scale down sharply without blurring.
        const targetWidth = 1100;
        const scale = Math.min(1.25, targetWidth / baseWidth);
        const outputWidth = baseWidth * scale;
        const outputHeight = baseHeight * scale;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(outputWidth));
        canvas.height = Math.max(1, Math.round(outputHeight));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationDegrees * Math.PI) / 180);

        const drawWidth = naturalWidth * scale;
        const drawHeight = naturalHeight * scale;
        ctx.drawImage(baseImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

	        const pageHighlights = highlights[page.id] ?? [];
	        if (pageHighlights.length > 0) {
	          const pageWidthPx = drawWidth;
	          const pageHeightPx = drawHeight;
	          pageHighlights.forEach((stroke) => {
            if (stroke.points.length < 2) return;
            ctx.lineCap = stroke.tool === "highlight" ? "butt" : "round";
            ctx.lineJoin = stroke.tool === "highlight" ? "miter" : "round";
            ctx.beginPath();
            stroke.points.forEach((pt, index) => {
              const x = (pt.x - 0.5) * pageWidthPx;
              const y = (pt.y - 0.5) * pageHeightPx;
              if (index === 0 || pt.move) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.strokeStyle = stroke.color;
            const effectiveTool = stroke.tool === "pencil" ? "pen" : stroke.tool;
            ctx.globalAlpha = effectiveTool === "highlight" ? stroke.opacity ?? 0.35 : 1;
            const widthFactor = stroke.tool === "highlight" ? 1.2 : 1;
            ctx.lineWidth = Math.max(1, stroke.thickness * pageWidthPx * widthFactor);
            ctx.stroke();
          });
	          ctx.globalAlpha = 1;
	        }

	        const pageShapes = shapesByPage[page.id] ?? [];
	        if (pageShapes.length > 0) {
	          const pageWidthPx = drawWidth;
	          const pageHeightPx = drawHeight;
	          pageShapes.forEach((shape) => {
	            const thickness = Math.max(1, shape.thickness * pageWidthPx);
	            const x1 = (shape.start.x - 0.5) * pageWidthPx;
	            const y1 = (shape.start.y - 0.5) * pageHeightPx;
	            const x2 = (shape.end.x - 0.5) * pageWidthPx;
	            const y2 = (shape.end.y - 0.5) * pageHeightPx;
	            const minX = Math.min(x1, x2);
	            const maxX = Math.max(x1, x2);
	            const minY = Math.min(y1, y2);
	            const maxY = Math.max(y1, y2);
	            const w = Math.max(1, maxX - minX);
	            const h = Math.max(1, maxY - minY);

	            ctx.save();
	            ctx.strokeStyle = shape.color;
	            ctx.lineWidth = thickness;
	            ctx.lineCap = "round";
	            ctx.lineJoin = "round";
	            ctx.beginPath();

	            const drawLine = (ax: number, ay: number, bx: number, by: number) => {
	              ctx.moveTo(ax, ay);
	              ctx.lineTo(bx, by);
	            };

	            const drawArrowHead = (ax: number, ay: number, bx: number, by: number) => {
	              const dx = bx - ax;
	              const dy = by - ay;
	              const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy));
	              const headLen = clamp(len * 0.16, 10, 26);
	              const angle = Math.atan2(dy, dx);
	              const left = angle + (Math.PI * 5) / 6;
	              const right = angle - (Math.PI * 5) / 6;
	              drawLine(bx, by, bx + Math.cos(left) * headLen, by + Math.sin(left) * headLen);
	              drawLine(bx, by, bx + Math.cos(right) * headLen, by + Math.sin(right) * headLen);
	            };

		            switch (shape.type) {
		              case "line":
		                drawLine(x1, y1, x2, y2);
		                break;
		              case "arrow":
		                drawLine(x1, y1, x2, y2);
		                drawArrowHead(x1, y1, x2, y2);
		                break;
		              case "rect":
		                ctx.rect(minX, minY, w, h);
		                break;
		              case "ellipse":
		                ctx.ellipse(minX + w / 2, minY + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
		                break;
		              case "triangle": {
		                const top = { x: minX + w / 2, y: minY };
		                const left = { x: minX, y: minY + h };
		                const right = { x: minX + w, y: minY + h };
		                drawLine(top.x, top.y, right.x, right.y);
		                drawLine(right.x, right.y, left.x, left.y);
		                drawLine(left.x, left.y, top.x, top.y);
		                break;
		              }
		              case "x":
		                drawLine(minX, minY, maxX, maxY);
		                drawLine(maxX, minY, minX, maxY);
		                break;
	              case "check": {
	                const p1 = { x: minX + w * 0.18, y: minY + h * 0.55 };
	                const p2 = { x: minX + w * 0.42, y: minY + h * 0.78 };
	                const p3 = { x: minX + w * 0.82, y: minY + h * 0.26 };
	                drawLine(p1.x, p1.y, p2.x, p2.y);
	                drawLine(p2.x, p2.y, p3.x, p3.y);
	                break;
	              }
	              default:
	                break;
	            }
	            ctx.stroke();
	            ctx.restore();
	          });
	        }

        const pageTexts = textAnnotations[page.id] ?? [];
        if (pageTexts.length > 0) {
          const pageWidthPx = drawWidth;
          const pageHeightPx = drawHeight;
          ctx.fillStyle = "#111827";
          pageTexts.forEach((annotation) => {
            const content = annotation.text;
            if (!content || content === TEXT_PLACEHOLDER) return;
            const boxWidth = (annotation.width ?? 0.14) * pageWidthPx;
            const padding = Math.min(6, boxWidth * 0.05);
            const x = (annotation.x - 0.5) * pageWidthPx + padding;
            const startY = (annotation.y - 0.5) * pageHeightPx + padding;
            const fontSize = 10;
            const lineHeight = fontSize * 1.3;
            ctx.font = `${fontSize}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            ctx.textBaseline = "top";
            const lines = content.split(/\r?\n/).slice(0, 6);
            let cursorY = startY;
            lines.forEach((line) => {
              const maxWidth = Math.max(10, boxWidth - padding * 2);
              ctx.fillText(line, x, cursorY, maxWidth);
              cursorY += lineHeight;
            });
          });
        }

        const pageSignatures = signaturePlacements[page.id] ?? [];
        if (pageSignatures.length > 0) {
          const placed = pageSignatures.filter((sig) => sig.status === "placed");
          for (const sig of placed) {
            if (!sig.dataUrl) continue;
            const sigImage = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new window.Image();
              img.src = sig.dataUrl;
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error("Failed to load signature image"));
            });
            if (cancelled) return;
            const sigWidth = sig.width * drawWidth;
            const sigHeight = sig.height * drawHeight;
            const centerX = (sig.x - 0.5 + sig.width / 2) * drawWidth;
            const centerY = (sig.y - 0.5 + sig.height / 2) * drawHeight;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(((sig.rotation ?? 0) * Math.PI) / 180);
            ctx.drawImage(sigImage, -sigWidth / 2, -sigHeight / 2, sigWidth, sigHeight);
            ctx.restore();
          }
        }

        ctx.restore();

        if (!cancelled) {
          setFirstPageThumb(toCardPreviewDataUrl(canvas));
        }
      } catch {
        if (!cancelled) {
          setFirstPageThumb(pages[0]?.thumb ?? null);
        }
      }
    }

    void generateThumb();

    return () => {
      cancelled = true;
    };
  }, [pages, highlights, textAnnotations, signaturePlacements]);

  /** Rehydrate any stored PDFs from IndexedDB so refreshes survive deployments */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function hydrateFromStorage() {
      hasHydratedSources.current = false;
      setSources([]);
      const local = getLocalStorage();
      const session = getSessionStorage();
      const projectId = projectParam ?? currentProjectId ?? null;
      const key = workspaceFilesKey(projectId);
      let raw: string | null = null;
      if (local) raw = local.getItem(key);
      if (!raw && session) {
        raw = session.getItem(key);
        if (raw && local) {
          try {
            local.setItem(key, raw);
          } catch {
            // ignore
          }
        }
        session?.removeItem(key);
      }
      if (!raw) {
        // If this is a saved cloud project, try to hydrate the source list
        // from the cloud project data (files still live in IndexedDB).
        if (projectId) {
          try {
            const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
            if (res.ok) {
              const json = (await res.json().catch(() => null)) as { project?: { data?: unknown } } | null;
              const cloudData = json?.project?.data;
              const cloudSources =
                cloudData && typeof cloudData === "object" && "sources" in cloudData
                  ? (cloudData as { sources?: unknown }).sources
                  : null;
              if (Array.isArray(cloudSources) && cloudSources.length > 0) {
                const restored: SourceRef[] = [];
                for (const entry of cloudSources) {
                  if (!entry || typeof entry !== "object") continue;
                  const id =
                    "id" in entry && typeof (entry as { id?: unknown }).id === "string"
                      ? (entry as { id: string }).id
                      : null;
                  if (!id) continue;
                  try {
                    const stored = await readFileBlob(id);
                    const blobRecord = stored?.blob instanceof Blob ? stored.blob : null;
                    if (!blobRecord) continue;
                    const objectUrl = URL.createObjectURL(blobRecord);
                    restored.push({
                      storageId: id,
                      url: objectUrl,
                      name:
                        ("name" in entry && typeof (entry as { name?: unknown }).name === "string"
                          ? (entry as { name: string }).name
                          : null) ??
                        stored?.name ??
                        "Document.pdf",
                      size:
                        ("size" in entry && typeof (entry as { size?: unknown }).size === "number"
                          ? (entry as { size: number }).size
                          : null) ??
                        stored?.size ??
                        blobRecord.size ??
                        0,
                      updatedAt:
                        ("updatedAt" in entry && typeof (entry as { updatedAt?: unknown }).updatedAt === "number"
                          ? (entry as { updatedAt: number }).updatedAt
                          : null) ??
                        stored?.updatedAt ??
                        Date.now(),
                    });
                  } catch (err) {
                    console.error("Failed to restore stored PDF", err);
                  }
                }
                if (!cancelled && restored.length > 0) {
                  setSources(restored);
                  persistSourceMetadata(restored, projectId);
                  setError(null);
                }
              }
            }
          } catch {
            // ignore cloud hydration failures; fall back to empty state
          }
        }
        hasHydratedSources.current = true;
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredSourceMeta[];
        if (!Array.isArray(parsed)) {
          local?.removeItem(key);
          hasHydratedSources.current = true;
          return;
        }

        const restored: SourceRef[] = [];
        for (const entry of parsed) {
          if (!entry || typeof entry !== "object") continue;
          const id = (entry as StoredSourceMeta).id ?? (entry as { storageId?: string }).storageId;
          if (!id) continue;
          try {
            const stored = await readFileBlob(id);
            const blobRecord = stored?.blob instanceof Blob ? stored.blob : null;
            if (!blobRecord) continue;
            const objectUrl = URL.createObjectURL(blobRecord);
            restored.push({
              storageId: id,
              url: objectUrl,
              name: entry.name ?? stored?.name ?? "Document.pdf",
              size: entry.size ?? stored?.size ?? blobRecord.size ?? 0,
              updatedAt: entry.updatedAt ?? stored?.updatedAt ?? Date.now(),
            });
          } catch (err) {
            console.error("Failed to restore stored PDF", err);
          }
        }

        if (!cancelled) {
          if (restored.length > 0) {
            setSources(restored);
          } else {
            local?.removeItem(key);
            setError("We couldn't restore your previous workspace. Please re-upload your PDFs.");
          }
        }
      } catch (err) {
        console.error("Failed to parse stored workspace", err);
        local?.removeItem(key);
      } finally {
        if (!cancelled) {
          hasHydratedSources.current = true;
        }
      }
    }

    hydrateFromStorage();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId, projectParam]);

  /** Persist source metadata whenever it changes (after hydration) */
  useEffect(() => {
    if (!hasHydratedSources.current || typeof window === "undefined") return;
    const projectId = projectParam ?? currentProjectId ?? null;
    persistSourceMetadata(sources, projectId);
  }, [sources, currentProjectId, projectParam]);

  /** Revoke object URLs we no longer need to avoid memory leaks */
  useEffect(() => {
    const previous = objectUrlCacheRef.current;
    const next = new Map<string, string>();
    sources.forEach((source) => {
      next.set(source.storageId, source.url);
      previous.delete(source.storageId);
    });
    previous.forEach((url) => URL.revokeObjectURL(url));
    objectUrlCacheRef.current = next;
  }, [sources]);

  useEffect(() => {
    return () => {
      objectUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlCacheRef.current.clear();
    };
  }, []);

  /** Restore highlight strokes across reloads */
  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedHighlights.current) return;
    hasHydratedHighlights.current = true;
    try {
      const raw = getLocalStorage()?.getItem(WORKSPACE_HIGHLIGHTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setHighlights(parsed as Record<string, HighlightStroke[]>);
      }
    } catch (err) {
      console.error("Failed to restore highlights", err);
      getLocalStorage()?.removeItem(WORKSPACE_HIGHLIGHTS_KEY);
    }
  }, []);

  /** Persist highlights so edits survive reloads */
  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedHighlights.current) return;
    try {
      getLocalStorage()?.setItem(WORKSPACE_HIGHLIGHTS_KEY, JSON.stringify(highlights));
    } catch (err) {
      console.error("Failed to persist highlights", err);
    }
  }, [highlights]);

  /** Restore saved signatures for guests from localStorage */
  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedSignatures.current) return;
    if (authSession?.user?.id) return;
    hasHydratedSignatures.current = true;
    try {
      const raw = getLocalStorage()?.getItem(WORKSPACE_SIGNATURES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedSignatures(parsed as SavedSignature[]);
      }
    } catch (err) {
      console.error("Failed to restore saved signatures", err);
      getLocalStorage()?.removeItem(WORKSPACE_SIGNATURES_KEY);
    }
  }, [authSession?.user?.id]);

  /** Restore saved signatures for signed-in users from local storage (migration) or the API */
  useEffect(() => {
    if (!authSession?.user?.id || hasHydratedSignatures.current) return;
    hasHydratedSignatures.current = true;
    let cancelled = false;
    const hydrate = async () => {
      try {
        // First, try migrating any browser-local signatures into the account store.
        const local = getLocalStorage();
        const rawLocal = local?.getItem(WORKSPACE_SIGNATURES_KEY);
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed) && !cancelled) {
              const migrated = parsed as SavedSignature[];
              setSavedSignatures(migrated);
              // Persist to API so they follow the account across devices.
              await fetch("/api/signatures", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signatures: migrated }),
              });
              local?.removeItem(WORKSPACE_SIGNATURES_KEY);
              return;
            }
          } catch {
            // ignore malformed local signatures and fall through to API
          }
        }

        // Otherwise, hydrate from the account-level API.
        const res = await fetch("/api/signatures", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { signatures?: SavedSignature[] };
        if (!cancelled && Array.isArray(data.signatures)) {
          setSavedSignatures(data.signatures);
        }
      } catch {
        // ignore network errors
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id]);

  /** Persist saved signatures */
  useEffect(() => {
    if (!hasHydratedSignatures.current) return;
    // Signed-in users: sync to API so signatures follow the account across devices.
    if (authSession?.user?.id) {
      const controller = new AbortController();
      const persist = async () => {
        try {
          await fetch("/api/signatures", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signatures: savedSignatures }),
            signal: controller.signal,
          });
        } catch {
          // ignore network errors; local state still works
        }
      };
      void persist();
      return () => {
        controller.abort();
      };
    }
    // Guests: keep using localStorage, scoped to this browser only.
    if (typeof window === "undefined") return;
    try {
      getLocalStorage()?.setItem(WORKSPACE_SIGNATURES_KEY, JSON.stringify(savedSignatures));
    } catch (err) {
      console.error("Failed to persist signatures", err);
    }
  }, [authSession?.user?.id, savedSignatures]);

  /** Render thumbnails for any sources that haven't been processed yet */
  useEffect(() => {
    if (sources.length === 0) {
      setPages([]);
      renderedSourcesRef.current = 0;
      return;
    }

    if (renderedSourcesRef.current >= sources.length) return;

    let cancelled = false;
    async function renderNewSources() {
      const shouldShowLoading = pages.length === 0;
      if (shouldShowLoading) setLoading(true);
      setError(null);
      const next: PageItem[] = [];
      const startIdx = renderedSourcesRef.current;

      try {
        // Import pdf.js in the browser only
        const pdfjsLib = (await import("pdfjs-dist")) as typeof import("pdfjs-dist") & {
          GlobalWorkerOptions: { workerSrc: string };
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url,
        ).toString();

        const pixelRatio = getDevicePixelRatio();
        const previewScale = PREVIEW_BASE_SCALE;

        // Only render thumbnails for sources we haven't seen yet
        for (let s = startIdx; s < sources.length; s++) {
          const src = sources[s];
          let pdf: any;
          try {
            // Use `data` instead of `url` so the worker doesn't try to fetch `blob:` URLs,
            // which can intermittently fail with "Unexpected server response (0)".
            const stored = await readFileBlob(src.storageId);
            const blob = stored?.blob instanceof Blob ? stored.blob : null;
            const bytes = blob
              ? new Uint8Array(await blob.arrayBuffer())
              : new Uint8Array(await (await fetch(src.url)).arrayBuffer());
            pdf = await pdfjsLib.getDocument({ data: bytes } as any).promise;
          } catch (err) {
            console.warn("pdfjs getDocument failed, retrying without worker", err);
            const stored = await readFileBlob(src.storageId);
            const blob = stored?.blob instanceof Blob ? stored.blob : null;
            const bytes = blob
              ? new Uint8Array(await blob.arrayBuffer())
              : new Uint8Array(await (await fetch(src.url)).arrayBuffer());
            pdf = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as any).promise;
          }
          for (let p = 1; p <= pdf.numPages; p++) {
            if (cancelled) return;
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: previewScale });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;

            const scaledWidth = Math.floor(viewport.width * pixelRatio);
            const scaledHeight = Math.floor(viewport.height * pixelRatio);
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;

            const renderContext = {
              canvasContext: ctx,
              viewport,
              transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
            };

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            await page.render(renderContext).promise;

            const previewData = toCardPreviewDataUrl(canvas);
            const thumbData = createThumbnailDataUrl(canvas);

            const pageId = buildPageId(src.storageId, p - 1);
            next.push({
              id: pageId,
              srcIdx: s,
              pageIdx: p - 1,
              thumb: thumbData,
              preview: previewData,
              rotation: 0,
              width: scaledWidth,
              height: scaledHeight,
            });
          }
        }

        if (!cancelled) {
          setPages((prev) => {
            if (prev.length === 0) return [...prev, ...next];
            const nextById = new Map(next.map((item) => [item.id, item]));
            const merged = prev.map((item) => nextById.get(item.id) ?? item);
            const existingIds = new Set(prev.map((item) => item.id));
            const appended = next.filter((item) => !existingIds.has(item.id));
            return appended.length ? [...merged, ...appended] : merged;
          });
          renderedSourcesRef.current = sources.length;
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not render previews (file may be encrypted or corrupted).");
      } finally {
        if (!cancelled && pages.length === 0) setLoading(false);
      }
    }

    renderNewSources();
    return () => {
      cancelled = true;
    };
  }, [sources]);

  useEffect(() => {
    if (pages.length === 0) {
      setActivePageId(null);
      setOrganizeMode(false);
      setActivePageIndex(0);
      setPageNumberDraft("");
      return;
    }
    const hasValidId = activePageId && pages.some((p) => p.id === activePageId);
    if (!hasValidId) {
      setActivePageId(pages[0].id);
      setActivePageIndex(0);
      return;
    }
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (idx !== -1 && idx !== activePageIndexState) {
      setActivePageIndex(idx);
    }
  }, [pages, activePageId, activePageIndexState]);

  useEffect(() => {
    if (pages.length === 0) return;
    const idx = activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : 0;
    setPageNumberDraft(String(idx + 1));
  }, [activePageIndexState, pages.length]);

  useEffect(() => {
    if (!pageActionMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if ((event.target as HTMLElement).closest("[data-page-actions-menu]")) return;
      setPageActionMenuId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPageActionMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageActionMenuId]);

  useEffect(() => {
    const pending = pendingInsertedPageRef.current;
    if (!pending) return;
    const { afterId, newId } = pending;
    const newIndex = pages.findIndex((p) => p.id === newId);
    if (newIndex === -1) return;
    const afterIndex = pages.findIndex((p) => p.id === afterId);
    if (afterIndex === -1) {
      pendingInsertedPageRef.current = null;
      return;
    }

    pendingInsertedPageRef.current = null;
    setPages((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === newId);
      const toIndex = prev.findIndex((p) => p.id === afterId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex + 1, 0, moved);
      return next;
    });
    setActivePageId(newId);
    setShouldCenterOnChange(true);
  }, [pages]);

  useEffect(() => {
    if (pages.length === 0) {
      if (sources.length === 0) {
        setHighlights({});
        setHighlightHistory([]);
        setRedoHighlightHistory([]);
        setShapesByPage({});
      }
      return;
    }

    const allowed = new Set(pages.map((p) => p.id));
    setHighlights((prev) => {
      const next: Record<string, HighlightStroke[]> = {};
      allowed.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      if (Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }
      return next;
    });

    setShapesByPage((prev) => {
      const next: Record<string, ShapeAnnotation[]> = {};
      allowed.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      if (Object.keys(prev).length === Object.keys(next).length) {
        return prev;
      }
      return next;
    });

    const filterAllowed = (entry: HighlightHistoryEntry) => (entry.type === "clear" ? true : allowed.has(entry.pageId));
    setHighlightHistory((prev) => prev.filter(filterAllowed));
    setRedoHighlightHistory((prev) => prev.filter(filterAllowed));
  }, [pages, sources.length]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-page-id");
          if (id) {
            const lock = pageNavigationLockRef.current;
            if (lock && Date.now() < lock.until) {
              if (id !== lock.targetId) return;
              pageNavigationLockRef.current = null;
            }
            setActivePageId((prev) => (prev === id ? prev : id));
          }
        }
      },
      { root: container, threshold: 0.65 }
    );

    previewNodeMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = getLocalStorage();
    if (!storage) return;
    const pending = storage.getItem(PENDING_UPLOAD_STORAGE_KEY);
    if (!pending) return;
    storage.removeItem(PENDING_UPLOAD_STORAGE_KEY);
    try {
      const parsed = JSON.parse(pending);
      if (!parsed?.data || !parsed?.name) return;
      const blob = dataURLToBlob(parsed.data as string);
      const file = new File([blob], parsed.name as string, { type: blob.type ?? "application/pdf" });
      processSelectedFiles([file]);
    } catch (err) {
      console.error("Failed to import pending upload", err);
    }
  }, []);

  /** Add more PDFs (create object URLs and append to sources) */
  function handleAddClick() {
    addInputRef.current?.click();
  }

  async function processSelectedFiles(list: File[]) {
    if (!list.length) {
      return;
    }

    if (!hasHydratedSources.current) {
      hasHydratedSources.current = true;
    }

    const accepted = list.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const created: SourceRef[] = [];
    let hadPersistError = false;

    for (const file of accepted) {
      const storageId = crypto.randomUUID();
      const objectUrl = URL.createObjectURL(file);
      try {
        await storeFileBlob(storageId, file, file.name, file.size);
        created.push({
          storageId,
          url: objectUrl,
          name: file.name,
          size: file.size,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error("Failed to persist PDF locally", err);
        URL.revokeObjectURL(objectUrl);
        setError("Unable to store that PDF locally. Please allow storage access and try again.");
        hadPersistError = true;
      }
    }

    if (created.length) {
      if (!hadPersistError) {
        setError(null);
      }
      setSources((prev) => [...prev, ...created]);
    }
  }

  async function handleAddChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) {
      e.currentTarget.value = "";
      return;
    }
    await processSelectedFiles(list);
    e.currentTarget.value = "";
  }

  function handleSelectPage(index: number) {
    setActivePageIndex(index);
    setShouldCenterOnChange(true);
    const page = pages[index];
    if (page) {
      pageNavigationLockRef.current = { until: Date.now() + 700, targetId: page.id };
      setActivePageId(page.id);
    }
  }

  async function handleAddBlankPageAfter(pageId: string) {
    const storageId = crypto.randomUUID();
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    await storeFileBlob(storageId, blob, "Blank page.pdf", blob.size);
    const objectUrl = URL.createObjectURL(blob);
    const newPageId = buildPageId(storageId, 0);
    const pixelRatio = getDevicePixelRatio();
    const viewportWidth = Math.floor(612 * PREVIEW_BASE_SCALE * pixelRatio);
    const viewportHeight = Math.floor(792 * PREVIEW_BASE_SCALE * pixelRatio);
    const canvas = document.createElement("canvas");
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(148,163,184,0.85)";
      ctx.lineWidth = Math.max(2, Math.floor(2 * pixelRatio));
      ctx.strokeRect(
        ctx.lineWidth,
        ctx.lineWidth,
        canvas.width - ctx.lineWidth * 2,
        canvas.height - ctx.lineWidth * 2,
      );
    }
    const previewData = toCardPreviewDataUrl(canvas);
    const thumbData = createThumbnailDataUrl(canvas);

    let newSrcIdx = sources.length;
    setSources((prev) => {
      newSrcIdx = prev.length;
      return [...prev, { storageId, url: objectUrl, name: "Blank page.pdf", size: blob.size, updatedAt: Date.now() }];
    });

    let insertedIndex = 0;
    setPages((prev) => {
      const afterIndex = prev.findIndex((p) => p.id === pageId);
      const next = [...prev];
      const newPage: PageItem = {
        id: newPageId,
        srcIdx: newSrcIdx,
        pageIdx: 0,
        thumb: thumbData,
        preview: previewData,
        rotation: 0,
        width: viewportWidth,
        height: viewportHeight,
      };
      if (afterIndex === -1) next.push(newPage);
      else next.splice(afterIndex + 1, 0, newPage);
      insertedIndex = afterIndex === -1 ? next.length - 1 : afterIndex + 1;
      return next;
    });

    setActivePageId(newPageId);
    setActivePageIndex(insertedIndex);
    setShouldCenterOnChange(true);
  }

  async function handleAddBlankPageBefore(pageId: string) {
    const storageId = crypto.randomUUID();
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    await storeFileBlob(storageId, blob, "Blank page.pdf", blob.size);
    const objectUrl = URL.createObjectURL(blob);
    const newPageId = buildPageId(storageId, 0);
    const pixelRatio = getDevicePixelRatio();
    const viewportWidth = Math.floor(612 * PREVIEW_BASE_SCALE * pixelRatio);
    const viewportHeight = Math.floor(792 * PREVIEW_BASE_SCALE * pixelRatio);
    const canvas = document.createElement("canvas");
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(148,163,184,0.85)";
      ctx.lineWidth = Math.max(2, Math.floor(2 * pixelRatio));
      ctx.strokeRect(
        ctx.lineWidth,
        ctx.lineWidth,
        canvas.width - ctx.lineWidth * 2,
        canvas.height - ctx.lineWidth * 2,
      );
    }
    const previewData = toCardPreviewDataUrl(canvas);
    const thumbData = createThumbnailDataUrl(canvas);

    let newSrcIdx = sources.length;
    setSources((prev) => {
      newSrcIdx = prev.length;
      return [...prev, { storageId, url: objectUrl, name: "Blank page.pdf", size: blob.size, updatedAt: Date.now() }];
    });

    let insertedIndex = 0;
    setPages((prev) => {
      const beforeIndex = prev.findIndex((p) => p.id === pageId);
      const next = [...prev];
      const newPage: PageItem = {
        id: newPageId,
        srcIdx: newSrcIdx,
        pageIdx: 0,
        thumb: thumbData,
        preview: previewData,
        rotation: 0,
        width: viewportWidth,
        height: viewportHeight,
      };
      if (beforeIndex === -1) next.unshift(newPage);
      else next.splice(beforeIndex, 0, newPage);
      insertedIndex = beforeIndex === -1 ? 0 : beforeIndex;
      return next;
    });

    pageNavigationLockRef.current = { until: Date.now() + 700, targetId: newPageId };
    setActivePageId(newPageId);
    setActivePageIndex(insertedIndex);
    setShouldCenterOnChange(true);
  }

  async function handleDuplicatePage(page: PageItem) {
    const src = sources[page.srcIdx];
    if (!src) return;
    const stored = await readFileBlob(src.storageId);
    const originalBlob = stored?.blob instanceof Blob ? stored.blob : null;
    if (!originalBlob) return;
    const ab = await originalBlob.arrayBuffer();
    const sourceDoc = await PDFDocument.load(new Uint8Array(ab));
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(sourceDoc, [page.pageIdx]);
    out.addPage(copied);
    const bytes = await out.save();
    const storageId = crypto.randomUUID();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const name = `Page ${page.pageIdx + 1}.pdf`;
    await storeFileBlob(storageId, blob, name, blob.size);
    const objectUrl = URL.createObjectURL(blob);
    const newPageId = buildPageId(storageId, 0);

    let newSrcIdx = sources.length;
    setSources((prev) => {
      newSrcIdx = prev.length;
      return [...prev, { storageId, url: objectUrl, name, size: blob.size, updatedAt: Date.now() }];
    });

    let insertedIndex = 0;
    setPages((prev) => {
      const afterIndex = prev.findIndex((p) => p.id === page.id);
      const next = [...prev];
      const newPage: PageItem = {
        id: newPageId,
        srcIdx: newSrcIdx,
        pageIdx: 0,
        thumb: page.thumb,
        preview: page.preview,
        rotation: page.rotation,
        width: page.width,
        height: page.height,
      };
      if (afterIndex === -1) next.push(newPage);
      else next.splice(afterIndex + 1, 0, newPage);
      insertedIndex = afterIndex === -1 ? next.length - 1 : afterIndex + 1;
      return next;
    });

    setActivePageId(newPageId);
    setActivePageIndex(insertedIndex);
    setShouldCenterOnChange(true);
  }

  function commitPageNumberDraft() {
    if (pages.length === 0) return;
    const parsed = Number.parseInt(pageNumberDraft, 10);
    if (!Number.isFinite(parsed)) {
      const idx = activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : 0;
      setPageNumberDraft(String(idx + 1));
      return;
    }
    const clamped = clamp(parsed, 1, Math.max(1, pages.length));
    setPageNumberDraft(String(clamped));
    handleSelectPage(clamped - 1);
  }

  function registerPreviewRef(id: string) {
    return (node: HTMLDivElement | null) => {
      const index = pages.findIndex((p) => p.id === id);
      if (index >= 0) {
        pageRefs.current[index] = node;
      }
      if (node) {
        previewNodeMap.current.set(id, node);
      } else {
        previewNodeMap.current.delete(id);
      }
    };
  }


  const renderPreviewPage = (page: PageItem, idx: number) => {
    const pageHighlights = highlights[page.id] ?? [];
    const pageTexts = textAnnotations[page.id] ?? [];
    const pageSignatures = signaturePlacements[page.id] ?? [];
    const rotationDegrees = normalizeRotation(page.rotation);
    const naturalWidth = page.width || 612;
    const naturalHeight = page.height || naturalWidth * DEFAULT_ASPECT_RATIO;
    const effectiveScale = baseScale * zoomMultiplier;
    const contentWidth = naturalWidth * effectiveScale;
    const contentHeight = naturalHeight * effectiveScale;
    const rotated = rotationDegrees % 180 !== 0;
    const fittedWidth = rotated ? contentHeight : contentWidth;
    const fittedHeight = rotated ? contentWidth : contentHeight;
    const displayHeight = fittedHeight;
    const clipped = false;
    const rotationTransform =
      rotationDegrees === 90
        ? `translateX(${contentHeight}px) rotate(90deg)`
        : rotationDegrees === 180
          ? `translateX(${contentWidth}px) translateY(${contentHeight}px) rotate(180deg)`
          : rotationDegrees === 270
            ? `translateY(${contentWidth}px) rotate(270deg)`
            : "none";
    return (
      <div
        key={page.id}
        data-page-id={page.id}
        ref={registerPreviewRef(page.id)}
        className="mx-auto w-fit opacity-0 scale-[0.98] animate-[page-enter_0.15s_ease-out_forwards]"
      >
        <div className="mx-auto mb-2 flex items-center" style={{ width: fittedWidth }}>
          <div className="w-24 text-lg font-semibold text-slate-500">#{idx + 1}</div>
          <div className="flex flex-1 justify-center">
            <div className="group relative">
              <button
                type="button"
                aria-label="Add blank page"
                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
	                onClick={(event) => {
	                  event.stopPropagation();
	                  void handleAddBlankPageBefore(page.id);
	                }}
	              >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Add blank page</span>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                Add blank page
              </div>
            </div>
          </div>
          <div className="relative flex w-24 justify-end" data-page-actions-menu>
            <button
              type="button"
              aria-label="Page actions"
              className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
              onClick={(event) => {
                event.stopPropagation();
                setPageActionMenuId((current) => (current === page.id ? null : page.id));
              }}
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
            {pageActionMenuId === page.id ? (
              <div className="absolute right-0 top-11 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.20)]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  onClick={() => {
                    setPageActionMenuId(null);
                    handleRotatePage(page.id);
                  }}
                >
                  <RotateCcw className="h-4 w-4 text-slate-500" aria-hidden />
                  Rotate
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  onClick={() => {
                    setPageActionMenuId(null);
                    void handleDuplicatePage(page);
                  }}
                >
                  <Copy className="h-4 w-4 text-slate-500" aria-hidden />
                  Duplicate
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={() => {
                    setPageActionMenuId(null);
                    handleDeletePage(page.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </button>
                <div className="my-2 h-px bg-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  onClick={() => {
                    setPageActionMenuId(null);
                    setOrganizeMode(true);
                  }}
                >
                  <ListOrdered className="h-4 w-4 text-slate-500" aria-hidden />
                  Rearrange pages
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div
          className={`relative bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition ${
            idx === activePageIndex ? "shadow-brand/30" : ""
          }`}
            style={{
              width: fittedWidth,
              height: displayHeight,
            overflow: undefined,
          }}
          onClick={(event) => {
            if (activeDrawingTool || deleteMode) {
              event.stopPropagation();
              return;
            }
            handleSelectPage(idx);
          }}
        >
          <div
            className="absolute inset-0 flex items-start justify-center overflow-visible"
            style={{ width: "100%", height: "100%" }}
          >
            <div
	              className="absolute left-0 top-0 bg-white"
	              style={{
	                width: contentWidth,
	                height: contentHeight,
	                transform: rotationTransform,
	                transformOrigin: "top left",
	                cursor: deleteMode
	                  ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"])
	                  : activeDrawingTool === "highlight"
	                    ? (`url(${HIGHLIGHT_CURSOR}) 4 24, crosshair` as CSSProperties["cursor"])
	                    : activeDrawingTool === "shape"
	                      ? ("crosshair" as CSSProperties["cursor"])
	                    : activeDrawingTool === "pen"
	                      ? ("crosshair" as CSSProperties["cursor"])
	                      : activeDrawingTool === "text"
	                        ? ("text" as CSSProperties["cursor"])
	                        : undefined,
	              }}
              onPointerDown={(event) => {
                if (deleteMode) {
                  setIsErasing(true);
                  event.preventDefault();
                }
                handleMarkupPointerDown(page.id, event);
              }}
              onPointerMove={(event) => handleMarkupPointerMove(page.id, event)}
              onPointerUp={() => {
                setIsErasing(false);
                handleMarkupPointerUp(page.id);
              }}
              onPointerCancel={() => {
                setIsErasing(false);
                handleMarkupPointerUp(page.id);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.preview}
                alt={`Page ${idx + 1}`}
                className="h-full w-full object-contain"
                draggable={false}
              />
              <svg
                className="absolute inset-0 h-full w-full"
                style={{ pointerEvents: deleteMode ? "auto" : "none" }}
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
              >
                {deleteMode ? (
                  <>
                    {pageHighlights.map((stroke) =>
                      stroke.points.length > 1 ? (
                        <path
                          key={`${stroke.id}-hit`}
                          d={pointsToSvgPath(stroke.points)}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={Math.max(12, stroke.thickness * 3000)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            pointerEvents: "stroke",
                            cursor: "url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"],
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsErasing(true);
                            handleDeleteStroke(page.id, stroke.id);
                          }}
                          onPointerMove={(event) => {
                            if (!isErasing) return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteStroke(page.id, stroke.id);
                          }}
                          onPointerEnter={(event) => {
                            if (!isErasing) return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteStroke(page.id, stroke.id);
                          }}
                        />
                      ) : null
                    )}
                    {(shapesByPage[page.id] ?? []).map((shape) => {
                      const baseWidth = Math.max(12, shape.thickness * 3000);
                      const hitProps: SVGProps<SVGElement> = {
                        style: {
                          pointerEvents: "stroke",
                          cursor: "url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"],
                        },
                        onPointerDown: (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsErasing(true);
                          handleDeleteShape(page.id, shape.id);
                        },
                        onPointerMove: (event) => {
                          if (!isErasing) return;
                          event.preventDefault();
                          event.stopPropagation();
                          handleDeleteShape(page.id, shape.id);
                        },
                        onPointerEnter: (event) => {
                          if (!isErasing) return;
                          event.preventDefault();
                          event.stopPropagation();
                          handleDeleteShape(page.id, shape.id);
                        },
                      };
                      return (
                        <Fragment key={`${shape.id}-hit`}>
                          {shapeToSvgElements(shape, {
                            stroke: "transparent",
                            strokeWidth: baseWidth,
                            interactiveProps: hitProps,
                          })}
                        </Fragment>
                      );
                    })}
                  </>
                ) : null}
                {pageHighlights.map((stroke) => {
                  if (stroke.points.length <= 1) return null;
                  const effectiveTool = stroke.tool === "pencil" ? "pen" : stroke.tool;
                  const baseWidth = Math.max(1, stroke.thickness * 1000);
                  const isHighlight = effectiveTool === "highlight";
                  const cap = isHighlight ? "butt" : "round";
                  const join = isHighlight ? "miter" : "round";
                  const opacity = isHighlight ? stroke.opacity ?? 0.35 : 1;
                  const commonProps = {
                    d: pointsToSvgPath(stroke.points),
                    fill: "none" as const,
                    stroke: stroke.color,
                    strokeLinecap: cap as any,
                    strokeLinejoin: join as any,
                    style: {
                      pointerEvents: deleteMode ? ("stroke" as const) : ("none" as const),
                      cursor: deleteMode
                        ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"])
                        : "default",
                      mixBlendMode: isHighlight ? ("multiply" as const) : undefined,
                    },
                  };

                  return (
                    <path
                      key={stroke.id}
                      {...commonProps}
                      strokeWidth={isHighlight ? baseWidth * 1.2 : baseWidth}
                      strokeOpacity={opacity}
                      onPointerDown={(event) => {
                        if (!deleteMode) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setIsErasing(true);
                        handleDeleteStroke(page.id, stroke.id);
                      }}
                      onPointerEnter={(event) => {
                        if (!deleteMode || !isErasing) return;
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteStroke(page.id, stroke.id);
                      }}
                    />
                  );
                })}

                {(shapesByPage[page.id] ?? []).map((shape) => {
                  const baseWidth = Math.max(1, shape.thickness * 1000);
                  return (
                    <Fragment key={shape.id}>
                      {shapeToSvgElements(shape, { stroke: shape.color, strokeWidth: baseWidth })}
                    </Fragment>
                  );
                })}

                {draftHighlight?.pageId === page.id && draftHighlight.points.length > 1 ? (() => {
                  const tool = draftHighlight.tool === "pencil" ? "pen" : draftHighlight.tool;
                  const points =
                    tool === "highlight"
                      ? snapHighlightSegments(smoothStrokePoints(draftHighlight.points, tool))
                      : smoothStrokePoints(draftHighlight.points, tool);
                  const d = pointsToSvgPath(points);
                  const baseWidth = Math.max(1, draftHighlight.thickness * 1000);
                  const isHighlight = tool === "highlight";
                  const cap = isHighlight ? "butt" : "round";
                  const join = isHighlight ? "miter" : "round";
                  const style: CSSProperties = { mixBlendMode: isHighlight ? ("multiply" as any) : undefined };
                  const opacity = isHighlight ? draftHighlight.opacity ?? 0.35 : 1;
                  return (
                    <path
                      aria-hidden
                      d={d}
                      fill="none"
                      stroke={draftHighlight.color}
                      strokeWidth={isHighlight ? baseWidth * 1.2 : baseWidth}
                      strokeLinecap={cap as any}
                      strokeLinejoin={join as any}
                      strokeOpacity={opacity}
                      style={style}
                    />
                  );
                })() : null}

                {draftShape?.pageId === page.id ? (
                  <Fragment>
                    {shapeToSvgElements(draftShape, {
                      stroke: draftShape.color,
                      strokeWidth: Math.max(1, draftShape.thickness * 1000),
                    })}
                  </Fragment>
                ) : null}
              </svg>
              {draftTextBox && draftTextBox.pageId === page.id ? (
                <div
                  className="absolute border border-dashed border-slate-300 bg-white/40"
                  style={{
                    left: `${Math.min(draftTextBox.startX, draftTextBox.currentX) * 100}%`,
                    top: `${Math.min(draftTextBox.startY, draftTextBox.currentY) * 100}%`,
                    width: `${Math.max(Math.abs(draftTextBox.currentX - draftTextBox.startX), 0.01) * 100}%`,
                    height: `${Math.max(Math.abs(draftTextBox.currentY - draftTextBox.startY), 0.01) * 100}%`,
                  }}
                />
              ) : null}
              {pageSignatures.map((signature) => {
                const isActive = activeSignaturePlacementId === signature.id;
                const isDraggingThis = signatureDrag?.id === signature.id;
                const isResizingThis = signatureResize?.id === signature.id;
                return (
                  <div
                    key={signature.id}
                    className={`absolute transition-all duration-150 ${
                      isActive
                        ? "ring-2 ring-[#024d7c] border border-dashed border-slate-400"
                        : "ring-1 ring-transparent border border-transparent"
                    } rounded-lg`}
                    style={{
                      left: `${signature.x * 100}%`,
                      top: `${signature.y * 100}%`,
                      width: `${signature.width * 100}%`,
                      height: `${signature.height * 100}%`,
                      transform: `rotate(${signature.rotation ?? 0}deg)`,
                      transformOrigin: "center",
                      cursor: deleteMode
                        ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"])
                        : "move",
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      if (deleteMode) {
                        setIsErasing(true);
                        return;
                      }
                      setActiveSignaturePlacementId(signature.id);
                      startSignatureDrag(page.id, signature.id, event as unknown as ReactPointerEvent<HTMLElement>);
                    }}
                  >
                    <div className="relative h-full w-full overflow-visible rounded-lg bg-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signature.dataUrl}
                        alt={signature.name}
                        className="h-full w-full select-none object-contain"
                        draggable={false}
                      />
                      <div className="pointer-events-none absolute -top-12 left-0 flex items-center gap-2">
                        {signature.status === "draft" ? (
                          <button
                            type="button"
                            className="pointer-events-auto rounded-full bg-[#024d7c] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#013d63]"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleApplySignaturePlacement(page.id, signature.id);
                            }}
                          >
                            Apply
                          </button>
                        ) : null}
                        <div className="pointer-events-auto rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                          {signature.name}
                        </div>
                      </div>
                      <div className="pointer-events-none absolute -bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2">
                        <button
                          type="button"
                          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm transition hover:bg-white active:translate-y-[1px]"
                          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                            startSignatureDrag(page.id, signature.id, event);
                          }}
                        >
                          <Move className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-700 shadow-sm transition hover:bg-white active:translate-y-[1px]"
                          onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                            startSignatureRotate(page.id, signature.id, event);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-rose-300 bg-white/90 text-rose-700 shadow-sm transition hover:bg-rose-50 active:translate-y-[1px]"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteSignaturePlacement(page.id, signature.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div
                        className={`absolute -right-2 -bottom-2 h-4 w-4 cursor-se-resize rounded-full border border-slate-600 bg-white shadow-sm transition hover:border-slate-700 hover:shadow-md ${
                          isResizingThis ? "scale-110" : ""
                        }`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setActiveSignaturePlacementId(signature.id);
                          startSignatureResize(page.id, signature.id, event);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {pageTexts.map((annotation) => {
                const annotationWidth = annotation.width ?? 0.14;
                const annotationHeight = annotation.height ?? 0.06;
                const isDraggingThis = draggingText?.id === annotation.id;
                const isResizingThis = resizingText?.id === annotation.id;
                const isRotatingThis = rotatingText?.id === annotation.id;
                const rotation = annotation.rotation ?? 0;
                const displayRotation = normalizeRotation(rotation);
                const displayFontSize = textSize;
                return (
                <div
                  key={annotation.id}
                  ref={registerTextAnnotationNode(annotation.id)}
                  className={`absolute transition-transform duration-150 ${
                    isRotatingThis ? "scale-[1.02] drop-shadow-[0_4px_18px_rgba(2,77,124,0.25)]" : ""
                  }`}
                  data-text-annotation
                  style={{
                    left: `${annotation.x * 100}%`,
                    top: `${annotation.y * 100}%`,
                    width: `${annotationWidth * 100}%`,
                    height: `${annotationHeight * 100}%`,
                    transform: `rotate(${displayRotation}deg)`,
                    transformOrigin: "center",
                    willChange: isRotatingThis ? "transform" : undefined,
                    transitionDuration: isRotatingThis ? "0ms" : undefined,
                    cursor: deleteMode ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"]) : undefined,
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (deleteMode) {
                      setIsErasing(true);
                      return;
                    }
                    focusTextAnnotation(annotation.id);
                  }}
                  onPointerEnter={(event) => {
                    if (!deleteMode || !isErasing) return;
                    event.stopPropagation();
                  }}
                >
                  <div className="relative h-full w-full">
                    {isRotatingThis ? (
                      <div
                        className="absolute -top-8 left-1/2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                        style={{ transform: `translate(-50%, 0) rotate(${-displayRotation}deg)` }}
                      >
                        {Math.round(displayRotation)}°
                      </div>
                    ) : null}
                    <textarea
                      value={annotation.text}
                      onChange={(event) =>
                        updateTextAnnotation(page.id, annotation.id, (item) => ({
                          ...item,
                          text: event.target.value,
                        }))
                      }
                      onBeforeInput={(event) => {
                        // Clear the placeholder text on first keystroke so the user never types over "Type here".
                        const target = event.currentTarget;
                        if (target.value === TEXT_PLACEHOLDER) {
                          target.value = "";
                        }
                      }}
                      onFocus={() => setFocusedTextId(annotation.id)}
                      onClick={() => setFocusedTextId(annotation.id)}
                      ref={registerTextNode(annotation.id)}
                      className={`min-w-[80px] min-h-[24px] resize-none rounded px-1 py-0.5 text-[12px] leading-snug text-slate-900 transition border border-dashed ${
                        focusedTextId === annotation.id || isDraggingThis
                          ? `${isDraggingThis ? "border-slate-700 bg-white/90" : "border-slate-500 bg-white/80"} shadow-sm`
                          : "border-transparent bg-transparent shadow-none"
                      }`}
                      style={{
                        width: "100%",
                        height: "100%",
                        direction: "ltr",
                        textAlign: "left",
                        backgroundColor: "transparent",
                        fontWeight: textBold ? 700 : 500,
                        fontStyle: textItalic ? "italic" : "normal",
                        fontFamily: TEXT_FONT_OPTIONS[textFont].cssFamily,
                        fontSize: `${displayFontSize}px`,
                      }}
                    />
                    {focusedTextId === annotation.id ? (
                      <div className="absolute -bottom-9 left-0 flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white active:translate-y-[1px]"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextDrag(page.id, annotation.id, event);
                          }}
                        >
                          <Move className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white active:translate-y-[1px]"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextRotate(page.id, annotation.id, event);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300 bg-white/80 text-rose-700 shadow-sm transition hover:bg-rose-50 active:translate-y-[1px]"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteTextAnnotation(page.id, annotation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    {focusedTextId === annotation.id || isResizingThis ? (
                      <div
                        className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-slate-600 bg-white shadow-sm transition hover:border-slate-700 hover:shadow-md"
                        onPointerDown={(event) => {
                          focusTextAnnotation(annotation.id);
                          startTextResize(page.id, annotation.id, event);
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
        {idx === pages.length - 1 ? (
          <div className="mx-auto mt-2 flex items-center justify-center" style={{ width: fittedWidth }}>
            <div className="group relative">
              <button
                type="button"
                aria-label="Add blank page"
                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 transition hover:bg-white hover:shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleAddBlankPageAfter(page.id);
                }}
              >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Add blank page</span>
              </button>
              <div className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                Add blank page
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const commitDraftHighlight = useCallback(
    (stroke: DraftHighlight | null, cancel?: boolean) => {
      if (!stroke || cancel || stroke.points.length < 2) {
        return;
      }
      const smoothedRaw = smoothStrokePoints(stroke.points, stroke.tool);
      const smoothed = stroke.tool === "highlight" ? snapHighlightSegments(smoothedRaw) : smoothedRaw;
      const highlight: HighlightStroke = {
        id: crypto.randomUUID(),
        tool: stroke.tool,
        points: smoothed.map((pt) => ({ ...pt })),
        color: stroke.color,
        opacity: stroke.opacity,
        seed: stroke.seed,
        thickness: stroke.thickness,
      };
      setHighlights((existing) => {
        const nextList = existing[stroke.pageId] ? [...existing[stroke.pageId]] : [];
        nextList.push(highlight);
        return { ...existing, [stroke.pageId]: nextList };
      });
      setHighlightHistory((prev) => [...prev, { type: "add", pageId: stroke.pageId, highlight: cloneStroke(highlight) }]);
      setRedoHighlightHistory([]);
    },
    []
  );

  useEffect(() => {
	      if (deleteMode) {
	        setDraftHighlight(null);
	        setDraftShape(null);
	      }
  }, [deleteMode]);

  function getPointerPoint(
    event: { clientX: number; clientY: number; currentTarget: HTMLDivElement },
    options?: { clampToBounds?: boolean; requireInside?: boolean }
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const clampToBounds = options?.clampToBounds ?? true;
    const requireInside = options?.requireInside ?? clampToBounds;
    const xRaw = (event.clientX - rect.left) / rect.width;
    const yRaw = (event.clientY - rect.top) / rect.height;
    const inside = !(xRaw < 0 || xRaw > 1 || yRaw < 0 || yRaw > 1);
    if (requireInside && !inside) return null;
    return {
      x: clampToBounds ? clamp(xRaw, 0, 1) : xRaw,
      y: clampToBounds ? clamp(yRaw, 0, 1) : yRaw,
      inside,
      rectWidth: rect.width,
    };
  }

  function getActiveTool(): DrawingTool | null {
    if (highlightMode) return "highlight";
    if (textMode) return "text";
    if (penMode) return "pen";
    return null;
  }

  const loadImageDimensions = useCallback(
    (dataUrl: string) =>
      new Promise<{ width: number; height: number }>((resolve) => {
        if (typeof window === "undefined") {
          resolve({ width: 600, height: 200 });
          return;
        }
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth || 600, height: img.naturalHeight || 200 });
        img.onerror = () => resolve({ width: 600, height: 200 });
        img.src = dataUrl;
      }),
    []
  );

  const generateTypedSignatureImage = useCallback(
    async (text: string, styleId: (typeof TYPED_SIGNATURE_STYLES)[number]["id"]) => {
      if (typeof document === "undefined") return null;
      const clean = text.trim();
      if (!clean) return null;
      const canvas = document.createElement("canvas");
      const width = 720;
      const height = 240;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      const style = TYPED_SIGNATURE_STYLES.find((item) => item.id === styleId) ?? TYPED_SIGNATURE_STYLES[0];
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `48px ${style.fontFamily}`;
      ctx.fillText(clean, width / 2, height / 2);
      return canvas.toDataURL("image/png");
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    if (!showSignatureHub || signatureHubStep !== "type") {
      if (!typeSignatureText.trim()) {
        setTypedSignaturePreview(null);
      }
      return;
    }
    if (!typeSignatureText.trim()) {
      setTypedSignaturePreview(null);
      return;
    }
    generateTypedSignatureImage(typeSignatureText, typeSignatureStyle).then((data) => {
      if (mounted) {
        setTypedSignaturePreview(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, [generateTypedSignatureImage, showSignatureHub, signatureHubStep, typeSignatureStyle, typeSignatureText]);

  const saveSignatureEntry = useCallback(
    async (name: string, dataUrl: string, options?: { autoResolveName?: boolean }) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setSignatureNameError("Name your signature.");
        return null;
      }
      let finalName = trimmed;
      const lower = trimmed.toLowerCase();
      const hasConflict = savedSignatures.some((sig) => sig.name.toLowerCase() === lower);
      if (hasConflict) {
        if (options?.autoResolveName) {
          let counter = 2;
          let candidate = `${trimmed} (${counter})`;
          const existingLower = new Set(savedSignatures.map((sig) => sig.name.toLowerCase()));
          while (existingLower.has(candidate.toLowerCase())) {
            counter += 1;
            candidate = `${trimmed} (${counter})`;
          }
          finalName = candidate;
        } else {
          setSignatureNameError("Choose a unique name.");
          return null;
        }
      }
      const { width, height } = await loadImageDimensions(dataUrl);
      const entry: SavedSignature = {
        id: crypto.randomUUID(),
        name: finalName,
        dataUrl,
        naturalWidth: width,
        naturalHeight: height,
        createdAt: Date.now(),
      };
      setSavedSignatures((prev) => [...prev, entry]);
      setSignatureNameError(null);
      return entry;
    },
    [loadImageDimensions, savedSignatures]
  );

  const closeSignatureHub = useCallback(() => {
    setShowSignatureHub(false);
    setSignatureHubStep("gallery");
    setTypeSignatureText("");
    setTypedSignaturePreview(null);
    setTypedSignatureError(null);
    setSignatureNameError(null);
    setSignaturePanelMode("none");
    setShowDrawModal(false);
    setShowUploadModal(false);
    setMobileSessionId(null);
    setMobileSessionUrl(null);
    setMobileSessionStatus("idle");
  }, []);

  const beginSignaturePlacement = useCallback((signature: SavedSignature) => {
    setPendingSignatureForPlacement(signature);
    setActiveSignaturePlacementId(null);
    setDeleteMode(false);
    setHighlightMode(false);
    setTextMode(false);
    setPenMode(false);
  }, []);

  const placeSignatureAtPoint = useCallback(
    (signature: SavedSignature, pageId: string, point: { x: number; y: number }) => {
      const pageIndex = pages.findIndex((p) => p.id === pageId);
      const aspect = signature.naturalHeight && signature.naturalWidth ? signature.naturalHeight / signature.naturalWidth : 0.35;
      const baseWidth = clamp(0.3, 0.18, 0.42); // middle-ground width for initial placement
      const width = baseWidth;
      const height = clamp(width * aspect, 0.06, 0.6);
      const x = clamp(point.x - width / 2, 0, 1 - width);
      const y = clamp(point.y - height / 2, 0, 1 - height);
      const placement: SignaturePlacement = {
        id: crypto.randomUUID(),
        signatureId: signature.id,
        name: signature.name,
        dataUrl: signature.dataUrl,
        pageId,
        pageIndex,
        x,
        y,
        width,
        height,
        rotation: 0,
        status: "draft",
      };
      setSignaturePlacements((prev) => {
        const existing = prev[pageId] ?? [];
        return { ...prev, [pageId]: [...existing, placement] };
      });
      setActiveSignaturePlacementId(placement.id);
      setPendingSignatureForPlacement(null);
    },
    [pages]
  );

  const applySignatureToActivePage = useCallback(
    (signature: SavedSignature) => {
      beginSignaturePlacement(signature);
      const targetPageId = activePageId || pages[0]?.id;
      if (targetPageId) {
        placeSignatureAtPoint(signature, targetPageId, { x: 0.5, y: 0.5 });
        setActiveSignaturePlacementId((prev) => prev);
      }
    },
    [activePageId, beginSignaturePlacement, pages, placeSignatureAtPoint]
  );

  function getPageNormalizedPoint(pageId: string, clientX: number, clientY: number) {
    const node = previewNodeMap.current.get(pageId);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }

  const startSignatureDrag = useCallback(
    (pageId: string, placementId: string, startEvent: ReactPointerEvent<HTMLElement>) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const placement = signaturePlacements[pageId]?.find((p) => p.id === placementId);
      if (!placement) return;
      const startPoint = getPageNormalizedPoint(pageId, startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;
      const offsetX = startPoint.x - placement.x;
      const offsetY = startPoint.y - placement.y;
      const pointerId = startEvent.pointerId;
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        setSignaturePlacements((prev) => {
          const existing = prev[pageId] ?? [];
          const updated = existing.map((item) =>
            item.id === placementId
              ? {
                  ...item,
                  x: clamp(point.x - offsetX, 0, 1 - item.width),
                  y: clamp(point.y - offsetY, 0, 1 - item.height),
                }
              : item
          );
          return { ...prev, [pageId]: updated };
        });
      };
      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        cleanup();
      };
      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        setSignatureDrag(null);
      }
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      setSignatureDrag({ pageId, id: placementId, offsetX, offsetY });
    },
    [getPageNormalizedPoint, signaturePlacements]
  );

  const startSignatureResize = useCallback(
    (pageId: string, placementId: string, startEvent: ReactPointerEvent<HTMLDivElement>) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const placement = signaturePlacements[pageId]?.find((p) => p.id === placementId);
      if (!placement) return;
      const startPoint = getPageNormalizedPoint(pageId, startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;
      const pointerId = startEvent.pointerId;
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        const deltaX = point.x - startPoint.x;
        const deltaY = point.y - startPoint.y;
        setSignaturePlacements((prev) => {
          const existing = prev[pageId] ?? [];
          const updated = existing.map((item) => {
            if (item.id !== placementId) return item;
            const nextWidth = clamp(item.width + deltaX, 0.08, 1 - item.x);
            const nextHeight = clamp(item.height + deltaY, 0.04, 1 - item.y);
            return { ...item, width: nextWidth, height: nextHeight };
          });
          return { ...prev, [pageId]: updated };
        });
      };
      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        cleanup();
      };
      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        setSignatureResize(null);
      }
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      setSignatureResize({
        pageId,
        id: placementId,
        pointerId,
        startWidth: placement.width,
        startHeight: placement.height,
        startX: startPoint.x,
        startY: startPoint.y,
      });
    },
    [getPageNormalizedPoint, signaturePlacements]
  );

  const startSignatureRotate = useCallback(
    (pageId: string, placementId: string, startEvent: ReactPointerEvent<HTMLButtonElement>) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const target = previewNodeMap.current.get(pageId);
      const placement = signaturePlacements[pageId]?.find((p) => p.id === placementId);
      if (!target || !placement) return;
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width * (placement.x + placement.width / 2);
      const centerY = rect.top + rect.height * (placement.y + placement.height / 2);
      let lastAngle = Math.atan2(startEvent.clientY - centerY, startEvent.clientX - centerX);
      let accumulatedDelta = 0;
      const baseRotation = placement.rotation ?? 0;
      const pointerId = startEvent.pointerId;

      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        let delta = angle - lastAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        accumulatedDelta += delta;
        lastAngle = angle;
        const deltaDegrees = (accumulatedDelta * 180) / Math.PI;
        const nextRotation = baseRotation + deltaDegrees;
        setSignaturePlacements((prev) => {
          const existing = prev[pageId] ?? [];
          const updated = existing.map((item) =>
            item.id === placementId ? { ...item, rotation: nextRotation } : item
          );
          return { ...prev, [pageId]: updated };
        });
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        setSignatureRotate(null);
      };

      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        cleanup();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      setSignatureRotate({ pageId, id: placementId, pointerId, centerX, centerY, baseRotation });
    },
    [signaturePlacements]
  );

  const addSignatureToPage = useCallback((payload: SignaturePlacement) => {
    // Stub: wire into real PDF flattening later.
    console.log("addSignatureToPage", payload);
  }, []);

  const handleApplySignaturePlacement = useCallback(
    (pageId: string, placementId: string) => {
      const placement = signaturePlacements[pageId]?.find((p) => p.id === placementId);
      if (!placement) return;
      setSignaturePlacements((prev) => {
        const existing = prev[pageId] ?? [];
        const updated: SignaturePlacement[] = existing.map((item) =>
          item.id === placementId ? { ...item, status: "placed" as const } : item
        );
        return { ...prev, [pageId]: updated };
      });
      addSignatureToPage(placement);
      setPendingSignatureForPlacement(null);
    },
    [addSignatureToPage, signaturePlacements]
  );

  const handleDeleteSignaturePlacement = useCallback((pageId: string, placementId: string) => {
    setSignaturePlacements((prev) => {
      const existing = prev[pageId] ?? [];
      return { ...prev, [pageId]: existing.filter((item) => item.id !== placementId) };
    });
    setActiveSignaturePlacementId((prev) => (prev === placementId ? null : prev));
  }, []);

  function registerTextNode(id: string) {
    return (node: HTMLTextAreaElement | null) => {
      if (node) {
        textNodeRefs.current.set(id, node);
      } else {
        textNodeRefs.current.delete(id);
      }
    };
  }

  function registerTextAnnotationNode(id: string) {
    return (node: HTMLDivElement | null) => {
      if (node) {
        textAnnotationRefs.current.set(id, node);
      } else {
        textAnnotationRefs.current.delete(id);
      }
    };
  }

  function updateTextAnnotation(
    pageId: string,
    id: string,
    updater: (annotation: TextAnnotation) => TextAnnotation
  ) {
    setTextAnnotations((prev) => {
      const existing = prev[pageId] ?? [];
      const updated = existing.map((item) => (item.id === id ? updater(item) : item));
      return { ...prev, [pageId]: updated };
    });
  }

  function syncTextAnnotationSize(pageId: string, id: string, element: HTMLElement) {
    const node = previewNodeMap.current.get(pageId);
    if (!node) return;
    const containerRect = node.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;
    const boxRect = element.getBoundingClientRect();
    const width = clamp(boxRect.width / containerRect.width, 0.02, 1);
    const height = clamp(boxRect.height / containerRect.height, 0.02, 1);
    updateTextAnnotation(pageId, id, (annotation) => ({ ...annotation, width, height }));
  }

  function deleteTextAnnotation(pageId: string, id: string) {
    setTextAnnotations((prev) => {
      const existing = prev[pageId] ?? [];
      return { ...prev, [pageId]: existing.filter((item) => item.id !== id) };
    });
    setFocusedTextId((current) => (current === id ? null : current));
  }

  const startTextRotate = useCallback(
    (pageId: string, annotationId: string, startEvent: ReactPointerEvent<HTMLButtonElement>) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const target = textAnnotationRefs.current.get(annotationId);
      const annotation = textAnnotations[pageId]?.find((a) => a.id === annotationId);
      if (!target || !annotation) return;
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let lastAngle = Math.atan2(startEvent.clientY - centerY, startEvent.clientX - centerX);
      let accumulatedDelta = 0;
      const baseRotation = annotation.rotation ?? 0;
      const pointerId = startEvent.pointerId;

      textRotateCleanupRef.current?.();

      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        let delta = angle - lastAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        accumulatedDelta += delta;
        lastAngle = angle;
        const deltaDegrees = (accumulatedDelta * 180) / Math.PI;
        const nextRotation = baseRotation + deltaDegrees;
        setTextAnnotations((prev) => {
          const existing = prev[pageId] ?? [];
          const updated = existing.map((item) =>
            item.id === annotationId ? { ...item, rotation: nextRotation } : item
          );
          return { ...prev, [pageId]: updated };
        });
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        textRotateCleanupRef.current = null;
        setRotatingText(null);
      };

      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        cleanup();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      textRotateCleanupRef.current = cleanup;
      setRotatingText({ pageId, id: annotationId, pointerId });
    },
    [textAnnotations]
  );


  const itemsIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const downloadDisabled = busy || pages.length === 0;
	  const activePageIndex = activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : -1;
	  // 100% = "fit whole page". Other % scale from that baseline.
	  const zoomMultiplier = clamp(zoomPercent / 100, ZOOM_MIN_PERCENT / 100, MAX_ZOOM_MULTIPLIER);
  const zoomLabel = `${Math.round(zoomPercent)}%`;
  const highlightButtonDisabled = pages.length === 0 || loading;
  const highlightColorEntries = Object.entries(
    HIGHLIGHT_COLORS
  ) as [HighlightColorKey, string][];
  const textFontEntries = useMemo(
    () => Object.entries(TEXT_FONT_OPTIONS) as [TextFont, FontOption][],
    []
  );
  const highlightButtonOn = highlightMode && !highlightButtonDisabled;
  const selectButtonOn = selectMode && !highlightButtonDisabled;
  const textButtonOn = textMode && !highlightButtonDisabled;
  const signatureButtonOn = signaturePanelMode !== "none" || showSignatureHub;
  const highlightActive = highlightButtonOn && !deleteMode;
  const selectActive = selectButtonOn && !deleteMode;
  const textActive = textButtonOn && !deleteMode;
  const mobileCaptureLink = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/sign-on-mobile` : "https://mergifypdf.com/sign-on-mobile"),
    []
  );
	  const shapeButtonOn = shapeMode && !highlightButtonDisabled;
	  const shapeActive = shapeButtonOn && !deleteMode;
	  const drawButtonOn = penMode && !highlightButtonDisabled && !deleteMode;
	  const highlightButtonVisualOn = highlightButtonOn && !deleteMode;
	  const shapeButtonVisualOn = shapeButtonOn && !deleteMode;
	  const showToolOptionsBar = !highlightButtonDisabled && !selectMode && (shapeMode || highlightMode || penMode || textMode);
	  const activeDrawingTool: (DrawingTool | "shape") | null = highlightActive
	    ? "highlight"
	    : selectActive
	    ? null
    : shapeActive
    ? "shape"
    : textActive
    ? "text"
    : penMode && !deleteMode && !highlightButtonDisabled
    ? "pen"
    : null;

  const clearToolPreviewTimer = useCallback(() => {
    if (toolPreviewTimerRef.current) {
      window.clearTimeout(toolPreviewTimerRef.current);
      toolPreviewTimerRef.current = null;
    }
  }, []);

  const enterToolMode = useCallback(
    (mode: Exclude<HeaderMode, "default">) => {
      clearToolPreviewTimer();
      setToolbarPreviewMode(null);
      setHeaderMode(mode);
      setRedoHighlightHistory([]);
      setSelectMode(false);
      setOrganizeMode(false);
      setShowSignatureHub(false);
      setSignaturePanelMode("none");
      setPendingSignatureForPlacement(null);
      setDeleteMode(false);
      setTextMode(false);
      setDraftHighlight(null);
      setDraftShape(null);
      setHighlightMode(mode === "highlight");
      setPenMode(mode === "pen");
      setShapeMode(mode === "shapes");
    },
    [clearToolPreviewTimer]
  );

	  const enterToolModeWithPreview = useCallback(
	    (mode: Exclude<HeaderMode, "default">) => {
	      clearToolPreviewTimer();
        setSelectMode(false);
        setDeleteMode(false);
	      setToolbarPreviewMode(mode);
	      toolPreviewTimerRef.current = window.setTimeout(() => {
	        toolPreviewTimerRef.current = null;
	        enterToolMode(mode);
	      }, 180);
	    },
	    [clearToolPreviewTimer, enterToolMode]
	  );

		  const exitToolMode = useCallback(() => {
        clearToolPreviewTimer();
        setToolbarPreviewMode(null);
		    setHeaderMode("default");
        setSelectMode(true);
		    setHighlightMode(false);
        setShapeMode(false);
		    setTextMode(false);
		    setDraftHighlight(null);
        setDraftShape(null);
		    setShowSignatureHub(false);
		    setSignaturePanelMode("none");
		    setPendingSignatureForPlacement(null);
		    setDeleteMode(false);
		    setPenMode(false);
		  }, [clearToolPreviewTimer]);
  const highlightCount = useMemo(
    () => Object.values(highlights).reduce((sum, list) => sum + list.length, 0),
    [highlights]
  );
  const shapeCount = useMemo(
    () => Object.values(shapesByPage).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [shapesByPage]
  );
  const textAnnotationCount = useMemo(
    () => Object.values(textAnnotations).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [textAnnotations]
  );
  const signaturePlacementCount = useMemo(
    () => Object.values(signaturePlacements).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [signaturePlacements]
  );
  const hasAnyTextAnnotations = textAnnotationCount > 0;
  const hasAnyAnnotations = highlightCount > 0 || shapeCount > 0 || hasAnyTextAnnotations || signaturePlacementCount > 0;
  useEffect(() => {
    updatePreviewHeightLimit();
  }, [updatePreviewHeightLimit, pages.length, activePageIndex]);
  const hasWorkspaceData =
    pages.length > 0 ||
    highlightCount > 0 ||
    shapeCount > 0 ||
    textAnnotationCount > 0 ||
    signaturePlacementCount > 0 ||
    !!draftHighlight ||
    !!draftShape ||
    !!draftTextBox;

  const buildCloudProjectData = useCallback(() => {
    if (!hasWorkspaceData) return null;
    // Prefer the higher-resolution preview image for cards.
    const cloudThumb =
      firstPageThumb ??
      (pages.length > 0 ? pages[0]?.preview ?? pages[0]?.thumb ?? null : null);
    const pageThumbs = pages
      .map((page) => page.preview ?? page.thumb)
      .filter((src): src is string => typeof src === "string" && src.length > 0)
      .slice(0, 24);
	      return {
	      name: projectName,
      firstPageThumb: cloudThumb,
      previewUrl: cloudThumb,
      pagesCount: pages.length,
      pageThumbs,
      sources: sources.map((source) => ({
        id: source.storageId,
        name: source.name,
        size: source.size,
        updatedAt: source.updatedAt,
      })),
	      pages: pages.map((page) => ({
	        id: page.id,
	        srcIdx: page.srcIdx,
	        pageIdx: page.pageIdx,
	        rotation: page.rotation,
	        width: page.width,
	        height: page.height,
	      })),
	      highlights,
	      shapesByPage,
	      textAnnotations,
	      signaturePlacements,
	      savedSignatures,
	    };
	  }, [
	    hasWorkspaceData,
	    pages,
	    firstPageThumb,
	    projectName,
	    sources,
	    highlights,
	    shapesByPage,
	    textAnnotations,
	    signaturePlacements,
	    savedSignatures,
	  ]);

  useEffect(() => {
    if (!currentProjectId || !firstPageThumb) return;
    if (lastPersistedThumbRef.current === firstPageThumb) return;
    const payload = buildCloudProjectData();
    if (!payload) return;
    lastPersistedThumbRef.current = firstPageThumb;
    void saveProject(projectName, payload);
  }, [buildCloudProjectData, currentProjectId, firstPageThumb, projectName, saveProject]);

  useEffect(() => {
    if (!authSession?.user) return;
    if (!hasWorkspaceData) return;
    const ownerId = authSession.user.id ?? authSession.user.email ?? null;
    if (!ownerId) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const projectData = buildCloudProjectData();
      if (!projectData || cancelled) return;
      void saveProject(projectName, projectData).then((saved) => {
        if (!saved || cancelled) return;
        addRecentProject(ownerId, saved.name ?? projectName, saved.id);
      });
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authSession?.user, buildCloudProjectData, hasWorkspaceData, projectName, saveProject]);

		  const computeBaseScale = useCallback(() => {
		    const container = previewContainerRef.current;
		    if (!container || pages.length === 0) return;
		    const targetIndex = activePageIndex >= 0 ? activePageIndex : 0;
		    const targetPage = pages[targetIndex];
		    const naturalWidth = targetPage?.width || 612;
		    const naturalHeight = targetPage?.height || naturalWidth * DEFAULT_ASPECT_RATIO;
		    // Rotation should not affect zoom/fit scaling. A rotated page is still the same page,
		    // just turned; users can pan/scroll to see it rather than the app re-zooming.
		    const baseWidth = naturalWidth;
		    const baseHeight = naturalHeight;

		    const fitPadding = 0.98; // breathing room around the page
		    const horizontalGutter = 72; // ~36px per side
		    const verticalGutter = 40; // slight top/bottom breathing room

		    const availableWidth = Math.max(container.clientWidth - horizontalGutter, 200);
		    const availableHeight = Math.max(container.clientHeight - verticalGutter, 200);

		    // Baseline: 100% shows the whole page.
		    const fitWholePageScale = Math.max(
		      0.2,
		      Math.min(availableWidth / baseWidth, availableHeight / baseHeight) * fitPadding,
		    );

		    // Default zoom: fit-to-width (still leaving side space).
		    const fitWidthScale = Math.max(0.2, (availableWidth / baseWidth) * fitPadding);
		    const desiredZoomPercent = clamp(
		      Math.round((fitWidthScale / fitWholePageScale) * 100),
		      ZOOM_MIN_PERCENT,
		      ZOOM_MAX_PERCENT,
		    );

		    if (!userAdjustedZoom) {
		      setZoomPercent((prev) => (prev === desiredZoomPercent ? prev : desiredZoomPercent));
		    }
		    setBaseScale((prev) => (Math.abs(prev - fitWholePageScale) > 0.001 ? fitWholePageScale : prev));
		  }, [activePageIndex, pages, userAdjustedZoom]);

	  useEffect(() => {
	    if (!shouldCenterOnChange) return;
	    const container = previewContainerRef.current;
	    const targetId = activePageId || pages[activePageIndex]?.id || null;
	    const target = targetId ? previewNodeMap.current.get(targetId) ?? null : null;
	    if (!container || !target) return;
	    const targetRect = target.getBoundingClientRect();
	    const containerRect = container.getBoundingClientRect();
    const scrollTop =
      container.scrollTop +
      (targetRect.top - containerRect.top) +
      targetRect.height / 2 -
      container.clientHeight / 2;
    const scrollLeft =
      container.scrollLeft +
      (targetRect.left - containerRect.left) +
      targetRect.width / 2 -
      container.clientWidth / 2;
	    container.scrollTo({
	      top: Math.max(0, scrollTop),
	      left: Math.max(0, scrollLeft),
	      behavior: "smooth",
	    });
	    setShouldCenterOnChange(false);
	  }, [activePageId, activePageIndex, baseScale, pages, shouldCenterOnChange, zoomMultiplier]);

  useEffect(() => {
    function handleResize() {
      if (userAdjustedZoom) return; // keep user-chosen zoom steady across resizes
      computeBaseScale();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [computeBaseScale, userAdjustedZoom]);

	  const setZoomWithScrollPreserved = useCallback(
	    (nextPercent: number) => {
	      const clamped = clamp(nextPercent, ZOOM_MIN_PERCENT, ZOOM_MAX_PERCENT);
	      const container = previewContainerRef.current;
	      if (container) {
	        const maxX = Math.max(1, container.scrollWidth);
	        const maxY = Math.max(1, container.scrollHeight - container.clientHeight);
        scrollRatioRef.current = {
          x: clamp(
            (container.scrollLeft + container.clientWidth / 2) / maxX,
            0,
            1
          ),
          y: maxY > 0 ? clamp(container.scrollTop / maxY, 0, 1) : 0,
        };
      }
	      setUserAdjustedZoom(true);
	      restoreScrollOnNextZoomRef.current = true;
	      setZoomPercent(clamped);
	    },
	    []
	  );

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    if (!restoreScrollOnNextZoomRef.current) return;
    restoreScrollOnNextZoomRef.current = false;
    const { x, y } = scrollRatioRef.current;
    requestAnimationFrame(() => {
      const maxX = Math.max(0, container.scrollWidth - container.clientWidth);
      const maxY = Math.max(0, container.scrollHeight - container.clientHeight);
      const targetLeft = x * container.scrollWidth - container.clientWidth / 2;
      container.scrollLeft = clamp(targetLeft, 0, maxX);
      container.scrollTop = clamp(maxY * y, 0, maxY);
    });
  }, [zoomPercent]);

  function handleShapePointerDown(pageId: string, event: ReactPointerEvent<HTMLDivElement>) {
    const point = getPointerPoint(event, { requireInside: true, clampToBounds: true });
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraftShape({
      pageId,
      type: shapeType,
      start: { x: point.x, y: point.y },
      end: { x: point.x, y: point.y },
      color: shapeColor,
      thickness: shapeThickness / point.rectWidth,
    });
    event.preventDefault();
  }

  function handleShapePointerMove(pageId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (!draftShape || draftShape.pageId !== pageId) return;
    const point = getPointerPoint(event, { requireInside: false, clampToBounds: true });
    if (!point) return;
    setDraftShape((prev) => (prev && prev.pageId === pageId ? { ...prev, end: { x: point.x, y: point.y } } : prev));
    event.preventDefault();
  }

  function handleShapePointerUp(pageId: string) {
    if (!draftShape || draftShape.pageId !== pageId) return;
    const { w, h } = shapeBounds(draftShape);
    if (Math.max(w, h) < 0.01) {
      setDraftShape(null);
      return;
    }
    const shape: ShapeAnnotation = {
      id: crypto.randomUUID(),
      type: draftShape.type,
      pageId,
      start: { ...draftShape.start },
      end: { ...draftShape.end },
      color: draftShape.color,
      thickness: draftShape.thickness,
    };
    setShapesByPage((prev) => {
      const list = prev[pageId] ? [...prev[pageId]] : [];
      list.push(shape);
      return { ...prev, [pageId]: list };
    });
    setHighlightHistory((prev) => [
      ...prev,
      { type: "addShape", pageId, shape: { ...shape, start: { ...shape.start }, end: { ...shape.end } } },
    ]);
    setRedoHighlightHistory([]);
    setDraftShape(null);
  }

  function handleMarkupPointerDown(pageId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (pendingSignatureForPlacement) {
      const point = getPointerPoint(event, { requireInside: true, clampToBounds: true });
      if (point) {
        placeSignatureAtPoint(pendingSignatureForPlacement, pageId, point);
      }
      event.preventDefault();
      return;
    }
    if (!event.target || !(event.target as HTMLElement).closest("[data-text-annotation]")) {
      clearTextFocus();
    }
    if (deleteMode) return;
    if (shapeMode) {
      handleShapePointerDown(pageId, event);
      return;
    }
    const tool = getActiveTool();
    if (!tool) return;
    const point = getPointerPoint(event, { requireInside: true, clampToBounds: true });
    if (!point) return;
    if (tool === "text") {
      setDraftTextBox({
        pageId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      event.preventDefault();
      return;
    }
    strokeOutsidePageRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const baseThickness = tool === "highlight" ? highlightThickness : penThickness;
    setDraftHighlight({
      tool,
      pageId,
      points: [{ x: point.x, y: point.y }],
      color:
        tool === "highlight"
          ? HIGHLIGHT_COLORS[highlightColor]
          : penColor,
      opacity: tool === "highlight" ? highlightOpacity : 1,
      thickness: baseThickness / point.rectWidth,
    });
    event.preventDefault();
  }

  function handleMarkupPointerMove(pageId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (deleteMode) return;
    if (shapeMode) {
      handleShapePointerMove(pageId, event);
      return;
    }
    if (getActiveTool() === "text") {
      if (!draftTextBox || draftTextBox.pageId !== pageId) return;
      const point = getPointerPoint(event, { requireInside: true, clampToBounds: true });
      if (!point) return;
      setDraftTextBox((prev) => (prev ? { ...prev, currentX: point.x, currentY: point.y } : prev));
      event.preventDefault();
      return;
    }
    const point = getPointerPoint(event, { clampToBounds: false, requireInside: false });
    if (!point) return;
    if (!point.inside) {
      lastOutsideRawRef.current = { x: point.x, y: point.y };
      if (!strokeOutsidePageRef.current) {
        strokeOutsidePageRef.current = true;
        setDraftHighlight((prev) => {
          if (!prev || prev.pageId !== pageId) return prev;
          const nextPoints = [...prev.points];
          for (let i = nextPoints.length - 1; i >= 0; i--) {
            const candidate = nextPoints[i];
            if (candidate && !candidate.move) {
              const boundary = intersectUnitSquareBoundary(candidate, point, false);
              if (boundary) {
                const last = nextPoints[nextPoints.length - 1];
                const eps = 0.0005;
                if (!last || Math.abs(last.x - boundary.x) > eps || Math.abs(last.y - boundary.y) > eps) {
                  nextPoints.push({ x: boundary.x, y: boundary.y });
                }
              }
              break;
            }
          }
          return { ...prev, points: nextPoints };
        });
      }
      return;
    }

    if (strokeOutsidePageRef.current) {
      strokeOutsidePageRef.current = false;
      const outside = lastOutsideRawRef.current;
      lastOutsideRawRef.current = null;
      setDraftHighlight((prev) => {
        if (!prev || prev.pageId !== pageId) return prev;
        const nextPoints = [...prev.points];
        const boundary = outside ? intersectUnitSquareBoundary(outside, point, true) : null;
        nextPoints.push({
          x: boundary?.x ?? clamp(point.x, 0, 1),
          y: boundary?.y ?? clamp(point.y, 0, 1),
          move: true,
        });
        nextPoints.push({ x: point.x, y: point.y });
	      return {
	        ...prev,
	        points: nextPoints,
	        thickness:
	          (prev.tool === "highlight" ? highlightThickness : penThickness) / point.rectWidth,
	      };
	    });
    event.preventDefault();
    return;
  }

    setDraftHighlight((prev) => {
      if (!prev || prev.pageId !== pageId) return prev;
      const nextPoints = [...prev.points];
      const last = nextPoints[nextPoints.length - 1];
      if (!last || pointDistance(last, { x: point.x, y: point.y }) > 0.004) {
        nextPoints.push({ x: point.x, y: point.y });
      }
	      return {
	        ...prev,
	        points: nextPoints,
	        thickness:
	          (prev.tool === "highlight" ? highlightThickness : penThickness) / point.rectWidth,
	      };
	    });
    if (draftHighlight?.pageId === pageId) {
      event.preventDefault();
    }
  }

  function handleMarkupPointerUp(pageId: string) {
    if (deleteMode) return;
    if (shapeMode) {
      handleShapePointerUp(pageId);
      return;
    }
    if (getActiveTool() === "text") {
      if (draftTextBox && draftTextBox.pageId === pageId) {
        const widthDelta = Math.abs(draftTextBox.currentX - draftTextBox.startX);
        const heightDelta = Math.abs(draftTextBox.currentY - draftTextBox.startY);
        if (widthDelta < 0.005 && heightDelta < 0.005) {
          setDraftTextBox(null);
          return;
        }
        const width = Math.max(widthDelta, 0.04);
        const height = Math.max(heightDelta, 0.03);
        const x = Math.min(draftTextBox.startX, draftTextBox.currentX);
        const y = Math.min(draftTextBox.startY, draftTextBox.currentY);
        const annotationId = crypto.randomUUID();
        const pageIndex = pages.findIndex((p) => p.id === pageId);
        setTextAnnotations((prev) => {
          const existing = prev[pageId] ?? [];
          return {
            ...prev,
            [pageId]: [
              ...existing,
              {
                id: annotationId,
                pageId,
                pageIndex,
                x,
                y,
                width,
                height,
                text: TEXT_PLACEHOLDER,
                rotation: 0,
              },
            ],
          };
        });
        setFocusedTextId(annotationId);
        setDraftTextBox(null);
      }
      return;
    }
    strokeOutsidePageRef.current = false;
    lastOutsideRawRef.current = null;
    setDraftHighlight((prev) => {
      if (!prev || prev.pageId !== pageId) return prev;
      commitDraftHighlight(prev);
      return null;
    });
  }

  function handlePageStep(direction: 1 | -1) {
    if (pages.length === 0) return;
    let currentIndex = pages.findIndex((p) => p.id === activePageId);
    if (currentIndex === -1) currentIndex = 0;
    const nextIndex = Math.min(
      pages.length - 1,
      Math.max(0, currentIndex + direction)
    );
    const targetPage = pages[nextIndex];
    if (targetPage) {
      handleSelectPage(nextIndex);
    }
  }

  const prepareDrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = getDevicePixelRatio();
    const width = 640;
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.fillStyle = "white";
    ctx.clearRect(0, 0, width, height);
    drawLastPointRef.current = null;
  }, []);

  const clearDrawCanvas = useCallback(() => {
    prepareDrawCanvas();
    setDrawnSignatureData(null);
  }, [prepareDrawCanvas]);

  const handleDrawPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = drawCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawingSignature(true);
      drawLastPointRef.current = { x, y };
    },
    []
  );

  const handleDrawPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingSignature) return;
      const canvas = drawCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const last = drawLastPointRef.current;
      if (!last) {
        ctx.lineTo(x, y);
        ctx.stroke();
        drawLastPointRef.current = { x, y };
        return;
      }
      const midX = (last.x + x) / 2;
      const midY = (last.y + y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, midX, midY);
      ctx.stroke();
      drawLastPointRef.current = { x, y };
    },
    [isDrawingSignature]
  );

  const handleDrawPointerUp = useCallback(() => {
    setIsDrawingSignature(false);
    drawLastPointRef.current = null;
  }, []);

  const handleDrawContinue = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setDrawnSignatureData(data);
    setDrawStep("name");
    setDrawSignatureName((prev) => prev || `Signature ${savedSignatures.length + 1}`);
    setSignatureNameError(null);
    setDrawSignatureError(null);
  }, [savedSignatures.length]);

  const handleSaveDrawnSignature = useCallback(async () => {
    if (!drawnSignatureData) {
      setDrawSignatureError("Please draw a signature first.");
      return;
    }
    const entry = await saveSignatureEntry(
      drawSignatureName || `Signature ${savedSignatures.length + 1}`,
      drawnSignatureData
    );
    if (!entry) {
      setDrawSignatureError(signatureNameError ?? "Give your signature a unique name.");
      return;
    }
    setShowDrawModal(false);
    setDrawStep("canvas");
    setDrawSignatureName("");
    setDrawnSignatureData(null);
    setSignaturePanelMode("saved");
    setSignatureHubStep("gallery");
    setShowSignatureHub(false);
    applySignatureToActivePage(entry);
  }, [
    applySignatureToActivePage,
    drawSignatureName,
    drawnSignatureData,
    saveSignatureEntry,
    savedSignatures.length,
    signatureNameError,
  ]);

  const handleCloseDrawModal = useCallback(() => {
    setShowDrawModal(false);
    setShowSignatureHub(true);
    setDrawStep("canvas");
    setDrawSignatureName("");
    setSignatureNameError(null);
    setDrawSignatureError(null);
    setDrawnSignatureData(null);
    setSignaturePanelMode("saved");
  }, []);

  const handleSaveUploadedSignature = useCallback(async () => {
    if (!uploadPreview) {
      setUploadError("Upload an image file first.");
      return;
    }
    const entry = await saveSignatureEntry(uploadName || `Signature ${savedSignatures.length + 1}`, uploadPreview);
    if (!entry) {
      setUploadError(signatureNameError ?? "Name must be unique.");
      return;
    }
    setShowUploadModal(false);
    setUploadName("");
    setUploadError(null);
    setUploadPreview(null);
    setSignaturePanelMode("saved");
    setSignatureHubStep("gallery");
    setShowSignatureHub(false);
    applySignatureToActivePage(entry);
  }, [
    applySignatureToActivePage,
    saveSignatureEntry,
    savedSignatures.length,
    signatureNameError,
    uploadName,
    uploadPreview,
  ]);

  const handleCloseUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setShowSignatureHub(true);
    setUploadName("");
    setUploadPreview(null);
    setUploadError(null);
    setSignatureNameError(null);
    setSignaturePanelMode("saved");
  }, []);

  const handleSaveTypedSignature = useCallback(async () => {
    if (!typeSignatureText.trim()) {
      setTypedSignatureError("Enter your name or initials.");
      return;
    }
    const rendered = await generateTypedSignatureImage(typeSignatureText, typeSignatureStyle);
    if (!rendered) {
      setTypedSignatureError("Could not render that style. Try again.");
      return;
    }
    const entry = await saveSignatureEntry(typeSignatureText, rendered);
    if (!entry) return;
    setSignatureHubStep("gallery");
    setShowSignatureHub(false);
    setTypedSignatureError(null);
    setSignaturePanelMode("saved");
    applySignatureToActivePage(entry);
  }, [
    applySignatureToActivePage,
    generateTypedSignatureImage,
    saveSignatureEntry,
    typeSignatureStyle,
    typeSignatureText,
  ]);

  const handleCopyMobileLink = useCallback(async () => {
    try {
      const link = mobileSessionUrl ?? mobileCaptureLink;
      await navigator.clipboard?.writeText(link);
    } catch {
      // ignore copy failures
    }
  }, [mobileCaptureLink, mobileSessionUrl]);

  const startMobileSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    setMobileSessionStatus("waiting");
    setMobileSessionUrl(null);
    try {
      const res = await fetch("/api/sign-session", { method: "POST", cache: "no-store" });
      if (!res.ok) {
        throw new Error("Could not start session.");
      }
      const data = (await res.json()) as { id: string };
      const origin = window.location.origin;
      setMobileSessionId(data.id);
      setMobileSessionUrl(`${origin}/sign-on-mobile/${data.id}`);
      setMobileSessionStatus("waiting");
    } catch (err) {
      console.error(err);
      setMobileSessionStatus("error");
    }
  }, []);

  useEffect(() => {
    if (signatureHubStep === "qr" || signatureHubStep === "email") {
      startMobileSession();
    } else {
      setMobileSessionId(null);
      setMobileSessionUrl(null);
      setMobileSessionStatus("idle");
    }
  }, [signatureHubStep, startMobileSession]);

  useEffect(() => {
    if (!mobileSessionId || (signatureHubStep !== "qr" && signatureHubStep !== "email")) return;
    let cancelled = false;
    let handled = false;

    const poll = async () => {
      if (handled) return;
      try {
        const res = await fetch(`/api/sign-session/${mobileSessionId}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status >= 500) setMobileSessionStatus("error");
          return;
        }
        const data = (await res.json()) as { id: string; signatureDataUrl: string | null; name: string | null };
        if (cancelled) return;
        if (data.signatureDataUrl) {
          handled = true;
          setMobileSessionStatus("received");
          const uniqueName = data.name?.trim()
            ? data.name
            : `Mobile signature ${data.id.slice(0, 6)}-${Date.now().toString().slice(-4)}`;
          const entry = await saveSignatureEntry(uniqueName, data.signatureDataUrl, { autoResolveName: true });
          if (entry) {
            applySignatureToActivePage(entry);
          }
          setSignaturePanelMode("saved");
          setSignatureHubStep("gallery");
          setMobileSessionId(null);
          setMobileSessionUrl(null);
          setMobileSessionStatus("idle");
        }
      } catch (err) {
        if (!cancelled) {
          setMobileSessionStatus("error");
        }
      }
    };
    const interval = window.setInterval(poll, 2500);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    applySignatureToActivePage,
    mobileSessionId,
    saveSignatureEntry,
    setSignatureHubStep,
    setSignaturePanelMode,
    setMobileSessionId,
    setMobileSessionStatus,
    setMobileSessionUrl,
    signatureHubStep,
  ]);

  const handleOpenDrawFromHub = useCallback(() => {
    setShowSignatureHub(false);
    setShowDrawModal(true);
    setDrawStep("canvas");
    setDrawSignatureName("");
    setDrawSignatureError(null);
    setDrawnSignatureData(null);
  }, []);

  const handleOpenUploadFromHub = useCallback(() => {
    setShowSignatureHub(false);
    setShowUploadModal(true);
    setUploadPreview(null);
    setUploadName("");
    setUploadError(null);
  }, []);

  const handleUploadFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setUploadPreview(result);
      }
    };
    reader.onerror = () => {
      setUploadError("Could not read that file. Try a PNG, JPG, or SVG.");
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (!showDrawModal) return;
    prepareDrawCanvas();
  }, [prepareDrawCanvas, showDrawModal]);


  /** Drag end reorders the pages array */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((x) => x.id === active.id);
    const newIndex = pages.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setPages((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  async function handleSaveProject() {
    if (!authSession?.user) {
      setShowDownloadGate(true);
      return;
    }
    const projectData = buildCloudProjectData();
    if (!projectData) return;
    const saved = await saveProject(projectName, projectData);
    const ownerId = authSession.user.id ?? authSession.user.email ?? null;
    if (saved && ownerId) {
      addRecentProject(ownerId, saved.name ?? projectName, saved.id);
    }
  }

  /** Build final PDF respecting order + keep flags */
  async function handleDownload(forceBypass = false) {
    if (authSession?.user) {
      const projectData = buildCloudProjectData();
      if (projectData) {
        const ownerId = authSession.user.id ?? authSession.user.email ?? null;
        void saveProject(projectName, projectData).then((saved) => {
          if (saved && ownerId) {
            addRecentProject(ownerId, saved.name ?? projectName, saved.id);
          }
        });
      }
    }
    if (!forceBypass && !authSession?.user) {
      // Allow anonymous downloads; still surface the gate UI without blocking the flow.
      setShowDownloadGate(true);
    }
    try {
      if (pages.length === 0) {
        setError("Add at least one page first.");
        return;
      }
      setBusy(true);
      setError(null);

      // Load each unique source once into a PDFDocument, cache in a map
      const docCache = new Map<number, PDFDocument>();
      for (const p of pages) {
        if (!docCache.has(p.srcIdx)) {
          const srcUrl = sources[p.srcIdx].url;
          const ab = await (await fetch(srcUrl)).arrayBuffer();
          const srcDoc = await PDFDocument.load(new Uint8Array(ab));
          docCache.set(p.srcIdx, srcDoc);
        }
      }

      // Now copy pages in the displayed order
      const out = await PDFDocument.create();
      const standardFontCache = new Map<StandardFonts, PDFFont>();
      let fontkitRegistered = false;
      async function loadFontBytes(path: string) {
        const cached = customFontBytesRef.current.get(path);
        if (cached) return cached;
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        customFontBytesRef.current.set(path, bytes);
        return bytes;
      }
      async function getDownloadFont() {
        const config = TEXT_FONT_OPTIONS[textFont];
        const variant = resolveFontVariant(textBold, textItalic);
        if (config.pdf.type === "standard") {
          const fontName = config.pdf.variants[variant];
          const cached = standardFontCache.get(fontName);
          if (cached) return cached;
          const embedded = await out.embedFont(fontName);
          standardFontCache.set(fontName, embedded);
          return embedded;
        }
        if (!fontkitRegistered) {
          if (!fontkitModuleRef.current) {
            const fontkit = await import("fontkit");
            fontkitModuleRef.current = fontkit as { default?: unknown };
          }
          const fontkitInstance = fontkitModuleRef.current.default ?? fontkitModuleRef.current;
          out.registerFontkit(fontkitInstance as unknown as never);
          fontkitRegistered = true;
        }
        const src = config.pdf.variants[variant];
        const cacheKey = `${textFont}:${variant}`;
        const cached = pdfFontCacheRef.current.get(cacheKey);
        if (cached) return cached;
        try {
          const fontBytes = await loadFontBytes(src);
          const embedded = await out.embedFont(fontBytes);
          pdfFontCacheRef.current.set(cacheKey, embedded);
          return embedded;
        } catch (err) {
          console.warn("Falling back to standard font for PDF export", err);
          const fallback = config.pdf.fallback;
          const fallbackCached = standardFontCache.get(fallback);
          if (fallbackCached) return fallbackCached;
          const embeddedFallback = await out.embedFont(fallback);
          standardFontCache.set(fallback, embeddedFallback);
          return embeddedFallback;
        }
      }
	      for (const p of pages) {
	        const srcDoc = docCache.get(p.srcIdx)!;
	        const [copied] = await out.copyPages(srcDoc, [p.pageIdx]);
	        copied.setRotation(degrees(p.rotation ?? 0));
	        const pageHighlights = highlights[p.id] ?? [];
	        const pageShapes = shapesByPage[p.id] ?? [];
	        const pageTexts = textAnnotations[p.id] ?? [];
	          if (pageHighlights.length > 0) {
	            const { width: pageWidth, height: pageHeight } = copied.getSize();
	            pageHighlights.forEach((stroke) => {
	              const colorValue = hexToRgb(stroke.color);
	              if (!colorValue) return;
	              const baseThickness = Math.max(1, stroke.thickness * pageWidth);
	              const tool = stroke.tool === "pencil" ? "pen" : stroke.tool;
	              const cap =
	                tool === "highlight"
	                  ? LineCapStyle.Butt
	                  : LineCapStyle.Round;
	              const baseOpacity = tool === "highlight" ? (stroke.opacity ?? 0.35) : 1;
	              const widthFactor = tool === "highlight" ? 1.2 : 1;
	              for (let i = 1; i < stroke.points.length; i++) {
	                const start = stroke.points[i - 1];
	                const end = stroke.points[i];
	                if (end.move) continue;
	                const x1 = start.x * pageWidth;
	                const y1 = pageHeight - start.y * pageHeight;
	                const x2 = end.x * pageWidth;
	                const y2 = pageHeight - end.y * pageHeight;

	                copied.drawLine({
	                  start: { x: x1, y: y1 },
	                  end: { x: x2, y: y2 },
	                  thickness: baseThickness * widthFactor,
	                  color: rgb(colorValue.r, colorValue.g, colorValue.b),
	                  opacity: baseOpacity,
	                  lineCap: cap,
	                });
	              }
	            });
	          }
          if (pageShapes.length > 0) {
            const { width: pageWidth, height: pageHeight } = copied.getSize();
            const unitToPdf = (pt: Point) => ({
              x: pt.x * pageWidth,
              y: pageHeight - pt.y * pageHeight,
            });
            pageShapes.forEach((shape) => {
              const colorValue = hexToRgb(shape.color);
              if (!colorValue) return;
              const thickness = Math.max(1, shape.thickness * pageWidth);
              const start = unitToPdf(shape.start);
              const end = unitToPdf(shape.end);
              const minX = Math.min(start.x, end.x);
              const maxX = Math.max(start.x, end.x);
              const minY = Math.min(start.y, end.y);
              const maxY = Math.max(start.y, end.y);
              const w = Math.max(1, maxX - minX);
              const h = Math.max(1, maxY - minY);
              const strokeColor = rgb(colorValue.r, colorValue.g, colorValue.b);
              const drawLineSegment = (a: { x: number; y: number }, b: { x: number; y: number }) => {
                copied.drawLine({
                  start: a,
                  end: b,
                  thickness,
                  color: strokeColor,
                  opacity: 1,
                  lineCap: LineCapStyle.Round,
                });
              };
              const drawArrowHead = (a: { x: number; y: number }, b: { x: number; y: number }) => {
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy));
                const headLen = clamp(len * 0.16, 14, 32);
                const angle = Math.atan2(dy, dx);
                const left = angle + (Math.PI * 5) / 6;
                const right = angle - (Math.PI * 5) / 6;
                drawLineSegment(b, { x: b.x + Math.cos(left) * headLen, y: b.y + Math.sin(left) * headLen });
                drawLineSegment(b, { x: b.x + Math.cos(right) * headLen, y: b.y + Math.sin(right) * headLen });
              };
	              switch (shape.type) {
	                case "line":
	                  drawLineSegment(start, end);
	                  break;
	                case "arrow":
	                  drawLineSegment(start, end);
	                  drawArrowHead(start, end);
	                  break;
	                case "rect":
	                  copied.drawRectangle({
	                    x: minX,
	                    y: minY,
	                    width: w,
	                    height: h,
	                    borderWidth: thickness,
	                    borderColor: strokeColor,
	                    borderOpacity: 1,
	                    borderLineCap: LineCapStyle.Round,
	                  });
	                  break;
	                case "ellipse":
	                  copied.drawEllipse({
	                    x: minX + w / 2,
	                    y: minY + h / 2,
	                    xScale: w / 2,
	                    yScale: h / 2,
	                    borderWidth: thickness,
	                    borderColor: strokeColor,
	                    borderOpacity: 1,
	                    borderLineCap: LineCapStyle.Round,
	                  });
	                  break;
	                case "triangle": {
	                  const top = { x: minX + w / 2, y: maxY };
	                  const left = { x: minX, y: minY };
	                  const right = { x: maxX, y: minY };
	                  drawLineSegment(top, right);
	                  drawLineSegment(right, left);
	                  drawLineSegment(left, top);
	                  break;
	                }
	                case "x":
	                  drawLineSegment({ x: minX, y: minY }, { x: maxX, y: maxY });
	                  drawLineSegment({ x: maxX, y: minY }, { x: minX, y: maxY });
	                  break;
                case "check": {
                  const p1 = { x: minX + w * 0.18, y: minY + h * 0.55 };
                  const p2 = { x: minX + w * 0.42, y: minY + h * 0.78 };
                  const p3 = { x: minX + w * 0.82, y: minY + h * 0.26 };
                  drawLineSegment(p1, p2);
                  drawLineSegment(p2, p3);
                  break;
                }
                default:
                  break;
              }
            });
          }
	        if (pageTexts.length > 0) {
	          const font = await getDownloadFont();
	          const { width: pageWidth, height: pageHeight } = copied.getSize();
	          const fontSize = textSize;
	          const lineHeight = fontSize * 1.3;
          const textColor = rgb(0.13, 0.15, 0.18);
          pageTexts.forEach((annotation) => {
            const content = annotation.text;
            if (!content || content === TEXT_PLACEHOLDER) return;
            const boxWidth = (annotation.width ?? 0.14) * pageWidth;
            const padding = Math.min(6, boxWidth * 0.05);
            const x = annotation.x * pageWidth + padding;
            const startY = pageHeight - annotation.y * pageHeight - padding;
            let cursorY = startY;
            const lines = content.split(/\r?\n/);
            const rotation = annotation.rotation ?? 0;
            lines.forEach((line) => {
              cursorY -= fontSize;
              copied.drawText(line, {
                x,
                y: cursorY,
                size: fontSize,
                font,
                color: textColor,
                maxWidth: Math.max(10, boxWidth - padding * 2),
                rotate: degrees(rotation),
              });
              cursorY -= lineHeight - fontSize;
            });
          });
        }
        out.addPage(copied);
      }

      const bytes = await out.save(); // Uint8Array
      // TS-safe Blob creation
      const ab = (bytes.buffer as ArrayBuffer).slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      );
      const view = new Uint8Array(ab);
      const blob = new Blob([view], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = projectNameToFile(projectName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Failed to build the PDF. Try smaller or non-encrypted files.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadGateSignUp() {
    setShowDownloadGate(false);
    router.push("/register");
  }

  function handleDownloadGateUpgrade() {
    setShowDownloadGate(false);
    router.push("/pricing");
  }

  function handleDownloadGateBypass() {
    setShowDownloadGate(false);
    setShowDelayOverlay("intro");
  }

  function handleProjectNameSave() {
    const clean = sanitizeProjectName(projectNameDraft);
    if (!clean) {
      setProjectNameError("Please enter a name.");
      return;
    }
    setProjectName(clean);
    try {
      window.localStorage?.setItem(PROJECT_NAME_STORAGE_KEY, clean);
    } catch {
      // ignore
    }
    setProjectNameEditing(false);
    setProjectNameError(null);
  }

  function handleProjectNameCancel() {
    setProjectNameDraft(projectName);
    setProjectNameEditing(false);
    setProjectNameError(null);
  }

  function handleRotatePage(pageId: string) {
    setPages((prev) =>
      prev.map((page) =>
        page.id === pageId
          ? {
              ...page,
              rotation: normalizeRotation((page.rotation ?? 0) + 90),
            }
          : page
      )
    );
  }

	  function handleDeletePage(pageId: string) {
	    setPages((prev) => prev.filter((page) => page.id !== pageId));
	  }

	  function moveThumbPage(fromIndex: number, delta: 1 | -1) {
	    setPages((prev) => {
	      if (prev.length === 0) return prev;
	      const toIndex = clamp(fromIndex + delta, 0, prev.length - 1);
	      if (toIndex === fromIndex) return prev;
	      return arrayMove(prev, fromIndex, toIndex);
	    });
	  }

  useEffect(() => {
    if (userAdjustedZoom) return; // preserve manual zoom after user interaction
    computeBaseScale();
  }, [computeBaseScale, pages.length, activePageIndex, userAdjustedZoom]);

  useEffect(() => {
    if (!showDelayOverlay) return;
    if (showDelayOverlay === "intro") {
      const timer = window.setTimeout(() => setShowDelayOverlay("progress"), 1000);
      return () => window.clearTimeout(timer);
    }
    if (showDelayOverlay === "progress") {
      const timer = window.setTimeout(() => {
        setShowDelayOverlay(null);
        handleDownload(true);
      }, 3000);
      return () => window.clearTimeout(timer);
    }
  }, [showDelayOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasWorkspaceData) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasWorkspaceData]);

  useEffect(() => {
    if (!highlightMode && !penMode) {
      setDraftHighlight(null);
    }
  }, [highlightMode, penMode]);
  const hasAnyHighlights = Object.values(highlights).some((list) => list && list.length > 0);
  const hasAnyShapes = Object.values(shapesByPage).some((list) => list && list.length > 0);
  const hasUndoHistory = highlightHistory.length > 0;
  const hasRedoHistory = redoHighlightHistory.length > 0;
  useEffect(() => {
    if (!hasAnyHighlights && !hasAnyShapes && deleteMode) {
      setDeleteMode(false);
    }
  }, [hasAnyHighlights, hasAnyShapes, deleteMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointerUp = () => setIsErasing(false);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!focusedTextId) return;
    const node = textNodeRefs.current.get(focusedTextId);
    if (node) {
      node.focus();
    }
  }, [focusedTextId]);

  useEffect(() => {
    focusedTextIdRef.current = focusedTextId;
  }, [focusedTextId]);

  useEffect(() => {
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        clearTextFocus();
        return;
      }
      if (!target.closest("[data-text-annotation]")) {
        clearTextFocus();
      }
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => window.removeEventListener("pointerdown", handleGlobalPointerDown);
  }, [clearTextFocus]);

  useEffect(() => {
    if (!textMode) {
      setDraftTextBox(null);
    }
  }, [textMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("studio-page");
    return () => {
      document.body.classList.remove("studio-page");
    };
  }, []);

  useEffect(() => {
    return () => {
      textDragCleanupRef.current?.();
      textResizeCleanupRef.current?.();
      textRotateCleanupRef.current?.();
    };
  }, []);
  useEffect(() => {
    if (!fontMenuOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!fontMenuRef.current?.contains(event.target)) {
        setFontMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleOutside);
    return () => window.removeEventListener("pointerdown", handleOutside);
  }, [fontMenuOpen]);
  useEffect(() => {
    if (!textMode) setFontMenuOpen(false);
  }, [textMode]);

  function adjustHighlightThickness(delta: number) {
    setHighlightThickness((prev) => clamp(prev + delta, MIN_HIGHLIGHT_THICKNESS, MAX_HIGHLIGHT_THICKNESS));
  }

  function handleUndoHighlight() {
    setHighlightHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoHighlightHistory((redoPrev) => [...redoPrev, last]);
      if (last.type === "add") {
        setHighlights((map) => {
          const list = map[last.pageId];
          if (!list) return map;
          const filtered = list.filter((stroke) => stroke.id !== last.highlight.id);
          if (filtered.length === list.length) return map;
          const next = { ...map };
          if (filtered.length > 0) {
            next[last.pageId] = filtered;
          } else {
            delete next[last.pageId];
          }
          return next;
        });
      } else if (last.type === "delete") {
        setHighlights((map) => {
          const next = { ...map };
          const list = next[last.pageId] ? [...next[last.pageId]] : [];
          list.push(cloneStroke(last.highlight));
          next[last.pageId] = list;
          return next;
        });
      } else if (last.type === "addShape") {
        setShapesByPage((map) => {
          const list = map[last.pageId];
          if (!list) return map;
          const filtered = list.filter((shape) => shape.id !== last.shape.id);
          if (filtered.length === list.length) return map;
          const next = { ...map };
          if (filtered.length > 0) {
            next[last.pageId] = filtered;
          } else {
            delete next[last.pageId];
          }
          return next;
        });
      } else if (last.type === "deleteShape") {
        setShapesByPage((map) => {
          const next = { ...map };
          const list = next[last.pageId] ? [...next[last.pageId]] : [];
          list.push({ ...last.shape, start: { ...last.shape.start }, end: { ...last.shape.end } });
          next[last.pageId] = list;
          return next;
        });
      } else if (last.type === "clear") {
        setHighlights(cloneHighlightMap(last.previous.highlights));
        setShapesByPage(cloneShapeMap(last.previous.shapes));
        setTextAnnotations(cloneTextAnnotationMap(last.previous.textAnnotations));
        setFocusedTextId(null);
        setDraftTextBox(null);
      }
      return prev.slice(0, -1);
    });
  }

  function handleRedoHighlight() {
    setRedoHighlightHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.type === "add") {
        setHighlights((map) => {
          const next = { ...map };
          const list = next[last.pageId] ? [...next[last.pageId]] : [];
          list.push(cloneStroke(last.highlight));
          next[last.pageId] = list;
          return next;
        });
      } else if (last.type === "delete") {
        setHighlights((map) => {
          const list = map[last.pageId];
          if (!list) return map;
          const filtered = list.filter((stroke) => stroke.id !== last.highlight.id);
          if (filtered.length === list.length) return map;
          const next = { ...map };
          if (filtered.length > 0) {
            next[last.pageId] = filtered;
          } else {
            delete next[last.pageId];
          }
          return next;
        });
      } else if (last.type === "addShape") {
        setShapesByPage((map) => {
          const next = { ...map };
          const list = next[last.pageId] ? [...next[last.pageId]] : [];
          list.push({ ...last.shape, start: { ...last.shape.start }, end: { ...last.shape.end } });
          next[last.pageId] = list;
          return next;
        });
      } else if (last.type === "deleteShape") {
        setShapesByPage((map) => {
          const list = map[last.pageId];
          if (!list) return map;
          const filtered = list.filter((shape) => shape.id !== last.shape.id);
          if (filtered.length === list.length) return map;
          const next = { ...map };
          if (filtered.length > 0) {
            next[last.pageId] = filtered;
          } else {
            delete next[last.pageId];
          }
          return next;
        });
      } else if (last.type === "clear") {
        setHighlights({});
        setShapesByPage({});
        setTextAnnotations({});
        setFocusedTextId(null);
        setDraftTextBox(null);
      }
      setHighlightHistory((historyPrev) => [...historyPrev, last]);
      return prev.slice(0, -1);
    });
  }

  function handleClearHighlights() {
    if (!hasAnyAnnotations) return;
    setDraftHighlight(null);
    setDraftShape(null);
    setDeleteMode(false);
    setIsErasing(false);
    const snapshot = {
      highlights: cloneHighlightMap(highlights),
      shapes: cloneShapeMap(shapesByPage),
      textAnnotations: cloneTextAnnotationMap(textAnnotations),
    };
    if (
      Object.keys(snapshot.highlights).length > 0 ||
      Object.keys(snapshot.shapes).length > 0 ||
      Object.keys(snapshot.textAnnotations).length > 0
    ) {
      setHighlightHistory((prev) => [...prev, { type: "clear", previous: snapshot }]);
      setRedoHighlightHistory([]);
    }
    setHighlights({});
    setShapesByPage({});
    setDraftTextBox(null);
    setTextAnnotations({});
    setFocusedTextId(null);
  }

  function handleDeleteStroke(pageId: string, strokeId: string) {
    let removed: HighlightStroke | null = null;
    setHighlights((map) => {
      const list = map[pageId];
      if (!list) return map;
      const index = list.findIndex((stroke) => stroke.id === strokeId);
      if (index === -1) return map;
      removed = list[index];
      const filtered = list.slice(0, index).concat(list.slice(index + 1));
      const next = { ...map };
      if (filtered.length > 0) {
        next[pageId] = filtered;
      } else {
        delete next[pageId];
      }
      return next;
    });
    if (removed) {
      setHighlightHistory((prev) => [...prev, { type: "delete", pageId, highlight: cloneStroke(removed!) }]);
      setRedoHighlightHistory([]);
    }
  }

  function handleDeleteShape(pageId: string, shapeId: string) {
    let removed: ShapeAnnotation | null = null;
    setShapesByPage((map) => {
      const list = map[pageId];
      if (!list) return map;
      const index = list.findIndex((shape) => shape.id === shapeId);
      if (index === -1) return map;
      removed = list[index];
      const filtered = list.slice(0, index).concat(list.slice(index + 1));
      const next = { ...map };
      if (filtered.length > 0) {
        next[pageId] = filtered;
      } else {
        delete next[pageId];
      }
      return next;
    });
    if (removed) {
      setHighlightHistory((prev) => [
        ...prev,
        {
          type: "deleteShape",
          pageId,
          shape: { ...removed!, start: { ...removed!.start }, end: { ...removed!.end } },
        },
      ]);
      setRedoHighlightHistory([]);
    }
  }

  function handleToggleDeleteMode() {
    setDeleteMode((prev) => {
      const next = !prev;
      if (next) {
        setDraftHighlight(null);
        setDraftShape(null);
      }
      return next;
    });
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#f3f6fb]">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
        {/* Top row */}
        <div className="w-full border-b border-slate-100 bg-white">
          <div className="flex h-14 w-full items-center gap-4 px-4 lg:px-6">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to workspace">
              <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
            </Link>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {projectNameEditing ? (
                  <div className="relative w-full max-w-[320px] sm:max-w-[420px] md:max-w-[520px]">
                    <input
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                      value={projectNameDraft}
                      onChange={(event) => {
                        setProjectNameDraft(event.target.value);
                        if (projectNameError) setProjectNameError(null);
                      }}
                      onBlur={() => {
                        handleProjectNameSave();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleProjectNameSave();
                          (event.currentTarget as HTMLInputElement).blur();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          handleProjectNameCancel();
                        }
                      }}
                      placeholder="Name your project"
                      autoFocus
                    />
                    <Pencil
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectNameDraft(projectName);
                      setProjectNameError(null);
                      setProjectNameEditing(true);
                    }}
                    className="group inline-flex w-full max-w-[320px] min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-900 outline-none transition hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:max-w-[420px] md:max-w-[520px]"
                    aria-label="Edit project name"
                  >
                    <span className="block truncate">{projectName || "Untitled project"}</span>
                    <Pencil className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-600" aria-hidden />
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button className={`${buttonNeutral} px-5 py-2`} onClick={handleAddClick} disabled={pages.length === 0}>
                  Add pages
                </button>
	                <button className={`${buttonPrimary} px-5 py-2`} onClick={() => handleDownload()} disabled={downloadDisabled}>
	                  {busy ? "Building..." : "Download pages"}
	                </button>
              </div>
            </div>
          </div>

          {projectNameError ? (
            <div className="w-full px-4 pb-3 text-sm text-rose-500 lg:px-6">
              {projectNameError}
            </div>
          ) : null}
        </div>

        {/* Bottom row (tools) */}
        <div className="w-full border-b border-slate-200/60 bg-[#F1F5F9] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
	          <div className="w-full px-0.5 py-0.5 lg:px-6">
	            <div className="relative h-10">
	              <div className={`absolute inset-0 flex w-full items-center gap-3 lg:gap-4 ${loading ? "pointer-events-none" : ""}`}>
	                <div className="tools-scroll flex min-w-0 flex-1 overflow-x-auto">
	                  <div className="flex items-center gap-0 rounded-xl bg-[#F1F5F9] px-0.5 py-0 ring-1 ring-slate-200/80">
	                  <button
	                    type="button"
	                    className={`${toolButtonBase} ${toolIconButton} ${toolButtonInactiveBlack}`}
	                    disabled={loading}
	                    aria-disabled={!hasUndoHistory}
	                    aria-label="Undo"
	                    title="Undo"
	                    onClick={() => {
	                      if (loading) return;
	                      if (!hasUndoHistory) return;
	                      handleUndoHighlight();
	                    }}
	                  >
	                    <Undo2 className="h-5 w-5" />
	                  </button>

	                  <button
	                    type="button"
	                    className={`${toolButtonBase} ${toolIconButton} ${toolButtonInactiveBlack}`}
	                    disabled={loading}
	                    aria-disabled={!hasRedoHistory}
	                    aria-label="Redo"
	                    title="Redo"
	                    onClick={() => {
	                      if (loading) return;
	                      if (!hasRedoHistory) return;
	                      handleRedoHighlight();
	                    }}
	                  >
	                    <Redo2 className="h-5 w-5" />
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={loading}
	                    aria-pressed={selectButtonOn}
	                    className={`${toolButtonBase} ${selectButtonOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (loading) return;
	                      setSelectMode(true);
	                      setPenMode(false);
	                      setShapeMode(false);
	                      setHighlightMode(false);
	                      setTextMode(false);
	                      setDeleteMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                    }}
	                  >
	                    <MousePointer2 className="h-5 w-5" />
	                    Select
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={highlightButtonDisabled}
	                    aria-pressed={drawButtonOn}
	                    className={`${toolButtonBase} ${drawButtonOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (highlightButtonDisabled) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setPenMode(true);
	                      setHighlightMode(false);
	                      setShapeMode(false);
	                      setTextMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                    }}
	                  >
	                    <PencilLine className="h-5 w-5" />
	                    Draw
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={highlightButtonDisabled}
	                    aria-pressed={highlightButtonVisualOn}
	                    className={`${toolButtonBase} ${highlightButtonVisualOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (highlightButtonDisabled) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setHighlightMode(true);
	                      setPenMode(false);
	                      setShapeMode(false);
	                      setTextMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                    }}
	                  >
	                    <Highlighter className="h-5 w-5" />
	                    Highlight
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={highlightButtonDisabled}
	                    aria-pressed={shapeButtonVisualOn}
	                    className={`${toolButtonBase} ${shapeButtonVisualOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (highlightButtonDisabled) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setShapeMode(true);
	                      setPenMode(false);
	                      setHighlightMode(false);
	                      setTextMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                    }}
	                  >
	                    <Shapes className="h-5 w-5" />
	                    Shapes
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={highlightButtonDisabled}
	                    aria-pressed={textButtonOn}
	                    className={`${toolButtonBase} ${textButtonOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (highlightButtonDisabled) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setTextMode(true);
	                      setPenMode(false);
	                      setHighlightMode(false);
	                      setShapeMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                    }}
	                  >
	                    Text
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    disabled={loading}
	                    className={`${toolButtonBase} ${deleteMode ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={handleToggleDeleteMode}
	                    aria-pressed={deleteMode}
	                    aria-disabled={!hasAnyAnnotations && !deleteMode}
	                  >
	                    <Eraser className="h-5 w-5" />
	                    Eraser
	                  </button>

	                  <button
	                    type="button"
	                    disabled={loading}
	                    aria-pressed={signatureButtonOn}
	                    className={`${toolButtonBase} ${signatureButtonOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (loading) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setPenMode(false);
	                      setShapeMode(false);
	                      setDraftShape(null);
	                      setShowSignatureHub(true);
	                      setSignatureHubStep("gallery");
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                      setHighlightMode(false);
	                      setTextMode(false);
	                    }}
	                  >
	                    <SignatureIcon className="h-5 w-5" />
	                    Sign
	                    {savedSignatures.length > 0 ? (
	                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/80 px-1 text-[0.65rem] font-bold text-[#024d7c]">
	                        {savedSignatures.length}
	                      </span>
	                    ) : null}
	                  </button>
	                  </div>
	                </div>

	                <div className="flex shrink-0 items-center gap-0" />
	              </div>

	              <input
	                ref={addInputRef}
	                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handleAddChange}
              />
            </div>
          </div>
        </div>

      </header>

	      <div className="flex-1 min-h-0 overflow-hidden">
	          <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {error}
              </div>
            )}

	            <div className="relative flex-1 min-h-0 overflow-hidden">
		            <LoadingOverlay
		              open={loading}
		              label="Loading your project..."
		              variant="container"
		              zIndexClassName="z-50"
		              backdropClassName="bg-slate-50/90"
		            />
	              <AnimatePresence mode="wait">
	                {organizeMode && !loading && pages.length > 0 ? (
	                  <motion.div
                    key="manage-view"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={VIEW_TRANSITION}
                    className="w-full"
                  >
                    <div className="flex flex-col gap-3 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">Manage pages</h2>
                        <p className="text-sm text-slate-300">Drag to reorder. Rotate or delete any page.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrganizeMode(false)}
                        className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
                      >
                        Done managing
                      </button>
                    </div>
                    <div className="mt-6">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
                          <motion.div
                            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            variants={GRID_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            transition={VIEW_TRANSITION}
                          >
                            {pages.map((page, idx) => (
                              <SortableOrganizeTile
                                key={page.id}
                                item={page}
                                index={idx}
                                onRotate={() => handleRotatePage(page.id)}
                                onDelete={() => handleDeletePage(page.id)}
                                animateIn={organizeMode}
                              />
                            ))}
                          </motion.div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </motion.div>
                ) : null}

	                {!organizeMode && pages.length > 0 ? (
	                  <motion.div
	                    key="preview-view"
	                    initial={{ opacity: 0.95, scale: 0.97 }}
	                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                  transition={VIEW_TRANSITION}
			                  className="editor-shell mx-auto flex h-full min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden px-0"
                >
				                    <div className="flex h-full min-h-0 w-full items-stretch gap-0 overflow-hidden">
				                      <div className="flex min-w-0 flex-1 min-h-0 flex-col overflow-hidden">
				                        <AnimatePresence initial={false}>
				                          {showToolOptionsBar ? (
				                            <motion.div
				                              key="tool-options-bar"
				                              initial={{ height: 0, opacity: 0, y: -6 }}
				                              animate={{ height: 45, opacity: 1, y: 0 }}
				                              exit={{ height: 0, opacity: 0, y: -6 }}
				                              transition={{ duration: 0.18, ease: SOFT_EASE }}
				                              className="min-w-0 overflow-hidden"
				                            >
				                              <div className="flex h-[45px] min-w-0 items-center border-b border-slate-200 bg-white px-4">
					                            {shapeMode ? (
					                              <div
					                                className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${
					                                  loading ? "pointer-events-none" : ""
				                                }`}
				                                aria-label="Shape options"
				                              >
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Shape</span>
				                                  <div className="flex items-center gap-1.5">
				                                    {[
				                                      { type: "line" as const, label: "Line", icon: Minus },
				                                      { type: "arrow" as const, label: "Arrow", icon: ArrowRight },
				                                      { type: "rect" as const, label: "Square", icon: Square },
				                                      { type: "ellipse" as const, label: "Circle", icon: Circle },
				                                      { type: "triangle" as const, label: "Triangle", icon: Triangle },
				                                      { type: "check" as const, label: "Check", icon: Check },
				                                      { type: "x" as const, label: "X", icon: X },
				                                    ].map((item) => {
				                                      const Icon = item.icon;
				                                      const selected = shapeType === item.type;
				                                      return (
				                                        <button
				                                          key={item.type}
				                                          type="button"
				                                          onClick={() => setShapeType(item.type)}
				                                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
				                                            selected
				                                              ? "border-slate-200 bg-white text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
				                                              : "border-transparent text-slate-600 hover:bg-white/80 hover:text-slate-900"
				                                          }`}
				                                          aria-label={item.label}
				                                        >
				                                          <Icon className="h-4 w-4" aria-hidden />
				                                        </button>
				                                      );
				                                    })}
				                                  </div>
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Color</span>
				                                  <label className="relative h-8 w-8 cursor-pointer rounded-full border border-slate-200 bg-white shadow-sm">
				                                    <span
				                                      className="absolute inset-1 rounded-full"
				                                      style={{ backgroundColor: shapeColor }}
				                                      aria-hidden
				                                    />
				                                    <input
				                                      type="color"
				                                      value={shapeColor}
				                                      onChange={(event) => setShapeColor(event.target.value)}
				                                      className="absolute inset-0 cursor-pointer opacity-0"
				                                      aria-label="Shape color"
				                                    />
				                                  </label>
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Thickness</span>
				                                  <input
				                                    type="range"
				                                    min={1}
				                                    max={10}
				                                    step={1}
				                                    value={shapeThickness}
				                                    onChange={(event) => setShapeThickness(Number(event.target.value))}
				                                    className="h-2 w-28 cursor-pointer accent-[#024d7c]"
				                                    aria-label="Shape thickness"
				                                  />
				                                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
				                                    {Math.round(shapeThickness)}px
				                                  </span>
				                                </div>
				                              </div>
				                            ) : highlightMode ? (
				                              <div
				                                className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${
				                                  loading ? "pointer-events-none" : ""
				                                }`}
				                                aria-label="Highlight options"
				                              >
				                                <div className="flex items-center gap-1.5">
				                                  {highlightColorEntries.map(([key, value]) => (
				                                    <button
				                                      key={key}
				                                      type="button"
				                                      onClick={() => setHighlightColor(key)}
				                                      className={`h-7 w-7 rounded-full border transition ${
				                                        highlightColor === key
				                                          ? "border-[#024d7c] ring-2 ring-[#024d7c]/25"
				                                          : "border-white/30 hover:border-slate-300"
				                                      }`}
				                                      style={{ backgroundColor: value }}
				                                      aria-label={`Use ${key} highlight`}
				                                    />
				                                  ))}
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Thickness</span>
				                                  <input
				                                    type="range"
				                                    min={MIN_HIGHLIGHT_THICKNESS}
				                                    max={MAX_HIGHLIGHT_THICKNESS}
				                                    step={1}
				                                    value={highlightThickness}
				                                    onChange={(event) => setHighlightThickness(Number(event.target.value))}
				                                    className="h-2 w-28 cursor-pointer accent-[#024d7c]"
				                                    aria-label="Highlight thickness"
				                                  />
				                                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
				                                    {Math.round(highlightThickness)}px
				                                  </span>
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Opacity</span>
				                                  <input
				                                    type="range"
				                                    min={0.15}
				                                    max={0.6}
				                                    step={0.05}
				                                    value={highlightOpacity}
				                                    onChange={(event) => setHighlightOpacity(Number(event.target.value))}
				                                    className="h-2 w-24 cursor-pointer accent-[#024d7c]"
				                                    aria-label="Highlight opacity"
				                                  />
				                                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-700">
				                                    {Math.round(highlightOpacity * 100)}%
				                                  </span>
				                                </div>
				                              </div>
				                            ) : penMode ? (
				                              <div
				                                className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${
				                                  loading ? "pointer-events-none" : ""
				                                }`}
				                                aria-label="Draw options"
				                              >
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Color</span>
				                                  <label className="relative h-8 w-8 cursor-pointer rounded-full border border-slate-200 bg-white shadow-sm">
				                                    <span
				                                      className="absolute inset-1 rounded-full"
				                                      style={{ backgroundColor: penColor }}
				                                      aria-hidden
				                                    />
				                                    <input
				                                      type="color"
				                                      value={penColor}
				                                      onChange={(event) => setPenColor(event.target.value)}
				                                      className="absolute inset-0 cursor-pointer opacity-0"
				                                      aria-label="Stroke color"
				                                    />
				                                  </label>
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Thickness</span>
				                                  <input
				                                    type="range"
				                                    min={1}
				                                    max={10}
				                                    step={1}
				                                    value={penThickness}
				                                    onChange={(event) => setPenThickness(Number(event.target.value))}
				                                    className="h-2 w-28 cursor-pointer accent-[#024d7c]"
				                                    aria-label="Stroke thickness"
				                                  />
				                                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
				                                    {Math.round(penThickness)}px
				                                  </span>
				                                </div>
				                              </div>
				                            ) : (
				                              <div
				                                className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${
				                                  loading ? "pointer-events-none" : ""
				                                }`}
				                                aria-label="Text options"
				                              >
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Font</span>
				                                  <select
				                                    value={textFont}
				                                    onChange={(event) => setTextFont(event.target.value as TextFont)}
				                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-300"
				                                    aria-label="Text font"
				                                  >
				                                    {textFontEntries.map(([key, option]) => (
				                                      <option key={key} value={key}>
				                                        {option.label}
				                                      </option>
				                                    ))}
				                                  </select>
				                                </div>
				
				                                <div className="hidden h-8 w-px bg-slate-200/70 sm:block" aria-hidden />
				
				                                <div className="flex items-center gap-2">
				                                  <span className="text-xs font-semibold text-slate-600">Size</span>
				                                  <input
				                                    type="range"
				                                    min={8}
				                                    max={48}
				                                    step={1}
				                                    value={textSize}
				                                    onChange={(event) => setTextSize(Number(event.target.value))}
				                                    className="h-2 w-28 cursor-pointer accent-[#024d7c]"
				                                    aria-label="Text size"
				                                  />
				                                  <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
				                                    {Math.round(textSize)}px
				                                  </span>
				                                </div>
				                              </div>
				                            )}
				                              </div>
				                            </motion.div>
				                          ) : null}
				                        </AnimatePresence>
			
				                        <div className="min-w-0 flex-1 min-h-0 overflow-hidden">
				                          <div
				                            ref={viewerScrollRef}
				                            className="viewer-scroll relative flex h-full w-full overflow-auto pb-16"
				                            style={{ scrollbarGutter: "stable" }}
				                          >
				                            {null}
				                            <div className="relative w-full min-w-0 text-center">
				                              <div id="pdf-viewport" className="inline-flex origin-top flex-col gap-8">
				                                {pages.map((page, index) => renderPreviewPage(page, index))}
				                                <div className="h-8" aria-hidden />
				                              </div>
				                            </div>
				                          </div>
				                        </div>
				                      </div>
			
				                      <div className="flex shrink-0 items-stretch border-l border-slate-200">
				                          {showPageOrderPanel ? (
				                            <aside className="flex w-[280px] shrink-0 flex-col">
				                              <div className="flex min-h-0 flex-1 flex-col bg-[#f8fafc]">
				                                <div className="flex h-[45px] items-center justify-between border-b border-slate-200 bg-white px-4">
				                                  <p className="text-sm font-semibold text-slate-600">{pages.length} pages</p>
				                                  <button
				                                    type="button"
				                                    onClick={() => setOrganizeMode(true)}
				                                    disabled={pages.length === 0 || organizeMode}
				                                    className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#024d7c] transition hover:bg-slate-100 hover:text-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
				                                  >
				                                    Manage pages
				                                  </button>
				                                </div>
				                                <div className="thumbs-scroll min-h-0 flex-1 overflow-y-auto pl-4 pr-0">
				                            <DndContext
				                              sensors={sensors}
				                              collisionDetection={closestCenter}
		                              onDragEnd={handleDragEnd}
		                            >
		                              <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
		                                <ul className="flex flex-col py-0">
		                                  {pages.length > 0 ? (
		                                    <li className="group relative flex h-12 items-center justify-center">
			                                      <div className="pointer-events-none flex w-full items-center justify-center gap-3 px-2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
		                                        <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                        <button
		                                          type="button"
		                                          onClick={() => void handleAddBlankPageBefore(pages[0].id)}
		                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#024d7c] text-white shadow-sm transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/40 focus-visible:ring-offset-2"
		                                          aria-label="Add blank page"
		                                        >
		                                          <Plus className="h-4 w-4" aria-hidden />
		                                        </button>
		                                        <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                      </div>
			                                      <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg group-hover:opacity-100 group-focus-within:opacity-100">
		                                        Add blank page
		                                      </div>
		                                    </li>
		                                  ) : null}
		                                  {pages.map((p, i) => (
		                                    <Fragment key={p.id}>
		                                      <SortableThumb
		                                        item={p}
		                                        index={i}
		                                        selected={p.id === activePageId}
		                                        onSelect={() => handleSelectPage(i)}
		                                        onMoveUp={() => moveThumbPage(i, -1)}
		                                        onMoveDown={() => moveThumbPage(i, 1)}
		                                        onDelete={() => handleDeletePage(p.id)}
		                                        disableMoveDown={i === pages.length - 1}
		                                      />
		                                      {i < pages.length - 1 ? (
		                                        <li className="group relative flex h-12 items-center justify-center">
			                                          <div className="pointer-events-none flex w-full items-center justify-center gap-3 px-2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
		                                            <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                            <button
		                                              type="button"
		                                              onClick={() => void handleAddBlankPageAfter(p.id)}
		                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#024d7c] text-white shadow-sm transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/40 focus-visible:ring-offset-2"
		                                              aria-label="Add blank page"
		                                            >
		                                              <Plus className="h-4 w-4" aria-hidden />
		                                            </button>
		                                            <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                          </div>
			                                          <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg group-hover:opacity-100 group-focus-within:opacity-100">
		                                            Add blank page
		                                          </div>
		                                        </li>
		                                      ) : null}
		                                    </Fragment>
		                                  ))}
		                                  {pages.length > 0 ? (
		                                    <li className="group relative flex h-12 items-center justify-center">
			                                      <div className="pointer-events-none flex w-full items-center justify-center gap-3 px-2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
		                                        <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                        <button
		                                          type="button"
		                                          onClick={() => void handleAddBlankPageAfter(pages[pages.length - 1].id)}
		                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#024d7c] text-white shadow-sm transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/40 focus-visible:ring-offset-2"
		                                          aria-label="Add blank page"
		                                        >
		                                          <Plus className="h-4 w-4" aria-hidden />
		                                        </button>
		                                        <div className="h-0.5 flex-1 bg-[#024d7c]/70" aria-hidden />
		                                      </div>
			                                      <div className="pointer-events-none absolute left-1/2 bottom-full z-40 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg group-hover:opacity-100 group-focus-within:opacity-100">
		                                        Add blank page
		                                      </div>
		                                    </li>
		                                  ) : null}
			                                </ul>
			                              </SortableContext>
			                            </DndContext>
			                                  </div>
			                                </div>
				                            </aside>
					                          ) : null}

				                          <aside
				                            className={`flex w-14 shrink-0 flex-col bg-white ${showPageOrderPanel ? "border-l border-slate-200" : ""}`}
				                          >
				                            <div className="flex h-[45px] w-full items-center justify-center border-b border-slate-200">
				                              <div className="group relative">
				                                <button
				                                  type="button"
				                                  onClick={() => setShowPageOrderPanel((prev) => !prev)}
				                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60"
				                                  aria-label={showPageOrderPanel ? "Close sidebar" : "Open sidebar"}
				                                >
				                                  {showPageOrderPanel ? (
				                                    <PanelRightClose className="h-6 w-6" aria-hidden />
				                                  ) : (
				                                    <PanelRightOpen className="h-6 w-6" aria-hidden />
				                                  )}
				                                </button>
				                                <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
				                                  {showPageOrderPanel ? "Close sidebar" : "Open sidebar"}
				                                </div>
				                              </div>
				                            </div>
				                          </aside>
				                        </div>
				                    </div>
		                  </motion.div>
		                ) : null}
              </AnimatePresence>

	              {!loading && pages.length === 0 && (
	                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
	                  <p className="text-base font-semibold text-gray-800">No pages yet</p>
	                  <p className="mt-2 text-sm text-gray-500">
	                    Bring your PDFs into the workspace — we&apos;ll show a live preview as soon as they finish uploading.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddClick}
                    className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#024d7c] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/20 transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
                  >
                    Upload PDFs
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <p className="mt-6 text-xs uppercase tracking-[0.4em] text-gray-400">Workspace ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      {showSignatureHub ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSignatureHub} />
          <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-5 shadow-[0_32px_90px_rgba(5,10,30,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {signatureHubStep === "gallery"
                    ? "Sign"
                    : signatureHubStep === "type"
                    ? "Type signature"
                    : signatureHubStep === "qr"
                    ? "Add signature via QR code"
                    : signatureHubStep === "email"
                    ? "Add signature via email"
                    : signatureHubStep === "draw"
                    ? "Draw signature"
                    : "Upload signature"}
                </h3>
                <p className="text-sm text-slate-600">
                  {signatureHubStep === "gallery"
                    ? "Pick an existing signature or create a new one."
                    : "Save it to drop onto your document instantly."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSignatureHub}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {signatureHubStep === "gallery" ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureHubStep("type");
                      setTypeSignatureText("");
                      setTypedSignatureError(null);
                    }}
                    className="flex min-h-[120px] items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#024d7c]/50 hover:bg-white"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <Plus className="h-5 w-5 text-[#024d7c]" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-semibold text-slate-900">Add signature</div>
                      <div className="text-xs text-slate-600">Type, draw, or upload a new signature.</div>
                    </div>
                  </button>
                  {savedSignatures.length === 0 ? (
                    <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                      No saved signatures yet. Add one to get started.
                    </div>
                  ) : null}
                  {savedSignatures.map((sig) => {
                    const isRecent = Date.now() - sig.createdAt <= 10 * 60 * 1000;
                    return (
                    <div
                      key={sig.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-800">{sig.name}</div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">
                          {isRecent ? "Recently added" : "Saved"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sig.dataUrl}
                          alt={sig.name}
                          className="h-16 w-32 rounded-lg border border-slate-100 object-contain bg-white"
                        />
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            className="rounded-full bg-[#024d7c] px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-[#013d63]"
                            onClick={() => {
                              applySignatureToActivePage(sig);
                              closeSignatureHub();
                            }}
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            className="text-slate-500 transition hover:text-[#024d7c] hover:underline"
                            onClick={() => {
                              const nextName = prompt("Rename signature", sig.name)?.trim();
                              if (!nextName) return;
                              if (
                                savedSignatures.some(
                                  (existing) =>
                                    existing.id !== sig.id && existing.name.toLowerCase() === nextName.toLowerCase()
                                )
                              ) {
                                setSignatureNameError("Choose a unique name.");
                                return;
                              }
                              setSavedSignatures((prev) =>
                                prev.map((item) => (item.id === sig.id ? { ...item, name: nextName } : item))
                              );
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="text-rose-500 transition hover:text-rose-600 hover:underline"
                            onClick={() => {
                              const confirmed = window.confirm(
                                "Are you sure you want to delete this signature? You can't go back."
                              );
                              if (!confirmed) return;
                              setSavedSignatures((prev) => prev.filter((item) => item.id !== sig.id));
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignatureHubStep("type");
                      setTypeSignatureText("");
                      setTypedSignatureError(null);
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#024d7c]/60 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700">
                      <SignatureIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Type signature</div>
                      <div className="text-xs text-slate-500">Turn your name into a styled signature.</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDrawFromHub}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#024d7c]/60 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700">
                      <Pencil className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Draw signature</div>
                      <div className="text-xs text-slate-500">Use your mouse or trackpad to draw.</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenUploadFromHub}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#024d7c]/60 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Upload signature</div>
                      <div className="text-xs text-slate-500">Upload a scanned signature image.</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureHubStep("qr")}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#024d7c]/60 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700">
                      {/* simple QR-like icon using squares */}
                      <div className="grid h-5 w-5 grid-cols-2 gap-[2px]">
                        <span className="h-full w-full rounded-sm bg-slate-700" />
                        <span className="h-full w-full rounded-sm border border-slate-400" />
                        <span className="h-full w-full rounded-sm border border-slate-400" />
                        <span className="h-full w-full rounded-sm bg-slate-700" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">QR code</div>
                      <div className="text-xs text-slate-500">Scan to sign on your phone.</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureHubStep("email")}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#024d7c]/60 hover:shadow-md sm:col-span-2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Email link</div>
                      <div className="text-xs text-slate-500">
                        Email yourself a link to sign on another device.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : null}

            {signatureHubStep === "type" ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-800">Type your name</label>
                    <input
                      type="text"
                      value={typeSignatureText}
                      onChange={(event) => {
                        setTypeSignatureText(event.target.value);
                        setTypedSignatureError(null);
                        setSignatureNameError(null);
                      }}
                      placeholder="e.g. John Smith"
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Style</div>
                    <div className="flex flex-wrap gap-2">
                      {TYPED_SIGNATURE_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            typeSignatureStyle === style.id
                              ? "border-[#024d7c] bg-[#024d7c] text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                          onClick={() => {
                            setTypeSignatureStyle(style.id);
                            setTypedSignatureError(null);
                          }}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
                  <div className="mt-2 flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2">
                    {typedSignaturePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={typedSignaturePreview}
                        alt="Typed signature preview"
                        className="max-h-24 w-full max-w-xl object-contain"
                      />
                    ) : (
                      <span className="text-sm text-slate-500">Enter a name to preview.</span>
                    )}
                  </div>
                  {(typedSignatureError || signatureNameError) && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      {typedSignatureError || signatureNameError}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    onClick={() => setSignatureHubStep("gallery")}
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                      onClick={() => setTypeSignatureText("")}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                      onClick={handleSaveTypedSignature}
                      disabled={!typeSignatureText.trim()}
                    >
                      Save &amp; Use
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {signatureHubStep === "qr" ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Scan with your phone to open a signing link and draw in landscape mode. Copy the link if your camera can&apos;t read the QR.
                </p>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 shadow-inner">
                      {mobileSessionUrl ? (
                        <QRCode value={mobileSessionUrl} size={160} className="h-40 w-40" />
                      ) : (
                        <div className="flex h-40 w-40 items-center justify-center text-sm text-slate-500">Preparing QR…</div>
                      )}
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                        onClick={startMobileSession}
                      >
                        Generate new QR
                      </button>
                      {mobileSessionStatus === "received" ? (
                        <div className="text-xs font-semibold text-emerald-600">Signature received!</div>
                      ) : mobileSessionStatus === "error" ? (
                        <div className="text-xs font-semibold text-rose-600">Connection error. Regenerate.</div>
                      ) : (
                        <div className="text-xs text-slate-500">Waiting for your phone…</div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">How it works</div>
                      <ol className="list-decimal space-y-1 pl-4">
                        <li>Scan the QR with your phone.</li>
                        <li>Draw your signature on the mobile page.</li>
                        <li>We&apos;ll drop it into this project automatically.</li>
                      </ol>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-600">Link</span>
                        <code className="rounded bg-white px-2 py-1 text-[0.7rem] text-slate-700">
                          {mobileSessionUrl ?? mobileCaptureLink}
                        </code>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                          onClick={handleCopyMobileLink}
                          disabled={!mobileSessionUrl}
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    onClick={() => setSignatureHubStep("gallery")}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}

            {signatureHubStep === "email" ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Send yourself a link to draw a signature on your phone. We&apos;ll open your mail client so you keep control of your inbox.
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-inner">
                  <label className="text-sm font-semibold text-slate-800">Email for mobile signing link</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="email"
                      value={mobileEmail}
                      onChange={(event) => setMobileEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                    />
                    <button
                      type="button"
                      className="rounded-full bg-[#024d7c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
                      onClick={() => {
                        if (!mobileEmail.trim()) return;
                        const link = mobileSessionUrl ?? mobileCaptureLink;
                        const mailto = `mailto:${mobileEmail}?subject=Sign%20on%20your%20phone&body=${encodeURIComponent(
                          `Open this link on your phone to draw your signature: ${link}`
                        )}`;
                        window.open(mailto, "_blank");
                      }}
                      disabled={!mobileEmail.trim()}
                    >
                      Open email app
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    The link is{" "}
                    <code className="rounded bg-white px-2 py-1 text-[0.7rem] text-slate-700">
                      {mobileSessionUrl ?? mobileCaptureLink}
                    </code>
                    . Save it if you prefer to share manually.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    onClick={() => setSignatureHubStep("gallery")}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDrawModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseDrawModal} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-[0_40px_120px_rgba(5,10,30,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Draw signature</h3>
                <p className="text-sm text-slate-600">Use your mouse or trackpad. Clear if you want to restart.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <canvas
                ref={drawCanvasRef}
                className="h-[220px] w-full bg-white"
                onPointerDown={handleDrawPointerDown}
                onPointerMove={handleDrawPointerMove}
                onPointerUp={handleDrawPointerUp}
                onPointerLeave={handleDrawPointerUp}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                onClick={clearDrawCanvas}
              >
                Clear
              </button>
              {drawStep === "name" ? null : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    onClick={handleCloseDrawModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
                    onClick={handleDrawContinue}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
            {drawStep === "name" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-800">Name this signature</label>
                  <input
                    type="text"
                    value={drawSignatureName}
                    onChange={(event) => {
                      setDrawSignatureName(event.target.value);
                      setSignatureNameError(null);
                      setDrawSignatureError(null);
                    }}
                    placeholder="Alan – full signature"
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                  />
                  {(drawSignatureError || signatureNameError) && (
                    <p className="text-xs font-semibold text-rose-600">
                      {drawSignatureError || signatureNameError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                    onClick={() => setDrawStep("canvas")}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
                    onClick={handleSaveDrawnSignature}
                  >
                    Save &amp; Use
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseUploadModal} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-[0_40px_120px_rgba(5,10,30,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Upload signature</h3>
                <p className="text-sm text-slate-600">Use a PNG, JPG, or SVG and give it a name.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100">
                <UploadCloud className="h-5 w-5" />
                <span>Select signature image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadFileInput} />
              </label>
              {uploadPreview ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt="Uploaded signature preview"
                    className="h-16 w-28 rounded border border-slate-100 object-contain"
                  />
                  <div className="text-sm text-slate-700">Preview</div>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-800">Name this signature</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(event) => {
                    setUploadName(event.target.value);
                    setUploadError(null);
                    setSignatureNameError(null);
                  }}
                  placeholder="e.g. Alan – initials"
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                />
              </div>
              {(uploadError || signatureNameError) && (
                <p className="text-xs font-semibold text-rose-600">{uploadError || signatureNameError}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  onClick={handleCloseUploadModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                  disabled={!uploadPreview}
                  onClick={handleSaveUploadedSignature}
                >
                  Save &amp; Use
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDownloadGate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDownloadGate(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-[32px] bg-white p-8 text-slate-900 shadow-[0_40px_120px_rgba(5,10,30,0.45)]">
            <h2 className="text-2xl font-semibold">Save your work & get another free upload</h2>
            <p className="mt-3 text-sm text-slate-600">
              Your PDF is ready. Create a free account to save this project and unlock one more free upload, or upgrade
              to Pro for unlimited uploads.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleDownloadGateSignUp}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#024d7c] px-5 py-3 text-base font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
              >
                Sign up free – Save your projects + 1 more free upload
              </button>
              <button
                type="button"
                onClick={handleDownloadGateUpgrade}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-[#024d7c] shadow-sm transition hover:-translate-y-0.5"
              >
                Upgrade to Pro – Unlimited uploads & faster processing
              </button>
              <button
                type="button"
                onClick={handleDownloadGateBypass}
                className="text-center text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
              >
                Not now (just download this one)
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDelayOverlay ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur">
          <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-[32px] bg-white p-8 text-center text-slate-900 shadow-[0_35px_90px_rgba(9,14,35,0.25)]">
            <img src="/logo-wordmark2.svg" alt="MergifyPDF" className="h-10 w-auto" />
            <p className="text-lg font-semibold">Preparing your download…</p>
            {showDelayOverlay === "progress" ? (
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full w-full rounded-full bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-[#1c80d6]"
                  style={{ animation: "mpdf-progress 3s linear forwards" }}
                />
              </div>
            ) : null}
            <p className="text-sm text-slate-500">
              Create a free account to remove this delay and get another free upload.
            </p>
          </div>
        </div>
      ) : null}

	      <div className="shrink-0 border-t border-slate-200 bg-white/85 shadow-[0_-18px_40px_rgba(15,23,42,0.12)] backdrop-blur-md">
	        <div className="flex w-full justify-end px-4 py-3 lg:px-8">
	          <div className="flex flex-wrap items-center justify-end gap-3">
		            <div className="flex items-center gap-5">
		              <span className="text-base font-semibold text-slate-800">Zoom</span>
		              <div className="flex items-center gap-1.5">
			                <input
			                  type="range"
			                  min={ZOOM_MIN_PERCENT}
			                  max={ZOOM_MAX_PERCENT}
			                  step={ZOOM_STEP_PERCENT}
			                  value={zoomPercent}
			                  onChange={(e) => setZoomWithScrollPreserved(Number(e.target.value))}
		                  disabled={pages.length === 0}
		                  className="horizontal-slider w-44 sm:w-72"
		                />
		                <span className="w-[52px] text-right text-base font-semibold tabular-nums text-slate-900">
		                  {zoomLabel}
		                </span>
		              </div>
		            </div>

	            <div className="hidden h-10 w-px bg-slate-200 sm:block" aria-hidden />

		            <div className="flex items-center gap-3">
		              <button
		                type="button"
		                aria-label="Previous page"
		                className={bottomBarButtonClass}
	                onClick={() => handlePageStep(-1)}
	                disabled={activePageIndex <= 0}
	              >
			                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
	                  <path
	                    d="M14 6l-6 6 6 6"
	                    stroke="currentColor"
	                    strokeWidth="2"
	                    strokeLinecap="round"
	                    strokeLinejoin="round"
	                  />
	                </svg>
	              </button>
	              <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
	                <input
	                  value={pageNumberDraft}
	                  onChange={(event) => {
	                    const next = event.target.value.replace(/[^\d]/g, "");
	                    setPageNumberDraft(next);
	                  }}
	                  onBlur={commitPageNumberDraft}
	                  onKeyDown={(event) => {
	                    if (event.key === "Enter") {
	                      event.currentTarget.blur();
	                      return;
	                    }
	                    if (event.key === "Escape") {
	                      const idx =
	                        activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : 0;
	                      setPageNumberDraft(String(idx + 1));
	                      event.currentTarget.blur();
	                    }
	                  }}
	                  inputMode="numeric"
	                  pattern="[0-9]*"
	                  disabled={pages.length === 0}
	                  className="h-10 w-16 rounded-full border border-slate-200 bg-white px-2 text-center text-base font-semibold tabular-nums text-slate-900 shadow-sm outline-none transition focus:border-[#51bdff] focus:ring-2 focus:ring-[#51bdff]/30 disabled:opacity-60"
	                  aria-label="Page number"
	                />
	                <span className="text-slate-400">/</span>
	                <span className="tabular-nums text-slate-700">{pages.length || 0}</span>
	              </div>
	              <button
	                type="button"
	                aria-label="Next page"
	                className={bottomBarButtonClass}
	                onClick={() => handlePageStep(1)}
	                disabled={activePageIndex === pages.length - 1 || pages.length === 0}
	              >
			                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
	                  <path
	                    d="M10 6l6 6-6 6"
	                    stroke="currentColor"
	                    strokeWidth="2"
	                    strokeLinecap="round"
	                    strokeLinejoin="round"
	                  />
	                </svg>
		              </button>
		            </div>

			          </div>
			        </div>
			      </div>

	      <style jsx global>{`
	        .horizontal-slider {
	          -webkit-appearance: none;
	          appearance: none;
	          height: 16px;
	          background: transparent;
	          cursor: pointer;
	        }
	        .horizontal-slider::-webkit-slider-runnable-track {
	          height: 8px;
	          border-radius: 9999px;
	          background-color: #cbd5e1;
	        }
	        .horizontal-slider::-webkit-slider-thumb {
	          -webkit-appearance: none;
	          appearance: none;
	          width: 16px;
	          height: 16px;
	          border-radius: 9999px;
	          background-color: #111827;
	          border: none;
	          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.22);
	          margin-top: -4px;
	        }
	        .horizontal-slider::-moz-range-thumb {
	          width: 16px;
	          height: 16px;
	          border-radius: 9999px;
	          background-color: #111827;
	          border: none;
	          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.22);
	        }
	        .horizontal-slider::-moz-range-track {
	          height: 8px;
	          border-radius: 9999px;
	          background-color: #cbd5e1;
	        }
        .viewer-scroll {
          overflow: auto;
        }
        .thumbs-scroll::-webkit-scrollbar-track {
          background: #ffffff;
        }
        .thumbs-scroll::-webkit-scrollbar-thumb {
          border: 3px solid #ffffff;
        }
        .thumbs-scroll {
          scrollbar-color: rgba(100, 116, 139, 0.85) #ffffff;
        }
        .tools-scroll::-webkit-scrollbar {
          height: 0px;
        }
        .tools-scroll {
          scrollbar-width: none;
        }
        /* Make scrollbar gutters/tracks white across Studio */
        body.studio-page * {
          scrollbar-color: rgba(100, 116, 139, 0.85) #ffffff;
        }
        body.studio-page ::-webkit-scrollbar {
          background: #ffffff;
        }
        body.studio-page ::-webkit-scrollbar-track {
          background: #ffffff;
        }
        body.studio-page ::-webkit-scrollbar-corner {
          background: #ffffff;
        }
        body.studio-page ::-webkit-scrollbar-thumb {
          background-color: rgba(100, 116, 139, 0.85);
          border: 3px solid #ffffff;
          border-radius: 9999px;
        }
        body.studio-page > header {
          display: none !important;
        }
        @keyframes page-enter {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes mpdf-progress {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}

/** Disable SSR because pdfjs/canvas must run in the browser only */
export default dynamic(() => Promise.resolve(WorkspaceClient), { ssr: false });
