"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CSSProperties,
  ClipboardEvent as ReactClipboardEvent,
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
  Image as ImageIcon,
  Pin,
  Type,
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
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  DropletOff,
  Pipette,
  PanelRightClose,
  PanelRightOpen,
  MoreHorizontal,
	  Copy,
  List,
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
type LineStyle = "solid" | "dashed";
type ShapeAnnotation = {
  id: string;
  type: ShapeType;
  pageId: string;
  start: Point;
  end: Point;
  color: string;
  fillColor?: string | null;
  thickness: number;
  lineStyle?: LineStyle;
};
type HighlightStroke = {
  id: string;
  tool: DrawingTool;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
  lineStyle?: LineStyle;
};
type DraftHighlight = {
  tool: Exclude<DrawingTool, "text">;
  pageId: string;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
  lineStyle?: LineStyle;
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
  textSizePt?: number;
  richTextHtml?: string;
  lineSpacing?: number;
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

  const HIGHLIGHT_NEUTRAL_ROW = [98, 90, 78, 62, 46, 30, 16, 0] as const;
  const HIGHLIGHT_ROW_LIGHTNESS = [90, 78, 64, 54, 38, 22] as const;
  const HIGHLIGHT_ROW_SATURATION = [45, 60, 70, 90, 72, 60] as const;
  const HIGHLIGHT_HUES = [0, 20, 45, 120, 180, 210, 270, 320] as const;
  const HIGHLIGHT_COLOR_ROWS = [
    HIGHLIGHT_NEUTRAL_ROW.map((lightness) => hslToHex(0, 0, lightness)),
    ...HIGHLIGHT_ROW_LIGHTNESS.map((lightness, rowIndex) =>
      HIGHLIGHT_HUES.map((hue) => {
        const saturation =
          hue === 45 && rowIndex === 3 ? 100 : HIGHLIGHT_ROW_SATURATION[rowIndex];
        return hslToHex(hue, saturation, lightness);
      })
    ),
  ];

  const HIGHLIGHT_CURSOR =
    "data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 24 L24 2 L30 8 L10 28 L3 29 Z' fill='%23024d7c'/%3E%3Crect x='5' y='25' width='10' height='3' fill='%23ffd43b'/%3E%3C/svg%3E";
// Render PDF pages at a higher base scale so
// previews stay razor sharp even when downscaled
// into small project cards and slideshows.
const PREVIEW_BASE_SCALE = 4;
const MAX_DEVICE_PIXEL_RATIO = 4;
const TEXT_PLACEHOLDER = "Type here";
const TEXT_DEFAULT_WIDTH_PX = 360;
const TEXT_DEFAULT_HEIGHT_PX = 48;
const PT_TO_PX = 96 / 72;
const PX_TO_PT = 72 / 96;
const TEXT_SIZE_MIN_PT = 1;
const TEXT_SIZE_MAX_PT = 96;
const DEFAULT_TEXT_SIZE_PT = 11;
const DEFAULT_TEXT_SIZE_PX = DEFAULT_TEXT_SIZE_PT * PT_TO_PX;
const DEFAULT_TEXT_LINE_SPACING = 1.0;
const INITIAL_PREVIEW_RENDER_COUNT = 10;
const LOW_RES_PREVIEW_SCALE = PREVIEW_BASE_SCALE * 0.5;
const MAX_PARALLEL_PREVIEW_RENDERS = 6;
const MAX_PARALLEL_LOW_PREVIEW_RENDERS = 2;
const MAX_PARALLEL_THUMB_RENDERS = 1;
const MIN_STARTUP_OVERLAY_MS = 4000;
const STARTUP_OVERLAY_FULL_HOLD_MS = 1000;
const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.98;
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
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

function applyTextTransform(value: string, transform: "none" | "uppercase") {
  if (transform === "uppercase") return value.toUpperCase();
  return value;
}


function rotatePoint(point: { x: number; y: number }, origin: { x: number; y: number }, angleRad: number) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

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

function rgbToHex(r: number, g: number, b: number) {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clampChannel(r).toString(16).padStart(2, "0")}${clampChannel(g)
    .toString(16)
    .padStart(2, "0")}${clampChannel(b).toString(16).padStart(2, "0")}`;
}

function rgbToHsv(r: number, g: number, b: number) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      hue = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      hue = (bNorm - rNorm) / delta + 2;
    } else {
      hue = (rNorm - gNorm) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const saturation = max === 0 ? 0 : delta / max;
  const value = max;
  return { h: hue, s: saturation * 100, v: value * 100 };
}

function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s / 100));
  const val = Math.max(0, Math.min(1, v / 100));
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function hslToHex(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s / 100));
  const light = Math.max(0, Math.min(1, l / 100));
  if (sat === 0) {
    const gray = Math.round(light * 255);
    return rgbToHex(gray, gray, gray);
  }
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function normalizeCssColor(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent") return null;
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed.slice(0, 7);
  }
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (match) {
    const alpha = match[4] ? Number(match[4]) : 1;
    if (Number.isNaN(alpha) || alpha <= 0) return null;
    return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return null;
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

function normalizeTextSize(value: number) {
  const snapped = Math.round(value * 2) / 2;
  return clamp(snapped, TEXT_SIZE_MIN_PT, TEXT_SIZE_MAX_PT);
}

type RichTextRun = {
  text: string;
  sizePt: number;
  color?: string;
  highlightColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

type StrikeOverlayLine = {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function parseFontSize(styleValue: string, fallback: number) {
  const matchPt = styleValue.match(/(\d+(\.\d+)?)pt/);
  if (matchPt) {
    const parsed = Number(matchPt[1]);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  const matchPx = styleValue.match(/(\d+(\.\d+)?)px/);
  if (matchPx) {
    const parsed = Number(matchPx[1]);
    return Number.isNaN(parsed) ? fallback : parsed / PT_TO_PX;
  }
  return fallback;
}

function parseLineHeightPx(styleValue: string, fontSizePx: number) {
  if (!styleValue || styleValue === "normal") {
    return fontSizePx * 1.2;
  }
  const unitless = styleValue.match(/^\d+(\.\d+)?$/);
  if (unitless) {
    const parsed = Number(styleValue);
    return Number.isNaN(parsed) ? fontSizePx * 1.2 : fontSizePx * parsed;
  }
  const matchPx = styleValue.match(/(\d+(\.\d+)?)px/);
  if (matchPx) {
    const parsed = Number(matchPx[1]);
    return Number.isNaN(parsed) ? fontSizePx * 1.2 : parsed;
  }
  const matchEm = styleValue.match(/(\d+(\.\d+)?)em/);
  if (matchEm) {
    const parsed = Number(matchEm[1]);
    return Number.isNaN(parsed) ? fontSizePx * 1.2 : fontSizePx * parsed;
  }
  const matchPercent = styleValue.match(/(\d+(\.\d+)?)%/);
  if (matchPercent) {
    const parsed = Number(matchPercent[1]);
    return Number.isNaN(parsed) ? fontSizePx * 1.2 : fontSizePx * (parsed / 100);
  }
  return fontSizePx * 1.2;
}

function extractRichTextRuns(html: string, fallbackSize: number) {
  if (typeof document === "undefined") {
    return [{ text: html, sizePt: fallbackSize }];
  }
  const container = document.createElement("div");
  container.innerHTML = html;
  const runs: RichTextRun[] = [];

  const pushText = (text: string, run: Omit<RichTextRun, "text">) => {
    const cleaned = text.replace(/[\u200b\u2060]/g, "");
    if (!cleaned) return;
    runs.push({ text: cleaned, ...run });
  };

  const walk = (
    node: Node,
    current: {
      sizePt: number;
      color?: string;
      highlightColor?: string;
      bold: boolean;
      italic: boolean;
      underline: boolean;
    }
  ) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "", current);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      runs.push({ text: "\n", ...current });
      return;
    }
    let next = { ...current };
    if (el.dataset.fontSizePt) {
      const parsed = Number(el.dataset.fontSizePt);
      if (!Number.isNaN(parsed)) {
        next.sizePt = parsed;
      }
    } else if (el.style.fontSize) {
      next.sizePt = parseFontSize(el.style.fontSize, current.sizePt);
    }
    if (el.style.color) {
      next.color = normalizeCssColor(el.style.color) ?? current.color;
    }
    if (!next.color && el.tagName === "FONT") {
      const attr = el.getAttribute("color");
      if (attr) {
        next.color = normalizeCssColor(attr) ?? next.color;
      }
    }
    if (el.style.backgroundColor) {
      const normalized = normalizeCssColor(el.style.backgroundColor);
      next.highlightColor = normalized ?? current.highlightColor;
    }
    const tag = el.tagName;
    if (tag === "B" || tag === "STRONG") next.bold = true;
    if (tag === "I" || tag === "EM") next.italic = true;
    if (tag === "U") next.underline = true;
    if (el.style.fontWeight) {
      const weight = el.style.fontWeight;
      if (weight === "bold" || Number(weight) >= 600) next.bold = true;
    }
    if (el.style.fontStyle === "italic") next.italic = true;
    const decoration = el.style.textDecorationLine || el.style.textDecoration;
    if (decoration.includes("underline")) next.underline = true;
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    el.childNodes.forEach((child) => walk(child, next));
    if (isBlock) {
      runs.push({ text: "\n", ...next });
    }
  };

  container.childNodes.forEach((child) =>
    walk(child, {
      sizePt: fallbackSize,
      color: undefined,
      highlightColor: undefined,
      bold: false,
      italic: false,
      underline: false,
    })
  );
  return runs.length > 0 ? runs : [{ text: "", sizePt: fallbackSize }];
}

function splitRunsIntoLines(runs: RichTextRun[]) {
  const lines: RichTextRun[][] = [[]];
  runs.forEach((run) => {
    const parts = run.text.split(/\r?\n/);
    parts.forEach((part, idx) => {
      if (part) lines[lines.length - 1].push({ ...run, text: part });
      if (idx < parts.length - 1) lines.push([]);
    });
  });
  return lines;
}

function smoothStrokePointsBase(points: Point[], iterations: number): Point[] {
  if (points.length < 3 || iterations <= 0) return points;
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

function smoothStrokePoints(points: Point[], tool: Exclude<DrawingTool, "text">): Point[] {
  if (points.length < 3) return points;
  const isPen = tool === "pen" || tool === "pencil";
  const baseIterations = isPen ? 2 : 1;
  const iterations = points.length > 420 ? 1 : baseIterations;
  if (!isPen) return smoothStrokePointsBase(points, iterations);
  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const len = Math.max(1e-6, Math.hypot(dx, dy));
  const maxDeviation = points.reduce((max, pt) => {
    const proj = ((pt.x - first.x) * dx + (pt.y - first.y) * dy) / (len * len);
    const closestX = first.x + proj * dx;
    const closestY = first.y + proj * dy;
    const dist = Math.hypot(pt.x - closestX, pt.y - closestY);
    return Math.max(max, dist);
  }, 0);
  if (maxDeviation < 0.0025) return points;
  return smoothStrokePointsBase(points, iterations);
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
  shape: Pick<ShapeAnnotation, "type" | "start" | "end" | "lineStyle">,
  opts: {
    stroke: string;
    strokeWidth: number;
    strokeOpacity?: number;
    fill?: string | null;
    fillOpacity?: number;
    interactiveProps?: SVGProps<SVGElement>;
    vectorEffect?: "non-scaling-stroke";
  }
) {
  const strokeOpacity = opts.strokeOpacity ?? 1;
  const allowDashed = shape.type !== "check" && shape.type !== "arrow";
  const isDashed = allowDashed && shape.lineStyle === "dashed";
  const dashArray = isDashed ? `${opts.strokeWidth * 2.5} ${opts.strokeWidth * 1.5}` : undefined;
  const strokeCommon = {
    stroke: opts.stroke,
    strokeWidth: opts.strokeWidth,
    strokeOpacity,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashArray,
    vectorEffect: opts.vectorEffect,
  };
  const fill = opts.fill ?? "none";
  const fillOpacity = opts.fillOpacity ?? 1;
  const filledCommon = {
    ...strokeCommon,
    fill,
    fillOpacity,
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
	      return <line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeCommon} {...(opts.interactiveProps as any)} />;
	    case "arrow": {
      const head = makeArrowHead();
      return (
        <g {...(opts.interactiveProps as any)}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} {...strokeCommon} />
          <line x1={x2} y1={y2} x2={head.lx} y2={head.ly} {...strokeCommon} />
          <line x1={x2} y1={y2} x2={head.rx} y2={head.ry} {...strokeCommon} />
        </g>
      );
    }
    case "rect":
      return (
        <rect
          x={minXPx}
          y={minYPx}
          width={wPx}
          height={hPx}
          rx={0}
          {...filledCommon}
          {...(opts.interactiveProps as any)}
        />
      );
	    case "ellipse":
	      return (
	        <ellipse
	          cx={minXPx + wPx / 2}
	          cy={minYPx + hPx / 2}
	          rx={wPx / 2}
	          ry={hPx / 2}
	          {...filledCommon}
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
	          {...filledCommon}
	          {...(opts.interactiveProps as any)}
	        />
	      );
	    }
	    case "x":
	      return (
	        <g {...(opts.interactiveProps as any)}>
	          <line x1={minXPx} y1={minYPx} x2={minXPx + wPx} y2={minYPx + hPx} {...strokeCommon} />
          <line x1={minXPx + wPx} y1={minYPx} x2={minXPx} y2={minYPx + hPx} {...strokeCommon} />
        </g>
      );
    case "check": {
      const p1 = { x: minXPx + wPx * 0.0, y: minYPx + hPx * 0.62 };
      const p2 = { x: minXPx + wPx * 0.32, y: minYPx + hPx * 0.9 };
      const p3 = { x: minXPx + wPx * 1.0, y: minYPx + hPx * 0.12 };
      return (
        <polyline
          points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          {...strokeCommon}
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
  registerThumbNode,
}: {
  item: PageItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disableMoveDown: boolean;
  registerThumbNode: (id: string) => (node: HTMLLIElement | null) => void;
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
	    <li
        ref={(node) => {
          setNodeRef(node);
          registerThumbNode(item.id)(node);
        }}
        data-thumb-id={item.id}
        style={style}
        className="flex w-full justify-center"
        {...attributes}
      >
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
	              className="relative z-0 flex h-full w-full items-center justify-center"
	              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
	            >
              <div className="absolute inset-0 bg-white" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumb || TRANSPARENT_PIXEL}
                alt={`Page ${index + 1}`}
                className={`block h-full w-full object-contain transition-opacity duration-200 ${
                  item.thumb ? "opacity-100" : "opacity-0"
                }`}
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
              className={`relative h-full w-full bg-white border border-[rgba(148,163,184,0.5)] ${
                isDragging
                  ? "shadow-[0_8px_26px_rgba(15,23,42,0.24),_0_24px_60px_rgba(15,23,42,0.30)]"
                  : "shadow-[0_6px_20px_rgba(15,23,42,0.18),_0_18px_45px_rgba(15,23,42,0.22)] group-hover:outline group-hover:outline-[rgba(37,99,235,0.35)] group-hover:outline-1 group-hover:outline-offset-2 group-hover:shadow-[0_6px_20px_rgba(15,23,42,0.21),_0_18px_45px_rgba(15,23,42,0.25)]"
              } transition-shadow duration-200 ease-out`}
              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
            >
              <div className="absolute inset-0 bg-white" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview || TRANSPARENT_PIXEL}
                alt={`Page ${index + 1}`}
                className={`h-full w-full object-contain select-none transition-opacity duration-200 ${
                  item.preview ? "opacity-100" : "opacity-0"
                }`}
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
		  const [baseScale, setBaseScale] = useState(PT_TO_PX);
		  const [userAdjustedZoom, setUserAdjustedZoom] = useState(false);
		  // 100% = true document scale (1pt = 1/72in).
		  const zoomMultiplier = clamp(zoomPercent / 100, ZOOM_MIN_PERCENT / 100, MAX_ZOOM_MULTIPLIER);
  const [showPageOrderPanel, setShowPageOrderPanel] = useState(true);
  const pageNavigationLockRef = useRef<{ until: number; targetId: string } | null>(null);
  const scrollRatioRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0 });
  const restoreScrollOnNextZoomRef = useRef(false);
  const pageLayoutRef = useRef<{ ids: string[]; centers: number[] }>({ ids: [], centers: [] });
  const pageLayoutRafRef = useRef<number | null>(null);
  const scrollUpdateRafRef = useRef<number | null>(null);
  const activePageIdRef = useRef<string | null>(null);
  const activePageIndexRef = useRef(0);
  const suppressNextAutoZoomRef = useRef(0);
  const draftHighlightRef = useRef<DraftHighlight | null>(null);
  const draftHighlightLiveRafRef = useRef<number | null>(null);
  const draftHighlightLivePathRef = useRef<{ pageId: string; d: string; last: Point | null } | null>(null);
  const draftHighlightPathMapRef = useRef<Map<string, SVGPathElement>>(new Map());
  const pdfDocumentCacheRef = useRef<Map<number, any>>(new Map());
  const renderQueueRef = useRef<
    Array<{ pageId: string; srcIdx: number; pageIdx: number; quality: "low" | "high"; priority: number }>
  >([]);
  const renderQueueKeyRef = useRef<Set<string>>(new Set());
  const renderQueueRafRef = useRef<number | null>(null);
  const activeRenderCountRef = useRef(0);
  const pageRenderStatusRef = useRef<Map<string, "low" | "high" | "rendering-low" | "rendering-high">>(new Map());
  const thumbRenderQueueRef = useRef<Array<{ pageId: string; srcIdx: number; pageIdx: number; priority: number }>>([]);
  const thumbRenderQueueKeyRef = useRef<Set<string>>(new Set());
  const thumbRenderRafRef = useRef<number | null>(null);
  const thumbRenderActiveRef = useRef(0);
  const thumbRenderStatusRef = useRef<Map<string, "ready" | "rendering">>(new Map());
  const thumbNodeMapRef = useRef<Map<string, HTMLLIElement>>(new Map());
  const visibleThumbIdsRef = useRef<Set<string>>(new Set());
  const thumbsScrollRef = useRef<HTMLDivElement | null>(null);
  const [visibleThumbIds, setVisibleThumbIds] = useState<string[]>([]);
  const [previewHeightLimit, setPreviewHeightLimit] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [highlightOpacity, setHighlightOpacity] = useState(0.35);
  const [showStartupOverlay, setShowStartupOverlay] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0);
  const startupOverlayActiveRef = useRef(false);
  const startupOverlayStartRef = useRef<number | null>(null);
  const startupOverlayTimerRef = useRef<number | null>(null);
  const startupProgressRef = useRef(0);
  const startupProgressTimerRef = useRef<number | null>(null);
  const [penMode, setPenMode] = useState(false);
  const [penThickness, setPenThickness] = useState(3);
  const [penColor, setPenColor] = useState(PEN_COLOR);
  const [penOpacity, setPenOpacity] = useState(1);
  const [penLineStyle, setPenLineStyle] = useState<LineStyle>("solid");
  const [penThicknessInput, setPenThicknessInput] = useState("3");
  const [penOpacityInput, setPenOpacityInput] = useState("100");
  const [recentInsertedPageId, setRecentInsertedPageId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(true);
  const [shapeMode, setShapeMode] = useState(false);
  const [shapeType, setShapeType] = useState<ShapeType | null>(null);
  const [shapeThickness, setShapeThickness] = useState(3);
  const [shapeColor, setShapeColor] = useState(PEN_COLOR);
  const [shapeFillColor, setShapeFillColor] = useState<string | null>(null);
  const [shapeLineStyle, setShapeLineStyle] = useState<LineStyle>("solid");
  const [shapeThicknessInput, setShapeThicknessInput] = useState("3");
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
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [imageUploadPreview, setImageUploadPreview] = useState<string | null>(null);
  const [imageUploadName, setImageUploadName] = useState("");
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
const [highlights, setHighlights] = useState<Record<string, HighlightStroke[]>>({});
const [textAnnotations, setTextAnnotations] = useState<Record<string, TextAnnotation[]>>({});
const [textBold, setTextBold] = useState(false);
const [textItalic, setTextItalic] = useState(false);
const [textUnderline, setTextUnderline] = useState(false);
const [defaultTextStyles, setDefaultTextStyles] = useState({
  bold: false,
  italic: false,
  underline: false,
});
const [listType, setListType] = useState<"bullet" | "number" | null>(null);
  const [textTransform, setTextTransform] = useState<"none" | "uppercase">("none");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [textSizeInput, setTextSizeInput] = useState<string>(`${DEFAULT_TEXT_SIZE_PT}`);
  const [toolbarTooltip, setToolbarTooltip] = useState<{ label: string; x: number; y: number; visible: boolean }>({
    label: "",
    x: 0,
    y: 0,
    visible: false,
  });
  const toolbarTooltipTargetRef = useRef<HTMLElement | null>(null);
  const [textFont, setTextFont] = useState<TextFont>("Arial");
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE_PT);
  const [textColor, setTextColor] = useState("#111827");
  const [selectionFontSizePt, setSelectionFontSizePt] = useState<number | null>(null);
  const [selectionTextColor, setSelectionTextColor] = useState<string | null>(null);
  const [selectionTextColorMixed, setSelectionTextColorMixed] = useState(false);
  const [pendingTextSizePt, setPendingTextSizePt] = useState<number | null>(null);
  const [pendingTextColor, setPendingTextColor] = useState<string | null>(null);
const [highlightHistory, setHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [redoHighlightHistory, setRedoHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [shapesByPage, setShapesByPage] = useState<Record<string, ShapeAnnotation[]>>({});
  const [focusedShapeId, setFocusedShapeId] = useState<string | null>(null);
  const [focusedShapePageId, setFocusedShapePageId] = useState<string | null>(null);
  const [draggingShape, setDraggingShape] = useState<{
    pageId: string;
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizingShape, setResizingShape] = useState<{
    pageId: string;
    id: string;
    handle:
      | "nw"
      | "ne"
      | "sw"
      | "se"
      | "n"
      | "s"
      | "e"
      | "w"
      | "start"
      | "end"
      | "tri-top"
      | "tri-left"
      | "tri-right";
    pointerId: number;
  } | null>(null);
  const shapeDragCleanupRef = useRef<(() => void) | null>(null);
  const shapeDragRafRef = useRef<number | null>(null);
  const shapeDragLatestPointRef = useRef<Point | null>(null);
  const shapeDragLatestShapeRef = useRef<{ start: Point; end: Point } | null>(null);
  const shapeResizeCleanupRef = useRef<(() => void) | null>(null);
  const shapeResizeRafRef = useRef<number | null>(null);
  const shapeResizeLatestRef = useRef<{ start: Point; end: Point } | null>(null);
  const shapeRenderNodeMap = useRef<Map<string, SVGGElement>>(new Map());
  const shapeHitNodeMap = useRef<Map<string, SVGGElement>>(new Map());
  const shapeIndicatorNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const shapeHandleNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [draftShape, setDraftShape] = useState<{
    pageId: string;
    type: ShapeType;
    start: Point;
    end: Point;
    color: string;
    fillColor?: string | null;
    thickness: number;
    lineStyle?: LineStyle;
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
  const textDragRafRef = useRef<number | null>(null);
  const textDragLatestPointRef = useRef<Point | null>(null);
  const textDragLatestPosRef = useRef<{ x: number; y: number } | null>(null);
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
  const textResizeRafRef = useRef<number | null>(null);
  const textResizeLatestRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [draftTextBox, setDraftTextBox] = useState<{
    pageId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    rectWidth: number;
    rectHeight: number;
  } | null>(null);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement | null>(null);
  const fontMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fontMenuPosition, setFontMenuPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const alignMenuRef = useRef<HTMLDivElement | null>(null);
  const alignMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [alignMenuPosition, setAlignMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [lineSpacingMenuOpen, setLineSpacingMenuOpen] = useState(false);
  const lineSpacingMenuRef = useRef<HTMLDivElement | null>(null);
  const lineSpacingMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [lineSpacingMenuPosition, setLineSpacingMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [lineStyleMenuOpen, setLineStyleMenuOpen] = useState(false);
  const lineStyleMenuRef = useRef<HTMLDivElement | null>(null);
  const lineStyleMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [lineStyleMenuPosition, setLineStyleMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [shapeLineStyleMenuOpen, setShapeLineStyleMenuOpen] = useState(false);
  const shapeLineStyleMenuRef = useRef<HTMLDivElement | null>(null);
  const shapeLineStyleMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [shapeLineStyleMenuPosition, setShapeLineStyleMenuPosition] = useState<{ left: number; top: number } | null>(
    null
  );
  const [colorPickerOpen, setColorPickerOpen] = useState<
    "text" | "shape-border" | "shape-fill" | "pen" | null
  >(null);
  const [colorPickerDraft, setColorPickerDraft] = useState("#111827");
  const textColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const shapeBorderColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const shapeFillColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const penColorButtonRef = useRef<HTMLButtonElement | null>(null);
  const highlightPopoverRef = useRef<HTMLDivElement | null>(null);
  const [highlightPopoverPosition, setHighlightPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [highlightCustomOpen, setHighlightCustomOpen] = useState(false);
  const [highlightCustomHue, setHighlightCustomHue] = useState(0);
  const [highlightCustomSat, setHighlightCustomSat] = useState(100);
  const [highlightCustomVal, setHighlightCustomVal] = useState(100);
  const [customTextColors, setCustomTextColors] = useState<string[]>([]);
  const customTextColorStorageKey = useMemo(() => {
    const userKey = authSession?.user?.email ?? authSession?.user?.name ?? "guest";
    return `mergifypdf:text-colors:${userKey}`;
  }, [authSession?.user?.email, authSession?.user?.name]);
  const [focusedTextId, setFocusedTextId] = useState<string | null>(null);
  const [activeTextContainerId, setActiveTextContainerId] = useState<string | null>(null);
  const [typingTextId, setTypingTextId] = useState<string | null>(null);
  const typingTextTimeoutRef = useRef<number | null>(null);
  const textAutoExpandRafRef = useRef<number | null>(null);
  const focusedTextIdRef = useRef<string | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const textSizeCommitKeepSelectionRef = useRef(false);
  const textNodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const textAnnotationRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const customFontBytesRef = useRef<Map<string, Uint8Array>>(new Map());
  const pdfFontCacheRef = useRef<Map<string, PDFFont>>(new Map());
  const fontkitModuleRef = useRef<null | { default?: unknown }>(null);
  const hasHydratedCloudAnnotationsRef = useRef(false);
  const activeTextSize = useMemo(() => {
    if (!focusedTextId) return textSize;
    if (selectionFontSizePt) return selectionFontSizePt;
    for (const list of Object.values(textAnnotations)) {
      const match = list.find((item) => item.id === focusedTextId);
      if (match) return match.textSizePt ?? textSize;
    }
    return textSize;
  }, [focusedTextId, selectionFontSizePt, textAnnotations, textSize]);
  const activeLineSpacing = useMemo(() => {
    if (!focusedTextId) return DEFAULT_TEXT_LINE_SPACING;
    for (const list of Object.values(textAnnotations)) {
      const match = list.find((item) => item.id === focusedTextId);
      if (match && typeof match.lineSpacing === "number") return match.lineSpacing;
    }
    return DEFAULT_TEXT_LINE_SPACING;
  }, [focusedTextId, textAnnotations]);
  const activeTextColor = selectionTextColorMixed ? null : selectionTextColor ?? textColor;
  const focusedShape = useMemo(() => {
    if (!focusedShapeId || !focusedShapePageId) return null;
    const list = shapesByPage[focusedShapePageId] ?? [];
    return list.find((shape) => shape.id === focusedShapeId) ?? null;
  }, [focusedShapeId, focusedShapePageId, shapesByPage]);
  const activeShapeBorderColor = focusedShape?.color ?? shapeColor;
  const activeShapeFillColor = focusedShape?.fillColor ?? shapeFillColor;
  const activeShapeLineStyle = focusedShape?.lineStyle ?? shapeLineStyle;
  const shapeLineStyleEligible = (focusedShape?.type ?? shapeType) !== "check" && (focusedShape?.type ?? shapeType) !== "arrow";
  const resolvedShapeLineStyle = shapeLineStyleEligible ? activeShapeLineStyle : "solid";
  const resolvedShapeBorderColor = activeShapeBorderColor ?? textColor;
  const resolvedShapeFillColor = activeShapeFillColor ?? activeShapeBorderColor ?? textColor;
  const isTextColorPicker = colorPickerOpen === "text";
  const isShapeBorderPicker = colorPickerOpen === "shape-border";
  const isShapeFillPicker = colorPickerOpen === "shape-fill";
  const isPenColorPicker = colorPickerOpen === "pen";
  const highlightCustomRgb = useMemo(() => {
    const rgb = hexToRgb(colorPickerDraft);
    if (!rgb) return { r: 0, g: 0, b: 0 };
    return {
      r: Math.round(rgb.r * 255),
      g: Math.round(rgb.g * 255),
      b: Math.round(rgb.b * 255),
    };
  }, [colorPickerDraft]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(customTextColorStorageKey);
    if (!stored) {
      setCustomTextColors([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setCustomTextColors(parsed.filter((value) => typeof value === "string"));
      } else {
        setCustomTextColors([]);
      }
    } catch {
      setCustomTextColors([]);
    }
  }, [customTextColorStorageKey]);
  const addCustomTextColor = useCallback(
    (color: string) => {
      const normalized = normalizeCssColor(color) ?? color;
      if (!normalized || !normalized.startsWith("#")) return;
      const cleaned = normalized.slice(0, 7).toLowerCase();
      setCustomTextColors((prev) => {
        const without = prev.filter((value) => value.toLowerCase() !== cleaned);
        const next = [...without, cleaned];
        const trimmed = next.length > 8 ? next.slice(next.length - 8) : next;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(customTextColorStorageKey, JSON.stringify(trimmed));
        }
        return trimmed;
      });
    },
    [customTextColorStorageKey]
  );

  function resolveFontVariant(bold: boolean, italic: boolean): TextFontVariant {
    if (bold && italic) return "boldItalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  }

  const normalizeStrikeMarkup = useCallback((element: HTMLElement) => {
    const removeTags = element.querySelectorAll<HTMLElement>("s, strike, del, [data-strike='true']");
    removeTags.forEach((node) => {
      while (node.firstChild) {
        node.parentNode?.insertBefore(node.firstChild, node);
      }
      node.remove();
    });
    const decorated = element.querySelectorAll<HTMLElement>('[style*="line-through"]');
    decorated.forEach((node) => {
      node.style.textDecoration = node.style.textDecoration.replace(/line-through/gi, "").trim();
      node.style.textDecorationLine = node.style.textDecorationLine.replace(/line-through/gi, "").trim();
      if (!node.style.textDecoration && !node.style.textDecorationLine) {
        node.style.removeProperty("text-decoration");
        node.style.removeProperty("text-decoration-line");
      }
    });
  }, []);

  const normalizeLineHeightMarkup = useCallback((element: HTMLElement) => {
    const targets = element.querySelectorAll<HTMLElement>('[style*="line-height"]');
    targets.forEach((node) => {
      node.style.lineHeight = "";
      const styleAttr = node.getAttribute("style");
      if (styleAttr && !styleAttr.trim()) {
        node.removeAttribute("style");
      }
    });
    element.style.lineHeight = "";
  }, []);

  const getLineSpacingForTextId = useCallback(
    (id: string) => {
      for (const list of Object.values(textAnnotations)) {
        const match = list.find((item) => item.id === id);
        if (match) return match.lineSpacing ?? DEFAULT_TEXT_LINE_SPACING;
      }
      return DEFAULT_TEXT_LINE_SPACING;
    },
    [textAnnotations]
  );

  const updateStrikeOverlayForText = useCallback(
    (id: string) => {
      // Native strikethrough only; no custom overlay.
    },
    [normalizeStrikeMarkup]
  );

  function focusTextAnnotation(id: string) {
    setFocusedShapeId(null);
    setFocusedShapePageId(null);
    setFocusedTextId(id);
    setActiveTextContainerId(id);
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
    setActiveTextContainerId(null);
    setSelectionTextColor(null);
    setSelectionTextColorMixed(false);
  }, []);
  const clearShapeFocus = useCallback(() => {
    setFocusedShapeId(null);
    setFocusedShapePageId(null);
  }, []);

  const noteTextTyping = useCallback((id: string) => {
    setTypingTextId(id);
    if (typingTextTimeoutRef.current) {
      window.clearTimeout(typingTextTimeoutRef.current);
    }
    typingTextTimeoutRef.current = window.setTimeout(() => {
      setTypingTextId((current) => (current === id ? null : current));
    }, 600);
  }, []);

  const findTextAnnotationById = useCallback(
    (id: string) => {
      for (const [pageId, list] of Object.entries(textAnnotations)) {
        const match = list.find((item) => item.id === id);
        if (match) return { pageId, annotation: match };
      }
      return null;
    },
    [textAnnotations]
  );

  const syncTextAnnotationContent = useCallback(
    (pageId: string, id: string, element: HTMLElement) => {
      const html = element.innerHTML.replace(/[\u200b\u2060]/g, "");
      const text = element.innerText.replace(/[\u200b\u2060]/g, "");
      updateTextAnnotation(pageId, id, (item) => ({
        ...item,
                    text: text || "",
                    richTextHtml: html,
                  }));
    },
    [updateTextAnnotation]
  );

  const handleCopyOrCut = useCallback(
    (event: ReactClipboardEvent<HTMLDivElement>, isCut: boolean) => {
      if (!focusedTextId) return;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.collapsed || !element.contains(range.commonAncestorContainer)) return;

      const fragment = range.cloneContents();
      const container = document.createElement("div");
      container.appendChild(fragment);

      const textWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let current = textWalker.nextNode();
      while (current) {
        current.textContent = (current.textContent ?? "").replace(/[\u200b\u2060]/g, "");
        current = textWalker.nextNode();
      }

      event.preventDefault();
      event.clipboardData?.setData("text/html", container.innerHTML);
      event.clipboardData?.setData("text/plain", container.innerText);

      if (!isCut) return;
      range.deleteContents();
      selection.removeAllRanges();
      selection.addRange(range);
      selectionRangeRef.current = range.cloneRange();
      normalizeStrikeMarkup(element);
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
    },
    [
      focusedTextId,
      autoExpandTextAnnotation,
      findTextAnnotationById,
      normalizeStrikeMarkup,
      syncTextAnnotationContent,
    ]
  );
  const resolveNodeFontSizePt = useCallback(
    (node: Node, fallbackSize: number) => {
      if (!focusedTextId) return fallbackSize;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return fallbackSize;
      let current: HTMLElement | null =
        node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      while (current && current !== element) {
        if (current.dataset.fontSizePt) {
          const parsed = Number(current.dataset.fontSizePt);
          if (!Number.isNaN(parsed)) return parsed;
        }
        if (current.style.fontSize) {
          const parsed = parseFontSize(current.style.fontSize, Number.NaN);
          if (!Number.isNaN(parsed)) return parsed;
        }
        current = current.parentElement;
      }
      return fallbackSize;
    },
    [focusedTextId]
  );
  const fontSizeToDisplayPx = useCallback((sizePt: number) => sizePt * PT_TO_PX, []);

  const applyFontSizeToSelection = useCallback(
    (sizePt: number) => {
      if (!focusedTextId) return false;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return false;
      const selection = window.getSelection();
      if (!selection) return false;
      let range: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const activeRange = selection.getRangeAt(0);
        if (element.contains(activeRange.commonAncestorContainer)) {
          range = activeRange;
        }
      }
      if (!range && selectionRangeRef.current && element.contains(selectionRangeRef.current.commonAncestorContainer)) {
        range = selectionRangeRef.current;
      }
      if (!range) {
        const fallback = document.createRange();
        fallback.selectNodeContents(element);
        fallback.collapse(false);
        range = fallback;
      }
      selection.removeAllRanges();
      selection.addRange(range);

      if (range.collapsed) {
        const span = document.createElement("span");
        span.style.fontSize = `${fontSizeToDisplayPx(sizePt)}px`;
        span.dataset.fontSizePt = String(sizePt);
        span.appendChild(document.createTextNode("\u200b"));
        range.insertNode(span);
        range.setStart(span.firstChild ?? span, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const span = document.createElement("span");
        span.style.fontSize = `${fontSizeToDisplayPx(sizePt)}px`;
        span.dataset.fontSizePt = String(sizePt);
        try {
          range.surroundContents(span);
        } catch {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      }

      selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
      return true;
    },
    [focusedTextId, findTextAnnotationById, syncTextAnnotationContent, autoExpandTextAnnotation, fontSizeToDisplayPx]
  );

  const applyTextColorToSelection = useCallback(
    (color: string) => {
      if (!focusedTextId) return false;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return false;
      const selection = window.getSelection();
      if (!selection) return false;
      let range: Range | null = null;
      if (selection.rangeCount > 0) {
        const activeRange = selection.getRangeAt(0);
        if (element.contains(activeRange.commonAncestorContainer)) {
          range = activeRange;
        }
      }
      if (!range && selectionRangeRef.current && element.contains(selectionRangeRef.current.commonAncestorContainer)) {
        range = selectionRangeRef.current;
      }
      if (!range) {
        const fallback = document.createRange();
        fallback.selectNodeContents(element);
        fallback.collapse(false);
        range = fallback;
      }
      element.focus();
      selection.removeAllRanges();
      selection.addRange(range);
      if (range.collapsed) {
        const span = document.createElement("span");
        span.style.color = color;
        span.style.display = "inline";
        span.style.whiteSpace = "inherit";
        span.style.wordBreak = "inherit";
        span.style.overflowWrap = "inherit";
        span.dataset.textColor = color;
        span.appendChild(document.createTextNode("\u2060"));
        range.insertNode(span);
        const nextRange = document.createRange();
        nextRange.setStart(span.firstChild ?? span, 1);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      } else {
        const span = document.createElement("span");
        span.style.color = color;
        span.style.display = "inline";
        span.style.whiteSpace = "inherit";
        span.style.wordBreak = "inherit";
        span.style.overflowWrap = "inherit";
        span.dataset.textColor = color;
        try {
          range.surroundContents(span);
        } catch {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
        const nextRange = document.createRange();
        nextRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(nextRange);
      }
      if (selection.rangeCount > 0) {
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
      setSelectionTextColor(color);
      setSelectionTextColorMixed(false);
      return true;
    },
    [focusedTextId, findTextAnnotationById, syncTextAnnotationContent, autoExpandTextAnnotation]
  );

  const refreshInlineStyleState = useCallback((element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !element.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      return;
    }
    const range = selection.getRangeAt(0);
    const startNode =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as HTMLElement)
        : range.startContainer.parentElement;
    let node = startNode;
    let bold = false;
    let italic = false;
    let underline = false;
    let bullet = false;
    let number = false;
    while (node && node !== element) {
      const style = window.getComputedStyle(node);
      const weight = style.fontWeight;
      if (weight === "bold" || Number(weight) >= 600) bold = true;
      if (style.fontStyle === "italic") italic = true;
      const deco = (style.textDecorationLine || style.textDecoration || "").toLowerCase();
      if (deco.includes("underline")) underline = true;
      if (node.tagName === "UL") bullet = true;
      if (node.tagName === "OL") number = true;
      node = node.parentElement;
    }
    setTextBold(bold);
    setTextItalic(italic);
    setTextUnderline(underline);
    setListType(bullet ? "bullet" : number ? "number" : null);
  }, []);
  const applyFontSizeDeltaToSelection = useCallback(
    (delta: number) => {
      if (!focusedTextId) return false;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return false;
      const selection = window.getSelection();
      let range: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const activeRange = selection.getRangeAt(0);
        if (element.contains(activeRange.commonAncestorContainer)) {
          range = activeRange;
        }
      }
      if (!range && selectionRangeRef.current && element.contains(selectionRangeRef.current.commonAncestorContainer)) {
        range = selectionRangeRef.current;
      }
      if (!range || range.collapsed) return false;
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const startMarker = document.createElement("span");
      startMarker.dataset.selectionMarker = "start";
      startMarker.appendChild(document.createTextNode("\u200b"));
      const endMarker = document.createElement("span");
      endMarker.dataset.selectionMarker = "end";
      endMarker.appendChild(document.createTextNode("\u200b"));

      const endRange = range.cloneRange();
      endRange.collapse(false);
      endRange.insertNode(endMarker);
      const startRange = range.cloneRange();
      startRange.collapse(true);
      startRange.insertNode(startMarker);

      const markerRange = document.createRange();
      markerRange.setStartAfter(startMarker);
      markerRange.setEndBefore(endMarker);

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let current = walker.nextNode();
      while (current) {
        const parentEl = (current as Text).parentElement;
        if (parentEl && parentEl.dataset.selectionMarker) {
          current = walker.nextNode();
          continue;
        }
        if (markerRange.intersectsNode(current)) {
          textNodes.push(current as Text);
        }
        current = walker.nextNode();
      }

      textNodes.forEach((textNode) => {
        const textLength = textNode.textContent?.length ?? 0;
        if (textLength === 0) return;
        const subRange = document.createRange();
        let startOffset = 0;
        let endOffset = textLength;
        if (markerRange.startContainer === textNode) {
          startOffset = markerRange.startOffset;
        }
        if (markerRange.endContainer === textNode) {
          endOffset = markerRange.endOffset;
        }
        if (startOffset === endOffset) return;
        subRange.setStart(textNode, startOffset);
        subRange.setEnd(textNode, endOffset);
        const currentSize = resolveNodeFontSizePt(textNode, activeTextSize);
        const nextSize = normalizeTextSize(currentSize + delta);
        const span = document.createElement("span");
        span.style.fontSize = `${fontSizeToDisplayPx(nextSize)}px`;
        span.dataset.fontSizePt = String(nextSize);
        try {
          subRange.surroundContents(span);
        } catch {
          const contents = subRange.extractContents();
          span.appendChild(contents);
          subRange.insertNode(span);
        }
      });

      if (selection) {
        selection.removeAllRanges();
        selection.addRange(markerRange);
      }
      selectionRangeRef.current = markerRange.cloneRange();
      startMarker.remove();
      endMarker.remove();
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
      return true;
    },
    [
      activeTextSize,
      autoExpandTextAnnotation,
      findTextAnnotationById,
      focusedTextId,
      resolveNodeFontSizePt,
      fontSizeToDisplayPx,
      syncTextAnnotationContent,
    ]
  );
  const applyInlineCommand = useCallback(
    (command: "bold" | "italic" | "underline") => {
      if (!focusedTextId) {
        setDefaultTextStyles((prev) => {
          if (command === "bold") return { ...prev, bold: !prev.bold };
          if (command === "italic") return { ...prev, italic: !prev.italic };
          if (command === "underline") return { ...prev, underline: !prev.underline };
          return prev;
        });
        return;
      }
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return;
      element.focus();
      const selection = window.getSelection();
      let range: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const activeRange = selection.getRangeAt(0);
        if (element.contains(activeRange.commonAncestorContainer)) {
          range = activeRange;
        }
      }
      if (!range && selectionRangeRef.current && element.contains(selectionRangeRef.current.commonAncestorContainer)) {
        range = selectionRangeRef.current;
      }
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command);
      if (selection && selection.rangeCount > 0) {
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
      refreshInlineStyleState(element);
    },
    [
      autoExpandTextAnnotation,
      findTextAnnotationById,
      focusedTextId,
      syncTextAnnotationContent,
      refreshInlineStyleState,
    ]
  );

  const applyListCommand = useCallback(
    (type: "bullet" | "number") => {
      if (!focusedTextId) return;
      const element = textNodeRefs.current.get(focusedTextId);
      if (!element) return;
      element.focus();
      const selection = window.getSelection();
      let range: Range | null = null;
      if (selection && selection.rangeCount > 0) {
        const activeRange = selection.getRangeAt(0);
        if (element.contains(activeRange.commonAncestorContainer)) {
          range = activeRange;
        }
      }
      if (!range && selectionRangeRef.current && element.contains(selectionRangeRef.current.commonAncestorContainer)) {
        range = selectionRangeRef.current;
      }
      const wasCollapsed = !!range?.collapsed;
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const cmd = type === "bullet" ? "insertUnorderedList" : "insertOrderedList";
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(cmd);
      if (selection && wasCollapsed) {
        const anchorNode =
          selection.rangeCount > 0
            ? selection.getRangeAt(0).startContainer
            : range?.startContainer ?? null;
        const anchorElement =
          anchorNode && anchorNode.nodeType === Node.ELEMENT_NODE
            ? (anchorNode as HTMLElement)
            : anchorNode?.parentElement ?? null;
        const li = anchorElement?.closest("li");
        if (li) {
          const endRange = document.createRange();
          endRange.selectNodeContents(li);
          endRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(endRange);
        }
      }
      if (selection && selection.rangeCount > 0) {
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      const result = findTextAnnotationById(focusedTextId);
      if (result) {
        syncTextAnnotationContent(result.pageId, focusedTextId, element);
        autoExpandTextAnnotation(result.pageId, focusedTextId);
      }
      refreshInlineStyleState(element);
    },
    [autoExpandTextAnnotation, findTextAnnotationById, focusedTextId, refreshInlineStyleState, syncTextAnnotationContent]
  );

  const applyLineSpacing = useCallback(
    (spacing: number) => {
      if (!focusedTextId) return;
      const result = findTextAnnotationById(focusedTextId);
      if (!result) return;
      updateTextAnnotation(result.pageId, focusedTextId, (item) => ({
        ...item,
        lineSpacing: spacing,
      }));
      autoExpandTextAnnotation(result.pageId, focusedTextId);
      setLineSpacingMenuOpen(false);
    },
    [autoExpandTextAnnotation, findTextAnnotationById, focusedTextId, updateTextAnnotation]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleSelectionChange = () => {
      if (!focusedTextId) return;
      const element = textNodeRefs.current.get(focusedTextId);
      const selection = window.getSelection();
      if (!element || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return;
      selectionRangeRef.current = range.cloneRange();
      const startNode =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as HTMLElement)
          : range.startContainer.parentElement;
      let node = startNode;
      let colorNode: HTMLElement | null = null;
      let resolvedSize: number | null = null;
      while (node && node !== element) {
        if (!colorNode && (node.dataset.textColor || node.style.color)) {
          colorNode = node;
        }
        if (node.dataset.fontSizePt) {
          const parsed = Number(node.dataset.fontSizePt);
          if (!Number.isNaN(parsed)) {
            resolvedSize = parsed;
            break;
          }
        }
        node = node.parentElement;
      }
      if (resolvedSize === null) {
        for (const list of Object.values(textAnnotations)) {
          const match = list.find((item) => item.id === focusedTextId);
          if (match) {
            resolvedSize = match.textSizePt ?? textSize;
            break;
          }
        }
      }
      if (resolvedSize !== null) {
        setSelectionFontSizePt(normalizeTextSize(resolvedSize));
      }
      if (!range.collapsed) {
        const colors = new Set<string>();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();
        while (current) {
          if (!range.intersectsNode(current)) {
            current = walker.nextNode();
            continue;
          }
          const text = current.textContent ?? "";
          if (!text.trim()) {
            current = walker.nextNode();
            continue;
          }
          let parent = (current as Text).parentElement;
          while (parent && parent !== element) {
            if (parent.dataset.textColor || parent.style.color) break;
            parent = parent.parentElement;
          }
          const colorTarget = parent ?? element;
          const computed = window.getComputedStyle(colorTarget);
          const color = normalizeCssColor(computed.color || "");
          if (color) {
            colors.add(color);
          }
          if (colors.size > 1) break;
          current = walker.nextNode();
        }
        if (colors.size === 1) {
          setSelectionTextColor(Array.from(colors)[0]);
          setSelectionTextColorMixed(false);
        } else {
          setSelectionTextColor(null);
          setSelectionTextColorMixed(true);
        }
      } else {
      const colorTarget = colorNode ?? element;
      const computed = window.getComputedStyle(colorTarget);
      const color = normalizeCssColor(computed.color || "");
      setSelectionTextColor(color);
      setSelectionTextColorMixed(false);
      }
      setTextBold(document.queryCommandState("bold"));
      setTextItalic(document.queryCommandState("italic"));
      setTextUnderline(document.queryCommandState("underline"));
      if (startNode) {
        const listAncestor = startNode.closest("ul, ol");
        if (listAncestor?.tagName === "UL") {
          setListType("bullet");
        } else if (listAncestor?.tagName === "OL") {
          setListType("number");
        } else {
          setListType(null);
        }
      } else {
        setListType(null);
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [focusedTextId, textAnnotations, textSize]);
  const applyDefaultTextStylesToCaret = useCallback(
    (element: HTMLElement) => {
      const selection = window.getSelection();
      if (!selection) return;
      if (selection.rangeCount === 0 || !element.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const ensureCommandState = (command: "bold" | "italic" | "underline", enabled: boolean) => {
        const current = document.queryCommandState(command);
        if (current !== enabled) {
          document.execCommand("styleWithCSS", false, "true");
          document.execCommand(command);
        }
      };
      ensureCommandState("bold", defaultTextStyles.bold);
      ensureCommandState("italic", defaultTextStyles.italic);
      ensureCommandState("underline", defaultTextStyles.underline);
      let caretColor = textColor;
      if (selection.rangeCount > 0 && element.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        const range = selection.getRangeAt(0);
        const startNode =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;
        let colorNode = startNode;
        while (colorNode && colorNode !== element) {
          if (colorNode.dataset.textColor || colorNode.style.color) break;
          colorNode = colorNode.parentElement;
        }
        const colorTarget = colorNode ?? element;
        const computed = window.getComputedStyle(colorTarget);
        caretColor = normalizeCssColor(computed.color || "") || textColor;
      }
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, caretColor);
      setTextBold(defaultTextStyles.bold);
      setTextItalic(defaultTextStyles.italic);
      setTextUnderline(defaultTextStyles.underline);
      setSelectionTextColor(caretColor);
      setSelectionTextColorMixed(false);
    },
    [defaultTextStyles, textColor]
  );
  const restoreTextSelection = useCallback(() => {
    if (!focusedTextId) return;
    const element = textNodeRefs.current.get(focusedTextId);
    const range = selectionRangeRef.current;
    if (!element || !range || !element.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    if (!selection) return;
    element.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  }, [focusedTextId]);
  const restoreTextSelectionSoon = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => restoreTextSelection()));
  }, [restoreTextSelection]);
  const keepTextEditingActive = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!focusedTextId) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      event.preventDefault();
      event.stopPropagation();
      restoreTextSelectionSoon();
    },
    [focusedTextId, restoreTextSelectionSoon]
  );

  useEffect(() => {
    return () => {
      if (typingTextTimeoutRef.current) {
        window.clearTimeout(typingTextTimeoutRef.current);
      }
      if (textAutoExpandRafRef.current !== null) {
        window.cancelAnimationFrame(textAutoExpandRafRef.current);
      }
    };
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
      const startWidth = annotation.width ?? 0.14;
      const startHeight = annotation.height ?? 0.06;
      const displayRotation = normalizeRotation(annotation.rotation ?? 0);
      const node = textAnnotationRefs.current.get(annotationId);
      if (node) {
        node.style.willChange = "left, top, transform";
        node.style.transition = "none";
      }

      const pointerId = startEvent.pointerId;

      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        textDragLatestPointRef.current = point;
        if (textDragRafRef.current !== null) return;
        textDragRafRef.current = window.requestAnimationFrame(() => {
          textDragRafRef.current = null;
          const latestPoint = textDragLatestPointRef.current;
          if (!latestPoint) return;
          const nextX = clamp(latestPoint.x - offsetX, 0, 1 - startWidth);
          const nextY = clamp(latestPoint.y - offsetY, 0, 1 - startHeight);
          textDragLatestPosRef.current = { x: nextX, y: nextY };
          if (node) {
            node.style.left = `${nextX * 100}%`;
            node.style.top = `${nextY * 100}%`;
            node.style.transform = `rotate(${displayRotation}deg)`;
          }
        });
      };

      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        textDragCleanupRef.current = null;
        if (textDragRafRef.current !== null) {
          window.cancelAnimationFrame(textDragRafRef.current);
          textDragRafRef.current = null;
        }
        textDragLatestPointRef.current = null;
        textDragLatestPosRef.current = null;
      }

      function handleUp() {
        const latest = textDragLatestPosRef.current;
        if (latest) {
          setTextAnnotations((prev) => {
            const existing = prev[pageId] ?? [];
            const updated = existing.map((item) =>
              item.id === annotationId ? { ...item, x: latest.x, y: latest.y } : item
            );
            return { ...prev, [pageId]: updated };
          });
          if (node) {
            node.style.left = `${latest.x * 100}%`;
            node.style.top = `${latest.y * 100}%`;
            node.style.transform = `rotate(${displayRotation}deg)`;
            node.style.transition = "none";
            node.style.willChange = "";
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                if (!node) return;
                node.style.transition = "";
              });
            });
          }
        }
        setDraggingText(null);
        cleanup();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);

      textDragCleanupRef.current = cleanup;
      textDragLatestPosRef.current = { x: annotation.x, y: annotation.y };
      setDraggingText({ pageId, id: annotationId, offsetX, offsetY });
    },
    [getPageNormalizedPoint, textAnnotations]
  );

  const startShapeDrag = useCallback(
    (pageId: string, shapeId: string, startEvent: ReactPointerEvent<HTMLButtonElement>) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();

      const shape = shapesByPage[pageId]?.find((item) => item.id === shapeId);
      if (!shape) return;
      const pageNode = previewNodeMap.current.get(pageId);
      const rect = pageNode?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return;
      const getPoint = (clientX: number, clientY: number) => ({
        x: clamp((clientX - rect.left) / rect.width, 0, 1),
        y: clamp((clientY - rect.top) / rect.height, 0, 1),
      });
      const startPoint = getPoint(startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;

      shapeDragCleanupRef.current?.();
      const { minX, minY, w, h } = shapeBounds(shape);
      const offsetX = startPoint.x - minX;
      const offsetY = startPoint.y - minY;
      const startShape = {
        start: { ...shape.start },
        end: { ...shape.end },
      };
      const renderNode = shapeRenderNodeMap.current.get(shapeId);
      const hitNode = shapeHitNodeMap.current.get(shapeId);
      const pointerId = startEvent.pointerId;

      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPoint(event.clientX, event.clientY);
        if (!point) return;
        const nextMinX = clamp(point.x - offsetX, 0, 1 - w);
        const nextMinY = clamp(point.y - offsetY, 0, 1 - h);
        const deltaX = nextMinX - minX;
        const deltaY = nextMinY - minY;
        const nextShape = {
          start: { x: startShape.start.x + deltaX, y: startShape.start.y + deltaY },
          end: { x: startShape.end.x + deltaX, y: startShape.end.y + deltaY },
        };
        shapeDragLatestShapeRef.current = nextShape;
        const translateX = deltaX * 1000;
        const translateY = deltaY * 1000;
        if (renderNode) {
          renderNode.setAttribute("transform", `translate(${translateX} ${translateY})`);
        }
        if (hitNode) {
          hitNode.setAttribute("transform", `translate(${translateX} ${translateY})`);
        }
        const indicatorNode = shapeIndicatorNodeMap.current.get(shapeId);
        if (indicatorNode) {
          indicatorNode.style.left = `${(nextMinX + w / 2) * 100}%`;
          indicatorNode.style.top = `${nextMinY * 100}%`;
          indicatorNode.style.transform = "translate(-50%, -2.5rem)";
        }
      };

      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        shapeDragCleanupRef.current = null;
        if (shapeDragRafRef.current !== null) {
          window.cancelAnimationFrame(shapeDragRafRef.current);
          shapeDragRafRef.current = null;
        }
        shapeDragLatestPointRef.current = null;
        shapeDragLatestShapeRef.current = null;
        if (renderNode) {
          renderNode.removeAttribute("transform");
        }
        if (hitNode) {
          hitNode.removeAttribute("transform");
        }
      }

      function handleUp() {
        const latestShape = shapeDragLatestShapeRef.current;
        if (latestShape) {
          setShapesByPage((prev) => {
            const list = prev[pageId] ?? [];
            const updated = list.map((item) =>
              item.id === shapeId ? { ...item, start: latestShape.start, end: latestShape.end } : item
            );
            return { ...prev, [pageId]: updated };
          });
        }
        if (renderNode) {
          renderNode.removeAttribute("transform");
        }
        if (hitNode) {
          hitNode.removeAttribute("transform");
        }
        setDraggingShape(null);
        cleanup();
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);

      shapeDragCleanupRef.current = cleanup;
      setDraggingShape({ pageId, id: shapeId, offsetX, offsetY });
    },
    [shapesByPage]
  );

  const startShapeResize = useCallback(
    (
      pageId: string,
      shapeId: string,
      handle:
        | "nw"
        | "ne"
        | "sw"
        | "se"
        | "n"
        | "s"
        | "e"
        | "w"
        | "start"
        | "end"
        | "tri-top"
        | "tri-left"
        | "tri-right",
      startEvent: ReactPointerEvent<HTMLDivElement>
    ) => {
      if (startEvent.button !== 0 && startEvent.pointerType !== "touch") return;
      startEvent.preventDefault();
      startEvent.stopPropagation();
      const shape = shapesByPage[pageId]?.find((item) => item.id === shapeId);
      if (!shape) return;
      const pageNode = previewNodeMap.current.get(pageId);
      const rect = pageNode?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return;
      const getPoint = (clientX: number, clientY: number) => ({
        x: clamp((clientX - rect.left) / rect.width, 0, 1),
        y: clamp((clientY - rect.top) / rect.height, 0, 1),
      });
      const startPoint = getPoint(startEvent.clientX, startEvent.clientY);
      if (!startPoint) return;
      const pointerId = startEvent.pointerId;
      const startShape = { start: { ...shape.start }, end: { ...shape.end } };
      const bounds = shapeBounds(startShape);
      const minSize = 0.01;
      const renderNode = shapeRenderNodeMap.current.get(shapeId);
      const hitNode = shapeHitNodeMap.current.get(shapeId);

      shapeResizeCleanupRef.current?.();
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPoint(event.clientX, event.clientY);
        if (!point) return;

        let nextStart = { ...startShape.start };
        let nextEnd = { ...startShape.end };

        const deltaX = point.x - startPoint.x;
        const deltaY = point.y - startPoint.y;

        if (handle === "start") {
          nextStart = {
            x: clamp(startShape.start.x + deltaX, 0, 1),
            y: clamp(startShape.start.y + deltaY, 0, 1),
          };
        } else if (handle === "end") {
          nextEnd = {
            x: clamp(startShape.end.x + deltaX, 0, 1),
            y: clamp(startShape.end.y + deltaY, 0, 1),
          };
        } else {
          let nextMinX = bounds.minX;
          let nextMaxX = bounds.maxX;
          let nextMinY = bounds.minY;
          let nextMaxY = bounds.maxY;

          if (handle === "nw") {
            nextMinX = clamp(bounds.minX + deltaX, 0, bounds.maxX - minSize);
            nextMinY = clamp(bounds.minY + deltaY, 0, bounds.maxY - minSize);
          } else if (handle === "ne") {
            nextMaxX = clamp(bounds.maxX + deltaX, bounds.minX + minSize, 1);
            nextMinY = clamp(bounds.minY + deltaY, 0, bounds.maxY - minSize);
          } else if (handle === "sw") {
            nextMinX = clamp(bounds.minX + deltaX, 0, bounds.maxX - minSize);
            nextMaxY = clamp(bounds.maxY + deltaY, bounds.minY + minSize, 1);
          } else if (handle === "se") {
            nextMaxX = clamp(bounds.maxX + deltaX, bounds.minX + minSize, 1);
            nextMaxY = clamp(bounds.maxY + deltaY, bounds.minY + minSize, 1);
          } else if (handle === "n" || handle === "tri-top") {
            nextMinY = clamp(bounds.minY + deltaY, 0, bounds.maxY - minSize);
          } else if (handle === "s") {
            nextMaxY = clamp(bounds.maxY + deltaY, bounds.minY + minSize, 1);
          } else if (handle === "w" || handle === "tri-left") {
            nextMinX = clamp(bounds.minX + deltaX, 0, bounds.maxX - minSize);
          } else if (handle === "e" || handle === "tri-right") {
            nextMaxX = clamp(bounds.maxX + deltaX, bounds.minX + minSize, 1);
          }

          nextStart = { x: nextMinX, y: nextMinY };
          nextEnd = { x: nextMaxX, y: nextMaxY };
        }

        shapeResizeLatestRef.current = { start: nextStart, end: nextEnd };
        const nextBounds = shapeBounds({ start: nextStart, end: nextEnd });
        let transform = "";
        if (shape.type === "line" || shape.type === "arrow") {
          const startVec = {
            x: startShape.end.x - startShape.start.x,
            y: startShape.end.y - startShape.start.y,
          };
          const nextVec = { x: nextEnd.x - nextStart.x, y: nextEnd.y - nextStart.y };
          const startLen = Math.hypot(startVec.x, startVec.y) || 1e-6;
          const nextLen = Math.hypot(nextVec.x, nextVec.y);
          const scale = nextLen / startLen;
          const angle = Math.atan2(nextVec.y, nextVec.x) - Math.atan2(startVec.y, startVec.x);
          const deg = (angle * 180) / Math.PI;
          const sx = startShape.start.x * 1000;
          const sy = startShape.start.y * 1000;
          const tx = nextStart.x * 1000;
          const ty = nextStart.y * 1000;
          transform = `translate(${tx} ${ty}) rotate(${deg}) scale(${scale}) translate(${-sx} ${-sy})`;
        } else {
          const startW = Math.max(1e-6, bounds.w);
          const startH = Math.max(1e-6, bounds.h);
          const scaleX = nextBounds.w / startW;
          const scaleY = nextBounds.h / startH;
          const sx = bounds.minX * 1000;
          const sy = bounds.minY * 1000;
          const tx = nextBounds.minX * 1000;
          const ty = nextBounds.minY * 1000;
          transform = `translate(${tx} ${ty}) scale(${scaleX} ${scaleY}) translate(${-sx} ${-sy})`;
        }
        if (renderNode) {
          renderNode.setAttribute("transform", transform);
        }
        if (hitNode) {
          hitNode.setAttribute("transform", transform);
        }
        const boxWidth = clamp(nextBounds.w, 0, 1);
        const boxHeight = clamp(nextBounds.h, 0, 1);
        const boxLeft = clamp(nextBounds.minX, 0, 1 - boxWidth);
        const boxTop = clamp(nextBounds.minY, 0, 1 - boxHeight);
        const startRelX = clamp((nextStart.x - boxLeft) / boxWidth, 0, 1);
        const startRelY = clamp((nextStart.y - boxTop) / boxHeight, 0, 1);
        const endRelX = clamp((nextEnd.x - boxLeft) / boxWidth, 0, 1);
        const endRelY = clamp((nextEnd.y - boxTop) / boxHeight, 0, 1);
        const handles: Array<{ key: string; x: number; y: number }> =
          shape.type === "line" || shape.type === "arrow"
            ? [
                { key: "start", x: startRelX, y: startRelY },
                { key: "end", x: endRelX, y: endRelY },
              ]
            : shape.type === "ellipse"
              ? [
                  { key: "n", x: 0.5, y: 0 },
                  { key: "s", x: 0.5, y: 1 },
                  { key: "w", x: 0, y: 0.5 },
                  { key: "e", x: 1, y: 0.5 },
                ]
              : shape.type === "triangle"
                ? [
                    { key: "top", x: 0.5, y: 0 },
                    { key: "left", x: 0, y: 1 },
                    { key: "right", x: 1, y: 1 },
                  ]
                : shape.type === "check"
                  ? [
                      { key: "p1", x: 0.0, y: 0.62 },
                      { key: "p2", x: 0.32, y: 0.9 },
                      { key: "p3", x: 1.0, y: 0.12 },
                    ]
                  : [
                      { key: "nw", x: 0, y: 0 },
                      { key: "ne", x: 1, y: 0 },
                      { key: "sw", x: 0, y: 1 },
                      { key: "se", x: 1, y: 1 },
                    ];
        handles.forEach((handleDef) => {
          const node = shapeHandleNodeMap.current.get(`${shapeId}:${handleDef.key}`);
          if (!node) return;
          node.style.left = `${(boxLeft + boxWidth * handleDef.x) * 100}%`;
          node.style.top = `${(boxTop + boxHeight * handleDef.y) * 100}%`;
        });
      };

      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const latest = shapeResizeLatestRef.current;
        if (latest) {
          setShapesByPage((prev) => {
            const list = prev[pageId] ?? [];
            const updated = list.map((item) =>
              item.id === shapeId ? { ...item, start: latest.start, end: latest.end } : item
            );
            return { ...prev, [pageId]: updated };
          });
        }
        setFocusedShapeId(shapeId);
        setFocusedShapePageId(pageId);
        if (renderNode) {
          renderNode.removeAttribute("transform");
        }
        if (hitNode) {
          hitNode.removeAttribute("transform");
        }
        cleanup();
      };

      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        shapeResizeCleanupRef.current = null;
        if (shapeResizeRafRef.current !== null) {
          window.cancelAnimationFrame(shapeResizeRafRef.current);
          shapeResizeRafRef.current = null;
        }
        shapeResizeLatestRef.current = null;
        if (renderNode) {
          renderNode.removeAttribute("transform");
        }
        if (hitNode) {
          hitNode.removeAttribute("transform");
        }
        setResizingShape(null);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
      shapeResizeCleanupRef.current = cleanup;
      setResizingShape({ pageId, id: shapeId, handle, pointerId });
    },
    [shapesByPage]
  );

  const startTextResize = useCallback(
    (
      pageId: string,
      annotationId: string,
      corner: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w",
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
      const startX = annotation.x;
      const startY = annotation.y;
      const minWidth = 0.04;
      const minHeight = 0.015;
      const fixedRight = startX + startWidth;
      const fixedBottom = startY + startHeight;
      const node = textAnnotationRefs.current.get(annotationId) ?? null;
      const handleMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const point = getPageNormalizedPoint(pageId, event.clientX, event.clientY);
        if (!point) return;
        let nextX = startX;
        let nextY = startY;
        let nextWidth = startWidth;
        let nextHeight = startHeight;
        if (corner === "se") {
          const deltaX = point.x - startPoint.x;
          const deltaY = point.y - startPoint.y;
          nextWidth = clamp(startWidth + deltaX, minWidth, 1 - startX);
          nextHeight = clamp(startHeight + deltaY, minHeight, 1 - startY);
        } else if (corner === "nw") {
          nextX = clamp(point.x, 0, fixedRight - minWidth);
          nextY = clamp(point.y, 0, fixedBottom - minHeight);
          nextWidth = clamp(fixedRight - nextX, minWidth, 1);
          nextHeight = clamp(fixedBottom - nextY, minHeight, 1);
        } else if (corner === "ne") {
          nextY = clamp(point.y, 0, fixedBottom - minHeight);
          nextWidth = clamp(point.x - startX, minWidth, 1 - startX);
          nextHeight = clamp(fixedBottom - nextY, minHeight, 1);
        } else if (corner === "sw") {
          nextX = clamp(point.x, 0, fixedRight - minWidth);
          nextWidth = clamp(fixedRight - nextX, minWidth, 1);
          nextHeight = clamp(point.y - startY, minHeight, 1 - startY);
        } else if (corner === "e") {
          const deltaX = point.x - startPoint.x;
          nextWidth = clamp(startWidth + deltaX, minWidth, 1 - startX);
        } else if (corner === "w") {
          const nextLeft = clamp(point.x, 0, fixedRight - minWidth);
          nextX = nextLeft;
          nextWidth = clamp(fixedRight - nextLeft, minWidth, 1);
        } else if (corner === "s") {
          const deltaY = point.y - startPoint.y;
          nextHeight = clamp(startHeight + deltaY, minHeight, 1 - startY);
        } else if (corner === "n") {
          const nextTop = clamp(point.y, 0, fixedBottom - minHeight);
          nextY = nextTop;
          nextHeight = clamp(fixedBottom - nextTop, minHeight, 1);
        }
        textResizeLatestRef.current = { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
        if (textResizeRafRef.current !== null) return;
        textResizeRafRef.current = window.requestAnimationFrame(() => {
          textResizeRafRef.current = null;
          const latest = textResizeLatestRef.current;
          if (!latest || !node) return;
          const containerNode = previewNodeMap.current.get(pageId);
          if (!containerNode) return;
          node.style.willChange = "left, top, width, height";
          node.style.left = `${latest.x * 100}%`;
          node.style.top = `${latest.y * 100}%`;
          node.style.width = `${latest.width * 100}%`;
          node.style.height = `${latest.height * 100}%`;
          const containerRect = containerNode.getBoundingClientRect();
          if (!containerRect.height) return;
          const requiredHeight = clamp(node.scrollHeight / containerRect.height, minHeight, 1 - latest.y);
          if (latest.height < requiredHeight) {
            let adjustedY = latest.y;
            if (corner === "n" || corner === "nw" || corner === "ne") {
              adjustedY = clamp(fixedBottom - requiredHeight, 0, fixedBottom - minHeight);
            }
            const adjusted = { ...latest, y: adjustedY, height: requiredHeight };
            textResizeLatestRef.current = adjusted;
            node.style.top = `${adjustedY * 100}%`;
            node.style.height = `${requiredHeight * 100}%`;
          }
        });
      };
      const handleUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        const latest = textResizeLatestRef.current;
        if (latest) {
          setTextAnnotations((prev) => {
            const existing = prev[pageId] ?? [];
            const updated = existing.map((item) =>
              item.id === annotationId
                ? { ...item, x: latest.x, y: latest.y, width: latest.width, height: latest.height }
                : item
            );
            return { ...prev, [pageId]: updated };
          });
          if (node) {
            node.style.left = `${latest.x * 100}%`;
            node.style.top = `${latest.y * 100}%`;
            node.style.width = `${latest.width * 100}%`;
            node.style.height = `${latest.height * 100}%`;
            node.style.willChange = "";
          }
        }
        setResizingText(null);
        cleanup();
      };
      function cleanup() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        textResizeCleanupRef.current = null;
        if (textResizeRafRef.current !== null) {
          window.cancelAnimationFrame(textResizeRafRef.current);
          textResizeRafRef.current = null;
        }
        textResizeLatestRef.current = null;
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

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const viewerScrollRef = previewContainerRef;
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const pagesRef = useRef<PageItem[]>([]);
  const pagesByIdRef = useRef<Map<string, PageItem>>(new Map());
  const hasHydratedSources = useRef(false);
  const objectUrlCacheRef = useRef<Map<string, string>>(new Map());
  const hasHydratedHighlights = useRef(false);
  const hasHydratedSignatures = useRef(false);
  const pendingInsertedPageRef = useRef<{ afterId: string; newId: string } | null>(null);
  const lastProjectKeyRef = useRef<string | null>(null);
  const pendingInitialRenderRef = useRef<PageItem[]>([]);
  const nearPageIdsRef = useRef<Set<string>>(new Set());
  const [nearPageIds, setNearPageIds] = useState<string[]>([]);
  const visiblePageIdsRef = useRef<Set<string>>(new Set());
  const [visiblePageIds, setVisiblePageIds] = useState<string[]>([]);
  useEffect(() => {
    pagesRef.current = pages;
    pagesByIdRef.current = new Map(pages.map((page) => [page.id, page]));
  }, [pages]);
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);
  useEffect(() => {
    activePageIndexRef.current = activePageIndexState;
  }, [activePageIndexState]);
  useEffect(() => {
    const projectKey = projectParam ?? currentProjectId ?? "local";
    if (lastProjectKeyRef.current === projectKey) return;
    lastProjectKeyRef.current = projectKey;
    renderedSourcesRef.current = 0;
    pendingInitialRenderRef.current = [];
    nearPageIdsRef.current.clear();
    setNearPageIds([]);
    visiblePageIdsRef.current.clear();
    setVisiblePageIds([]);
    pagesByIdRef.current.clear();
    pdfDocumentCacheRef.current.clear();
    renderQueueRef.current = [];
    renderQueueKeyRef.current.clear();
    pageRenderStatusRef.current.clear();
    activeRenderCountRef.current = 0;
    thumbRenderQueueRef.current = [];
    thumbRenderQueueKeyRef.current.clear();
    thumbRenderStatusRef.current.clear();
    thumbRenderActiveRef.current = 0;
    if (thumbRenderRafRef.current !== null) {
      window.cancelAnimationFrame(thumbRenderRafRef.current);
      thumbRenderRafRef.current = null;
    }
    if (renderQueueRafRef.current !== null) {
      window.cancelAnimationFrame(renderQueueRafRef.current);
      renderQueueRafRef.current = null;
    }
  }, [projectParam, currentProjectId]);
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
  const MIN_SHAPE_THICKNESS = 1;
  const MAX_SHAPE_THICKNESS = 10;
  const toolSwitchBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition";
  const toolSwitchActive = "bg-[#024d7c] text-white shadow-sm";
  const toolSwitchInactive = "bg-white text-slate-700 hover:bg-slate-50";
  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition";
  const buttonNeutral =
    `${buttonBase} border border-slate-200 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50`;
  const buttonPrimary =
    `${buttonBase} bg-[#024d7c] text-white shadow-md shadow-[#012a44]/30 hover:-translate-y-0.5 hover:bg-[#013d63]`;
  // (definition moved earlier to avoid temporal dead zone)
  const toolButtonBase =
    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009DFD]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F5F9] disabled:cursor-not-allowed";
	  const toolIconButton =
	    "justify-center px-1";
	  const toolButtonInactiveNeutral =
	    "border-transparent bg-[#F1F5F9] text-[#475569] shadow-none hover:bg-[#E5E7EB] hover:text-[#475569] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
  const toolButtonInactiveBlack =
    "border-transparent bg-[#F1F5F9] text-[#1f2937] shadow-none hover:bg-[#E5E7EB] hover:text-[#111827] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
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
  const textOptionButtonBase =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60";
  const textOptionButtonHover = "hover:bg-slate-100 hover:text-slate-900";
  const textOptionButtonActive = "bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700";
  const textInputPill = "inline-flex h-9 items-center gap-1 pl-0 pr-2 text-sm font-semibold text-slate-800";
  const LineSpacingIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v10" />
      <path d="M1.4 4.6L3 3l1.6 1.6" />
      <path d="M1.4 11.4L3 13l1.6-1.6" />
      <path d="M8 4h6" />
      <path d="M8 8h6" />
      <path d="M8 12h6" />
    </svg>
  );

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
          textSizePt?: number;
          textSize?: number;
          textColor?: string;
          textUnderline?: boolean;
          textTransform?: "none" | "uppercase";
          textAlign?: "left" | "center" | "right" | "justify";
	          signaturePlacements?: Record<string, SignaturePlacement[]>;
	          savedSignatures?: SavedSignature[];
	          pages?: {
            id: string;
            srcIdx?: number;
            pageIdx?: number;
            rotation?: number;
            width?: number;
            height?: number;
            thumb?: string;
            preview?: string;
          }[];
        };

	        if (data.highlights) {
	          setHighlights(data.highlights);
	        }
	        if (data.shapesByPage) {
	          const normalized: Record<string, ShapeAnnotation[]> = {};
	          Object.entries(data.shapesByPage).forEach(([pageId, list]) => {
	            normalized[pageId] = list.map((shape) => ({
	              ...shape,
	              fillColor: shape.fillColor ?? null,
                lineStyle: shape.lineStyle ?? "solid",
	            }));
	          });
	          setShapesByPage(normalized);
	        }
	        if (data.textAnnotations) {
	          setTextAnnotations(data.textAnnotations);
	        }
        if (typeof data.textSizePt === "number") {
          setTextSize(data.textSizePt);
        } else if (typeof data.textSize === "number") {
          setTextSize(data.textSize * PX_TO_PT);
        }
        if (typeof data.textColor === "string") {
          setTextColor(data.textColor);
        }
        if (typeof data.textUnderline === "boolean") {
          setTextUnderline(data.textUnderline);
        }
        if (data.textTransform === "uppercase" || data.textTransform === "none") {
          setTextTransform(data.textTransform);
        }
        if (
          data.textAlign === "left" ||
          data.textAlign === "center" ||
          data.textAlign === "right" ||
          data.textAlign === "justify"
        ) {
          setTextAlign(data.textAlign);
        }
        if (data.signaturePlacements) {
          setSignaturePlacements(data.signaturePlacements);
        }
        if (data.savedSignatures) {
          setSavedSignatures(data.savedSignatures);
        }
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          const normalizedPages = data.pages
            .filter((page) => page && typeof page.id === "string")
            .map((page) => ({
              id: page.id as string,
              rotation: typeof page.rotation === "number" ? page.rotation : undefined,
              thumb: typeof page.thumb === "string" ? page.thumb : "",
              preview: typeof page.preview === "string" ? page.preview : "",
            }));
          if (normalizedPages.length > 0) {
            const byId = new Map(normalizedPages.map((page) => [page.id, page]));
            setPages((current) =>
              current.map((page) => {
                const incoming = byId.get(page.id);
                if (!incoming) return page;
                return {
                  ...page,
                  rotation: typeof incoming.rotation === "number" ? incoming.rotation : page.rotation,
                  preview: incoming.preview || page.preview,
                  thumb: incoming.thumb || page.thumb,
                };
              })
            );
            normalizedPages.forEach((page) => {
              if (page.preview) {
                pageRenderStatusRef.current.set(page.id, "low");
              }
              if (page.thumb) {
                thumbRenderStatusRef.current.set(page.id, "ready");
              }
            });
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

        const naturalWidth = baseImage.width || page.width || 612;
        const naturalHeight = baseImage.height || page.height || naturalWidth * DEFAULT_ASPECT_RATIO;
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
            ctx.globalAlpha = effectiveTool === "highlight" ? stroke.opacity ?? 0.35 : stroke.opacity ?? 1;
            const widthFactor = stroke.tool === "highlight" ? 1.2 : 1;
            const lineWidth = Math.max(1, stroke.thickness * pageWidthPx * widthFactor);
            const dashed = effectiveTool !== "highlight" && stroke.lineStyle === "dashed";
            ctx.setLineDash(dashed ? [lineWidth * 2.5, lineWidth * 1.5] : []);
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            ctx.setLineDash([]);
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
	            const fillColor = shape.fillColor ?? null;
	            const isClosedShape =
	              shape.type === "rect" || shape.type === "ellipse" || shape.type === "triangle";

	            ctx.save();
	            ctx.strokeStyle = shape.color;
	            ctx.lineWidth = thickness;
	            ctx.lineCap = "round";
	            ctx.lineJoin = "round";
	            const allowDashed = shape.type !== "check" && shape.type !== "arrow";
	            const isDashed = allowDashed && shape.lineStyle === "dashed";
	            ctx.setLineDash(isDashed ? [thickness * 2.5, thickness * 1.5] : []);
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
                ctx.closePath();
                break;
              }
              case "x":
                drawLine(minX, minY, maxX, maxY);
                drawLine(maxX, minY, minX, maxY);
                break;
              case "check": {
                const p1 = { x: minX + w * 0.0, y: minY + h * 0.62 };
                const p2 = { x: minX + w * 0.32, y: minY + h * 0.9 };
                const p3 = { x: minX + w * 1.0, y: minY + h * 0.12 };
                drawLine(p1.x, p1.y, p2.x, p2.y);
                drawLine(p2.x, p2.y, p3.x, p3.y);
                break;
              }
              default:
                break;
            }
	            if (fillColor && isClosedShape) {
	              ctx.fillStyle = fillColor;
	              ctx.fill();
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
              for (const annotation of pageTexts) {
                const content = annotation.text;
                if (!content || content === TEXT_PLACEHOLDER) continue;
                const boxWidth = (annotation.width ?? 0.14) * pageWidthPx;
                const padding = Math.min(6, boxWidth * 0.05);
                const x = (annotation.x - 0.5) * pageWidthPx + padding;
                const startY = (annotation.y - 0.5) * pageHeightPx + padding;
                const baseSize = annotation.textSizePt ?? textSize;
                const lineSpacing = annotation.lineSpacing ?? DEFAULT_TEXT_LINE_SPACING;
                const html = annotation.richTextHtml ?? textToHtml(annotation.text);
                const runs = extractRichTextRuns(html, baseSize);
                const lines = splitRunsIntoLines(runs).slice(0, 6);
                let cursorY = startY;
                ctx.textBaseline = "top";
                lines.forEach((line, lineIndex) => {
                  if (line.length === 0) {
                    cursorY += baseSize * PT_TO_PX * lineSpacing;
                    return;
                  }
                  const maxWidth = Math.max(10, boxWidth - padding * 2);
                  const maxSize = Math.max(...line.map((run) => run.sizePt));
                  const lineHeight = baseSize * PT_TO_PX * lineSpacing;
                  let lineWidth = 0;
                  line.forEach((run) => {
                    ctx.font = `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${run.sizePt * PT_TO_PX}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                    const transformed = applyTextTransform(run.text, textTransform);
                    lineWidth += ctx.measureText(transformed).width;
                  });
                  let cursorX = x;
                  if (textAlign === "center") {
                    cursorX = x + Math.max(0, (maxWidth - lineWidth) / 2);
                  } else if (textAlign === "right") {
                    cursorX = x + Math.max(0, maxWidth - lineWidth);
                  }
                  const shouldJustify = textAlign === "justify" && lineIndex < lines.length - 1;
                  const spaceCount = shouldJustify
                    ? line.reduce(
                        (count, run) => count + (applyTextTransform(run.text, textTransform).match(/ /g)?.length ?? 0),
                        0
                      )
                    : 0;
                  const extraSpace =
                    shouldJustify && spaceCount > 0 ? Math.max(0, maxWidth - lineWidth) / spaceCount : 0;
                  line.forEach((run) => {
                    const sizePx = run.sizePt * PT_TO_PX;
                    ctx.font = `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${sizePx}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                    const transformed = applyTextTransform(run.text, textTransform);
                    const runWidth = ctx.measureText(transformed).width;
                    const runSpaceCount = shouldJustify ? (transformed.match(/ /g)?.length ?? 0) : 0;
                    const runWidthAdjusted = runWidth + runSpaceCount * extraSpace;
                    const runStartX = cursorX;
                    const runHighlight = run.highlightColor;
                    if (runHighlight) {
                      ctx.fillStyle = runHighlight;
                      ctx.fillRect(runStartX, cursorY, runWidthAdjusted, lineHeight);
                    }
                    ctx.fillStyle = run.color ?? textColor;
                    if (shouldJustify && spaceCount > 0) {
                      const segments = transformed.split(/( )/);
                      segments.forEach((segment) => {
                        if (segment === " ") {
                          const spaceWidth = ctx.measureText(" ").width;
                          cursorX += spaceWidth + extraSpace;
                        } else if (segment) {
                          ctx.fillText(segment, cursorX, cursorY, maxWidth);
                          cursorX += ctx.measureText(segment).width;
                        }
                      });
                    } else {
                      ctx.fillText(transformed, cursorX, cursorY, maxWidth);
                      cursorX += runWidth;
                    }
                    if (run.underline) {
                      const thickness = Math.max(0.5, sizePx / 14);
                      const underlineY = cursorY + sizePx * 0.9;
                      ctx.fillRect(runStartX, underlineY, runWidthAdjusted, thickness);
                    }
                  });
                  cursorY += lineHeight;
                });
              }
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
  }, [pages, highlights, textAnnotations, signaturePlacements, textAlign, textTransform, textSize, textColor]);

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
      let fromSession = false;
      if (local) raw = local.getItem(key);
      if (!raw && session) {
        raw = session.getItem(key);
        if (raw && local) {
          fromSession = true;
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
          if (fromSession) {
            startupOverlayActiveRef.current = true;
            setShowStartupOverlay(true);
          }
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

  const registerThumbNode = useCallback(
    (id: string) => (node: HTMLLIElement | null) => {
      if (node) {
        thumbNodeMapRef.current.set(id, node);
      } else {
        thumbNodeMapRef.current.delete(id);
      }
    },
    []
  );

  const scheduleRenderQueue = useCallback(() => {
    if (renderQueueRafRef.current !== null) return;
    renderQueueRafRef.current = window.requestAnimationFrame(() => {
      renderQueueRafRef.current = null;
      const queue = renderQueueRef.current;
      if (queue.length === 0) return;
      let activeLow = 0;
      pageRenderStatusRef.current.forEach((status) => {
        if (status === "rendering-low") activeLow += 1;
      });
      queue.sort((a, b) => b.priority - a.priority);
      while (activeRenderCountRef.current < MAX_PARALLEL_PREVIEW_RENDERS && queue.length > 0) {
        const nextIndex = queue.findIndex(
          (task) => task.quality === "high" || activeLow < MAX_PARALLEL_LOW_PREVIEW_RENDERS
        );
        if (nextIndex === -1) break;
        const next = queue[nextIndex];
        if (!next) break;
        queue.splice(nextIndex, 1);
        renderQueueKeyRef.current.delete(`${next.pageId}:${next.quality}`);
        const currentStatus = pageRenderStatusRef.current.get(next.pageId);
        if (
          next.quality === "low" &&
          (currentStatus === "low" ||
            currentStatus === "high" ||
            currentStatus === "rendering-low" ||
            currentStatus === "rendering-high")
        ) {
          continue;
        }
        if (next.quality === "high" && (currentStatus === "high" || currentStatus === "rendering-high")) {
          continue;
        }
        const renderingStatus = next.quality === "high" ? "rendering-high" : "rendering-low";
        pageRenderStatusRef.current.set(next.pageId, renderingStatus);
        activeRenderCountRef.current += 1;
        if (next.quality === "low") {
          activeLow += 1;
        }
        (async () => {
          const pdf = pdfDocumentCacheRef.current.get(next.srcIdx);
          if (!pdf) {
            activeRenderCountRef.current -= 1;
            if (pageRenderStatusRef.current.get(next.pageId) === renderingStatus) {
              pageRenderStatusRef.current.delete(next.pageId);
            }
            scheduleRenderQueue();
            return;
          }
          try {
            const page = await pdf.getPage(next.pageIdx + 1);
            const scale = next.quality === "high" ? PREVIEW_BASE_SCALE : LOW_RES_PREVIEW_SCALE;
            const pixelRatio = getDevicePixelRatio();
            const effectiveRatio = next.quality === "high" ? pixelRatio : Math.min(1, pixelRatio);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            const scaledWidth = Math.floor(viewport.width * effectiveRatio);
            const scaledHeight = Math.floor(viewport.height * effectiveRatio);
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            const renderContext = {
              canvasContext: ctx,
              viewport,
              transform: effectiveRatio !== 1 ? [effectiveRatio, 0, 0, effectiveRatio, 0, 0] : undefined,
            };
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            await page.render(renderContext).promise;
            const previewData = toCardPreviewDataUrl(canvas);
            const status = pageRenderStatusRef.current.get(next.pageId);
            if (next.quality === "low" && status === "high") {
              // skip low-res overwrite if high-res already finished
            } else {
              setPages((current) => {
                let changed = false;
                const nextPages = current.map((item) => {
                  if (item.id !== next.pageId) return item;
                  if (item.preview === previewData) return item;
                  changed = true;
                  return { ...item, preview: previewData };
                });
                return changed ? nextPages : current;
              });
              if (!(next.quality === "low" && status === "rendering-high")) {
                pageRenderStatusRef.current.set(next.pageId, next.quality);
              }
            }
          } catch (err) {
            console.error("Failed to render preview", err);
            if (pageRenderStatusRef.current.get(next.pageId) === renderingStatus) {
              pageRenderStatusRef.current.delete(next.pageId);
            }
          } finally {
            activeRenderCountRef.current -= 1;
            scheduleRenderQueue();
          }
        })();
      }
    });
  }, []);

  const enqueueRender = useCallback(
    (task: { pageId: string; srcIdx: number; pageIdx: number; quality: "low" | "high"; priority: number }) => {
      const existingPage = pagesByIdRef.current.get(task.pageId);
      if (existingPage?.preview && !pageRenderStatusRef.current.has(task.pageId)) {
        pageRenderStatusRef.current.set(task.pageId, "low");
      }
      const status = pageRenderStatusRef.current.get(task.pageId);
      if (
        task.quality === "low" &&
        (status === "low" || status === "high" || status === "rendering-low" || status === "rendering-high")
      ) {
        return;
      }
      if (task.quality === "high" && (status === "high" || status === "rendering-high")) return;
      const key = `${task.pageId}:${task.quality}`;
      if (renderQueueKeyRef.current.has(key)) {
        const queue = renderQueueRef.current;
        const existingIndex = queue.findIndex(
          (item) => item.pageId === task.pageId && item.quality === task.quality
        );
        if (existingIndex !== -1 && queue[existingIndex].priority < task.priority) {
          queue[existingIndex] = { ...queue[existingIndex], priority: task.priority };
          scheduleRenderQueue();
        }
        return;
      }
      renderQueueRef.current.push(task);
      renderQueueKeyRef.current.add(key);
      scheduleRenderQueue();
    },
    [scheduleRenderQueue]
  );

  const scheduleThumbRenderQueue = useCallback(() => {
    if (thumbRenderRafRef.current !== null) return;
    thumbRenderRafRef.current = window.requestAnimationFrame(() => {
      thumbRenderRafRef.current = null;
      const queue = thumbRenderQueueRef.current;
      if (queue.length === 0) return;
      queue.sort((a, b) => b.priority - a.priority);
      while (thumbRenderActiveRef.current < MAX_PARALLEL_THUMB_RENDERS && queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        thumbRenderQueueKeyRef.current.delete(next.pageId);
        const currentStatus = thumbRenderStatusRef.current.get(next.pageId);
        if (currentStatus === "ready" || currentStatus === "rendering") {
          continue;
        }
        thumbRenderStatusRef.current.set(next.pageId, "rendering");
        thumbRenderActiveRef.current += 1;
        (async () => {
          const pdf = pdfDocumentCacheRef.current.get(next.srcIdx);
          if (!pdf) {
            thumbRenderActiveRef.current -= 1;
            if (thumbRenderStatusRef.current.get(next.pageId) === "rendering") {
              thumbRenderStatusRef.current.delete(next.pageId);
            }
            scheduleThumbRenderQueue();
            return;
          }
          try {
            const page = await pdf.getPage(next.pageIdx + 1);
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(1, THUMB_MAX_WIDTH / baseViewport.width);
            const viewport = page.getViewport({ scale });
            const pixelRatio = Math.min(1, getDevicePixelRatio());
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d")!;
            const scaledWidth = Math.max(1, Math.floor(viewport.width * pixelRatio));
            const scaledHeight = Math.max(1, Math.floor(viewport.height * pixelRatio));
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
            const thumbData = createThumbnailDataUrl(canvas);
            setPages((current) => {
              let changed = false;
              const nextPages = current.map((item) => {
                if (item.id !== next.pageId) return item;
                if (item.thumb === thumbData) return item;
                changed = true;
                return { ...item, thumb: thumbData };
              });
              return changed ? nextPages : current;
            });
            thumbRenderStatusRef.current.set(next.pageId, "ready");
          } catch (err) {
            console.error("Failed to render thumbnail", err);
            if (thumbRenderStatusRef.current.get(next.pageId) === "rendering") {
              thumbRenderStatusRef.current.delete(next.pageId);
            }
          } finally {
            thumbRenderActiveRef.current -= 1;
            scheduleThumbRenderQueue();
          }
        })();
      }
    });
  }, []);

  const enqueueThumbRender = useCallback(
    (task: { pageId: string; srcIdx: number; pageIdx: number; priority: number }) => {
      const page = pagesByIdRef.current.get(task.pageId);
      if (!page) return;
      if (page.thumb) {
        thumbRenderStatusRef.current.set(task.pageId, "ready");
        return;
      }
      const status = thumbRenderStatusRef.current.get(task.pageId);
      if (status === "ready" || status === "rendering") return;
      if (thumbRenderQueueKeyRef.current.has(task.pageId)) {
        const queue = thumbRenderQueueRef.current;
        const existingIndex = queue.findIndex((item) => item.pageId === task.pageId);
        if (existingIndex !== -1 && queue[existingIndex].priority < task.priority) {
          queue[existingIndex] = { ...queue[existingIndex], priority: task.priority };
          scheduleThumbRenderQueue();
        }
        return;
      }
      thumbRenderQueueRef.current.push(task);
      thumbRenderQueueKeyRef.current.add(task.pageId);
      scheduleThumbRenderQueue();
    },
    [scheduleThumbRenderQueue]
  );

  useEffect(() => {
    if (pages.length === 0) return;
    if (pendingInitialRenderRef.current.length === 0) return;
    const initialPages = pendingInitialRenderRef.current;
    pendingInitialRenderRef.current = [];
    window.requestAnimationFrame(() => {
      initialPages.forEach((page) => {
        enqueueRender({ pageId: page.id, srcIdx: page.srcIdx, pageIdx: page.pageIdx, quality: "low", priority: 200 });
        enqueueRender({ pageId: page.id, srcIdx: page.srcIdx, pageIdx: page.pageIdx, quality: "high", priority: 150 });
      });
    });
  }, [enqueueRender, pages.length]);

  useEffect(() => {
    if (pages.length === 0) return;
    const initialThumbCount = Math.min(INITIAL_PREVIEW_RENDER_COUNT, pages.length);
    if (initialThumbCount === 0) return;
    const seed = pagesRef.current.slice(0, initialThumbCount);
    window.requestAnimationFrame(() => {
      seed.forEach((page, index) => {
        enqueueThumbRender({
          pageId: page.id,
          srcIdx: page.srcIdx,
          pageIdx: page.pageIdx,
          priority: 110 - index,
        });
      });
    });
  }, [enqueueThumbRender, pages.length]);

  /** Build page shells once per load and enqueue initial renders */
  useEffect(() => {
    if (sources.length === 0) {
      setPages([]);
      renderedSourcesRef.current = 0;
      renderQueueRef.current = [];
      renderQueueKeyRef.current.clear();
      pageRenderStatusRef.current.clear();
      activeRenderCountRef.current = 0;
      if (renderQueueRafRef.current !== null) {
        window.cancelAnimationFrame(renderQueueRafRef.current);
        renderQueueRafRef.current = null;
      }
      thumbRenderQueueRef.current = [];
      thumbRenderQueueKeyRef.current.clear();
      thumbRenderStatusRef.current.clear();
      thumbRenderActiveRef.current = 0;
      if (thumbRenderRafRef.current !== null) {
        window.cancelAnimationFrame(thumbRenderRafRef.current);
        thumbRenderRafRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function loadPdfSource(
      src: SourceRef,
      srcIdx: number,
      pdfjsLib: typeof import("pdfjs-dist") & { GlobalWorkerOptions: { workerSrc: string } },
    ) {
      let pdf: any | null = null;
      const sourceUrl = src.url;

      if (sourceUrl) {
        try {
          pdf = await pdfjsLib.getDocument({ url: sourceUrl } as any).promise;
        } catch (err) {
          console.warn("pdfjs getDocument failed, retrying without worker", err);
          try {
            pdf = await pdfjsLib.getDocument({ url: sourceUrl, disableWorker: true } as any).promise;
          } catch (innerErr) {
            console.warn("pdfjs getDocument failed with url source, falling back to bytes", innerErr);
          }
        }
      }

      if (!pdf) {
        const stored = await readFileBlob(src.storageId);
        const blob = stored?.blob instanceof Blob ? stored.blob : null;
        const bytes = blob
          ? new Uint8Array(await blob.arrayBuffer())
          : new Uint8Array(await (await fetch(src.url)).arrayBuffer());
        try {
          pdf = await pdfjsLib.getDocument({ data: bytes } as any).promise;
        } catch (err) {
          console.warn("pdfjs getDocument failed, retrying without worker", err);
          pdf = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as any).promise;
        }
      }
      if (!pdf) {
        throw new Error("Unable to load PDF source");
      }

      let width = 612;
      let height = 792;
      try {
        const firstPage = await pdf.getPage(1);
        const view = firstPage.view;
        width = view[2] - view[0];
        height = view[3] - view[1];
      } catch {
        // keep default size
      }

      return { pdf, srcIdx, storageId: src.storageId, pageCount: pdf.numPages, width, height };
    }

    async function loadSources() {
      const isInitialLoad = renderedSourcesRef.current === 0;
      if (isInitialLoad) setLoading(true);
      setError(null);

      const startIdx = isInitialLoad ? 0 : renderedSourcesRef.current;
      if (startIdx >= sources.length) {
        if (isInitialLoad) setLoading(false);
        return;
      }

      try {
        const pdfjsLib = (await import("pdfjs-dist")) as typeof import("pdfjs-dist") & {
          GlobalWorkerOptions: { workerSrc: string };
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url,
        ).toString();

        const loadPromises = sources.slice(startIdx).map((src, offset) =>
          loadPdfSource(src, startIdx + offset, pdfjsLib)
        );
        const results = await Promise.all(loadPromises);
        if (cancelled) return;

        const newPages: PageItem[] = [];
        results.forEach((result) => {
          if (!result) return;
          pdfDocumentCacheRef.current.set(result.srcIdx, result.pdf);
          for (let pageIdx = 0; pageIdx < result.pageCount; pageIdx += 1) {
            newPages.push({
              id: buildPageId(result.storageId, pageIdx),
              srcIdx: result.srcIdx,
              pageIdx,
              thumb: "",
              preview: "",
              rotation: 0,
              width: result.width,
              height: result.height,
            });
          }
        });

        if (cancelled) return;

        if (isInitialLoad) {
          setPages(newPages);
          pendingInitialRenderRef.current = newPages.slice(0, INITIAL_PREVIEW_RENDER_COUNT);
        } else if (newPages.length > 0) {
          setPages((prev) => {
            const existing = new Set(prev.map((page) => page.id));
            const appended = newPages.filter((page) => !existing.has(page.id));
            return appended.length > 0 ? [...prev, ...appended] : prev;
          });
        }

        renderedSourcesRef.current = sources.length;
        if (isInitialLoad) setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not render previews (file may be encrypted or corrupted).");
        if (isInitialLoad && !cancelled) setLoading(false);
      }
    }

    void loadSources();
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
    if (!recentInsertedPageId) return;
    const timer = window.setTimeout(() => setRecentInsertedPageId(null), 220);
    return () => window.clearTimeout(timer);
  }, [recentInsertedPageId]);

  const pageIdSignature = useMemo(() => pages.map((page) => page.id).join("|"), [pages]);

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

  const updateActivePageFromScroll = useCallback(() => {
    const container = previewContainerRef.current;
    const layout = pageLayoutRef.current;
    if (!container || layout.ids.length === 0) return;
    const viewCenter = container.scrollTop + container.clientHeight / 2;
    let closestIndex = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < layout.centers.length; i += 1) {
      const distance = Math.abs(layout.centers[i] - viewCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    const nextId = layout.ids[closestIndex];
    if (!nextId) return;
    if (activePageIdRef.current !== nextId || activePageIndexRef.current !== closestIndex) {
      activePageIdRef.current = nextId;
      activePageIndexRef.current = closestIndex;
      setActivePageId(nextId);
      setActivePageIndex(closestIndex);
    }
  }, [setActivePageId, setActivePageIndex]);

  const refreshPageLayout = useCallback(() => {
    pageLayoutRafRef.current = null;
    const container = previewContainerRef.current;
    const pageList = pagesRef.current;
    if (!container || pageList.length === 0) return;
    const containerRect = container.getBoundingClientRect();
    const ids: string[] = [];
    const centers: number[] = [];
    pageList.forEach((page) => {
      const node = previewNodeMap.current.get(page.id);
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const top = rect.top - containerRect.top + container.scrollTop;
      ids.push(page.id);
      centers.push(top + rect.height / 2);
    });
    if (ids.length !== pageList.length) {
      if (pageLayoutRafRef.current !== null) {
        window.cancelAnimationFrame(pageLayoutRafRef.current);
      }
      pageLayoutRafRef.current = window.requestAnimationFrame(refreshPageLayout);
      return;
    }
    pageLayoutRef.current = { ids, centers };
    updateActivePageFromScroll();
  }, [pageIdSignature, updateActivePageFromScroll]);

  useEffect(() => {
    if (pages.length === 0) {
      pageLayoutRef.current = { ids: [], centers: [] };
      return;
    }
    if (pageLayoutRafRef.current !== null) {
      window.cancelAnimationFrame(pageLayoutRafRef.current);
    }
    pageLayoutRafRef.current = window.requestAnimationFrame(() => {
      refreshPageLayout();
    });
    return () => {
      if (pageLayoutRafRef.current !== null) {
        window.cancelAnimationFrame(pageLayoutRafRef.current);
        pageLayoutRafRef.current = null;
      }
    };
  }, [pageIdSignature, baseScale, zoomMultiplier, refreshPageLayout, pages.length]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;
    const handleScroll = () => {
      if (scrollUpdateRafRef.current !== null) return;
      scrollUpdateRafRef.current = window.requestAnimationFrame(() => {
        scrollUpdateRafRef.current = null;
        updateActivePageFromScroll();
      });
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollUpdateRafRef.current !== null) {
        window.cancelAnimationFrame(scrollUpdateRafRef.current);
        scrollUpdateRafRef.current = null;
      }
    };
  }, [pages.length, updateActivePageFromScroll]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;
    nearPageIdsRef.current.clear();
    setNearPageIds([]);
    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-page-id");
          if (!id) return;
          if (entry.isIntersecting) {
            if (!nearPageIdsRef.current.has(id)) {
              nearPageIdsRef.current.add(id);
              changed = true;
            }
          } else if (nearPageIdsRef.current.delete(id)) {
            changed = true;
          }
        });
        if (changed) {
          setNearPageIds(Array.from(nearPageIdsRef.current));
        }
      },
      { root: container, rootMargin: "120% 0px", threshold: 0.01 }
    );
    previewNodeMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;
    visiblePageIdsRef.current.clear();
    setVisiblePageIds([]);
    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-page-id");
          if (!id) return;
          if (entry.isIntersecting) {
            if (!visiblePageIdsRef.current.has(id)) {
              visiblePageIdsRef.current.add(id);
              changed = true;
            }
          } else if (visiblePageIdsRef.current.delete(id)) {
            changed = true;
          }
        });
        if (changed) {
          setVisiblePageIds(Array.from(visiblePageIdsRef.current));
        }
      },
      { root: container, threshold: 0.4 }
    );
    previewNodeMap.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    if (pages.length === 0) return;
    const candidates = new Set<string>();
    nearPageIds.forEach((id) => candidates.add(id));
    candidates.forEach((id) => {
      const page = pagesByIdRef.current.get(id);
      if (!page) return;
      enqueueRender({ pageId: page.id, srcIdx: page.srcIdx, pageIdx: page.pageIdx, quality: "low", priority: 70 });
    });
  }, [enqueueRender, nearPageIds, pages.length]);

  useEffect(() => {
    if (pages.length === 0) return;
    const candidates = new Set<string>(visiblePageIds);
    const activeIndex =
      activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : 0;
    for (let offset = -2; offset <= 2; offset += 1) {
      const idx = activeIndex + offset;
      if (idx >= 0 && idx < pages.length) {
        candidates.add(pages[idx].id);
      }
    }
    candidates.forEach((id) => {
      const page = pagesByIdRef.current.get(id);
      if (!page) return;
      enqueueRender({ pageId: page.id, srcIdx: page.srcIdx, pageIdx: page.pageIdx, quality: "high", priority: 120 });
    });
  }, [activePageIndexState, enqueueRender, pages, visiblePageIds]);

  useEffect(() => {
    const container = thumbsScrollRef.current;
    if (!container || pages.length === 0) return;
    visibleThumbIdsRef.current.clear();
    setVisibleThumbIds([]);
    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-thumb-id");
          if (!id) return;
          if (entry.isIntersecting) {
            if (!visibleThumbIdsRef.current.has(id)) {
              visibleThumbIdsRef.current.add(id);
              changed = true;
            }
          } else if (visibleThumbIdsRef.current.delete(id)) {
            changed = true;
          }
        });
        if (changed) {
          setVisibleThumbIds(Array.from(visibleThumbIdsRef.current));
        }
      },
      { root: container, threshold: 0.15, rootMargin: "40% 0px" }
    );
    thumbNodeMapRef.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  useEffect(() => {
    if (pages.length === 0) return;
    visibleThumbIds.forEach((id) => {
      const page = pagesByIdRef.current.get(id);
      if (!page) return;
      enqueueThumbRender({ pageId: page.id, srcIdx: page.srcIdx, pageIdx: page.pageIdx, priority: 80 });
    });
  }, [enqueueThumbRender, pages.length, visibleThumbIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const session = getSessionStorage();
    if (session?.getItem(STARTUP_OVERLAY_KEY)) {
      session.removeItem(STARTUP_OVERLAY_KEY);
      startupOverlayActiveRef.current = true;
      setShowStartupOverlay(true);
    }
    const storage = getLocalStorage();
    if (!storage) return;
    const pending = storage.getItem(PENDING_UPLOAD_STORAGE_KEY);
    if (!pending) return;
    startupOverlayActiveRef.current = true;
    setShowStartupOverlay(true);
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

  const computeStartupProgress = useCallback(() => {
    const pageList = pagesRef.current;
    if (pageList.length === 0) return 0;
    const targetCount = Math.min(INITIAL_PREVIEW_RENDER_COUNT, pageList.length);
    if (targetCount === 0) return 0;
    const readyCount = pageList.slice(0, targetCount).reduce((count, page) => count + (page.preview ? 1 : 0), 0);
    const renderProgress = readyCount / targetCount;
    const startedAt = startupOverlayStartRef.current ?? performance.now();
    const elapsed = performance.now() - startedAt;
    const timeProgress = Math.min(elapsed / MIN_STARTUP_OVERLAY_MS, 1);
    let nextProgress = 0;
    if (renderProgress >= 1) {
      nextProgress = 0.9 + 0.1 * timeProgress;
    } else {
      nextProgress = 0.1 + 0.8 * renderProgress;
    }
    return clamp(nextProgress, 0, 1);
  }, []);

  useEffect(() => {
    if (!showStartupOverlay) {
      startupOverlayStartRef.current = null;
      if (startupOverlayTimerRef.current !== null) {
        window.clearTimeout(startupOverlayTimerRef.current);
        startupOverlayTimerRef.current = null;
      }
      if (startupProgressTimerRef.current !== null) {
        window.clearInterval(startupProgressTimerRef.current);
        startupProgressTimerRef.current = null;
      }
      startupProgressRef.current = 0;
      setStartupProgress(0);
      return;
    }
    if (startupOverlayStartRef.current === null) {
      startupOverlayStartRef.current = performance.now();
    }
  }, [showStartupOverlay]);

  useEffect(() => {
    if (!showStartupOverlay) return;
    const tick = () => {
      const next = computeStartupProgress();
      if (next !== startupProgressRef.current) {
        startupProgressRef.current = next;
        setStartupProgress(next);
      }
    };
    tick();
    if (startupProgressTimerRef.current !== null) {
      window.clearInterval(startupProgressTimerRef.current);
    }
    startupProgressTimerRef.current = window.setInterval(tick, 120);
    return () => {
      if (startupProgressTimerRef.current !== null) {
        window.clearInterval(startupProgressTimerRef.current);
        startupProgressTimerRef.current = null;
      }
    };
  }, [computeStartupProgress, showStartupOverlay]);

  useEffect(() => {
    if (!startupOverlayActiveRef.current || !showStartupOverlay) return;
    if (pages.length === 0) return;
    const targetCount = Math.min(INITIAL_PREVIEW_RENDER_COUNT, pages.length);
    const readyCount = pages.slice(0, targetCount).filter((page) => page.preview).length;
    if (readyCount < targetCount) return;
    const startedAt = startupOverlayStartRef.current ?? performance.now();
    const elapsed = performance.now() - startedAt;
    const required = MIN_STARTUP_OVERLAY_MS + STARTUP_OVERLAY_FULL_HOLD_MS;
    const remaining = Math.max(0, required - elapsed);
    if (remaining === 0) {
      setShowStartupOverlay(false);
      startupOverlayActiveRef.current = false;
      return;
    }
    if (startupOverlayTimerRef.current !== null) {
      window.clearTimeout(startupOverlayTimerRef.current);
    }
    startupOverlayTimerRef.current = window.setTimeout(() => {
      if (!startupOverlayActiveRef.current) return;
      setShowStartupOverlay(false);
      startupOverlayActiveRef.current = false;
    }, remaining);
    return () => {
      if (startupOverlayTimerRef.current !== null) {
        window.clearTimeout(startupOverlayTimerRef.current);
        startupOverlayTimerRef.current = null;
      }
    };
  }, [pages, showStartupOverlay]);

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
    suppressNextAutoZoomRef.current = 2;
    const storageId = crypto.randomUUID();
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    await storeFileBlob(storageId, blob, "Blank page.pdf", blob.size);
    const objectUrl = URL.createObjectURL(blob);
    const newPageId = buildPageId(storageId, 0);
    const pixelRatio = getDevicePixelRatio();
    const pageWidth = 612;
    const pageHeight = 792;
    const viewportWidth = Math.floor(pageWidth * PREVIEW_BASE_SCALE * pixelRatio);
    const viewportHeight = Math.floor(pageHeight * PREVIEW_BASE_SCALE * pixelRatio);
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
        width: pageWidth,
        height: pageHeight,
      };
      if (afterIndex === -1) next.push(newPage);
      else next.splice(afterIndex + 1, 0, newPage);
      insertedIndex = afterIndex === -1 ? next.length - 1 : afterIndex + 1;
      return next;
    });

    pageNavigationLockRef.current = { until: Date.now() + 700, targetId: newPageId };
    setActivePageId(newPageId);
    setActivePageIndex(insertedIndex);
    setShouldCenterOnChange(true);
    setRecentInsertedPageId(newPageId);
  }

  async function handleAddBlankPageBefore(pageId: string) {
    suppressNextAutoZoomRef.current = 2;
    const storageId = crypto.randomUUID();
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const bytes = await doc.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    await storeFileBlob(storageId, blob, "Blank page.pdf", blob.size);
    const objectUrl = URL.createObjectURL(blob);
    const newPageId = buildPageId(storageId, 0);
    const pixelRatio = getDevicePixelRatio();
    const pageWidth = 612;
    const pageHeight = 792;
    const viewportWidth = Math.floor(pageWidth * PREVIEW_BASE_SCALE * pixelRatio);
    const viewportHeight = Math.floor(pageHeight * PREVIEW_BASE_SCALE * pixelRatio);
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
        width: pageWidth,
        height: pageHeight,
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
    setRecentInsertedPageId(newPageId);
  }

  async function handleDuplicatePage(page: PageItem) {
    suppressNextAutoZoomRef.current = 2;
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
    setRecentInsertedPageId(newPageId);
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

  const registerShapeRenderNode = useCallback(
    (id: string) => (node: SVGGElement | null) => {
      if (node) {
        shapeRenderNodeMap.current.set(id, node);
      } else {
        shapeRenderNodeMap.current.delete(id);
      }
    },
    []
  );

  const registerShapeHitNode = useCallback(
    (id: string) => (node: SVGGElement | null) => {
      if (node) {
        shapeHitNodeMap.current.set(id, node);
      } else {
        shapeHitNodeMap.current.delete(id);
      }
    },
    []
  );

  const registerShapeIndicatorNode = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) {
        shapeIndicatorNodeMap.current.set(id, node);
      } else {
        shapeIndicatorNodeMap.current.delete(id);
      }
    },
    []
  );

  const registerShapeHandleNode = useCallback(
    (id: string, handleKey: string) => (node: HTMLDivElement | null) => {
      const key = `${id}:${handleKey}`;
      if (node) {
        shapeHandleNodeMap.current.set(key, node);
      } else {
        shapeHandleNodeMap.current.delete(key);
      }
    },
    []
  );

  const registerDraftHighlightPath = useCallback(
    (pageId: string) => (node: SVGPathElement | null) => {
      if (node) {
        draftHighlightPathMapRef.current.set(pageId, node);
      } else {
        draftHighlightPathMapRef.current.delete(pageId);
      }
    },
    []
  );


  const renderPreviewPage = (page: PageItem, idx: number) => {
    const pageHighlights = highlights[page.id] ?? [];
    const pageShapes = shapesByPage[page.id] ?? [];
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
        className={`mx-auto w-fit ${
          recentInsertedPageId === page.id
            ? "opacity-0 scale-[0.98] animate-[page-enter_0.15s_ease-out_forwards]"
            : "opacity-100"
        }`}
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
          data-page-id={page.id}
          ref={registerPreviewRef(page.id)}
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
              <div className="absolute inset-0 bg-white" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.preview || TRANSPARENT_PIXEL}
                alt={`Page ${idx + 1}`}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
                  page.preview ? "opacity-100" : "opacity-0"
                }`}
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
                    {pageShapes.map((shape) => {
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
                            fill: "none",
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
                  const opacity = isHighlight ? stroke.opacity ?? 0.35 : stroke.opacity ?? 1;
                  const isDashed = !isHighlight && stroke.lineStyle === "dashed";
                  const dash = Math.max(6, baseWidth * 1.6);
                  const gap = Math.max(4, baseWidth * 1.2);
                  const commonProps = {
                    d: pointsToSvgPath(stroke.points),
                    fill: "none" as const,
                    stroke: stroke.color,
                    strokeLinecap: cap as any,
                    strokeLinejoin: join as any,
                    strokeDasharray: isDashed ? `${dash} ${gap}` : undefined,
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

                {pageShapes.map((shape) => {
                  const isDraggingThis = draggingShape?.id === shape.id;
                  const isResizingThis = resizingShape?.id === shape.id;
                  const baseWidth = Math.max(1, shape.thickness * 1000);
                  return (
                    <g
                      key={shape.id}
                      ref={registerShapeRenderNode(shape.id)}
                      style={isDraggingThis || isResizingThis ? { willChange: "transform" } : undefined}
                    >
                      {shapeToSvgElements(shape, {
                        stroke: shape.color,
                        strokeWidth: baseWidth,
                        fill: shape.fillColor ?? "none",
                        vectorEffect: isResizingThis ? "non-scaling-stroke" : undefined,
                      })}
                    </g>
                  );
                })}

                <path
                  ref={registerDraftHighlightPath(page.id)}
                  aria-hidden
                  fill="none"
                  style={{ pointerEvents: "none", display: "none" }}
                />

                {draftShape?.pageId === page.id ? (
                  <Fragment>
                    {shapeToSvgElements(draftShape, {
                      stroke: draftShape.color,
                      strokeWidth: Math.max(1, draftShape.thickness * 1000),
                      fill: draftShape.fillColor ?? "none",
                    })}
                  </Fragment>
                ) : null}
              </svg>
              {!deleteMode && !draggingShape && !resizingShape ? (
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {pageShapes.map((shape) => {
                    const baseWidth = Math.max(1, shape.thickness * 1000);
                    const hitWidth = shape.fillColor
                      ? baseWidth
                      : baseWidth + (contentWidth ? (8 / contentWidth) * 1000 : 8);
                    const hasFill =
                      !!shape.fillColor &&
                      (shape.type === "rect" || shape.type === "ellipse" || shape.type === "triangle");
                    const hitProps: SVGProps<SVGElement> & { "data-shape-annotation"?: string } = {
                      "data-shape-annotation": "true",
                      style: { pointerEvents: hasFill ? ("fill" as const) : ("stroke" as const), cursor: "pointer" },
                      onPointerDown: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        clearTextFocus();
                        setFocusedShapeId(shape.id);
                        setFocusedShapePageId(page.id);
                      },
                    };
                    return (
                      <g key={`${shape.id}-select`} ref={registerShapeHitNode(shape.id)}>
                        {shapeToSvgElements(shape, {
                          stroke: "transparent",
                          strokeWidth: hitWidth,
                          fill: hasFill ? "transparent" : "none",
                          fillOpacity: hasFill ? 0.01 : 1,
                          interactiveProps: hitProps,
                        })}
                      </g>
                    );
                  })}
                </svg>
              ) : null}
              {pageShapes.map((shape) => {
                const { minX, minY, w, h } = shapeBounds(shape);
                const boxWidth = clamp(w, 0, 1);
                const boxHeight = clamp(h, 0, 1);
                const boxLeft = clamp(minX, 0, 1 - boxWidth);
                const boxTop = clamp(minY, 0, 1 - boxHeight);
                const isDraggingThis = draggingShape?.id === shape.id;
                const isResizingThis = resizingShape?.id === shape.id;
                const showShapeIndicator = focusedShapeId === shape.id && isDraggingThis;
                const showShapeActions = focusedShapeId === shape.id && !isDraggingThis && !isResizingThis;
                const showShapeHandles = (showShapeActions || isResizingThis) && !isDraggingThis;
                const startRelX = clamp((shape.start.x - boxLeft) / boxWidth, 0, 1);
                const startRelY = clamp((shape.start.y - boxTop) / boxHeight, 0, 1);
                const endRelX = clamp((shape.end.x - boxLeft) / boxWidth, 0, 1);
                const endRelY = clamp((shape.end.y - boxTop) / boxHeight, 0, 1);
                const handleBaseClass =
                  "pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-500 bg-white shadow-sm transition hover:scale-110";
                const handles: Array<{
                  key: string;
                  x: number;
                  y: number;
                  cursor: CSSProperties["cursor"];
                  handle:
                    | "nw"
                    | "ne"
                    | "sw"
                    | "se"
                    | "n"
                    | "s"
                    | "e"
                    | "w"
                    | "start"
                    | "end"
                    | "tri-top"
                    | "tri-left"
                    | "tri-right";
                }> =
                  shape.type === "line" || shape.type === "arrow"
                    ? [
                        { key: "start", x: startRelX, y: startRelY, cursor: "crosshair", handle: "start" },
                        { key: "end", x: endRelX, y: endRelY, cursor: "crosshair", handle: "end" },
                      ]
                    : shape.type === "ellipse"
                      ? [
                          { key: "n", x: 0.5, y: 0, cursor: "ns-resize", handle: "n" },
                          { key: "s", x: 0.5, y: 1, cursor: "ns-resize", handle: "s" },
                          { key: "w", x: 0, y: 0.5, cursor: "ew-resize", handle: "w" },
                          { key: "e", x: 1, y: 0.5, cursor: "ew-resize", handle: "e" },
                        ]
                      : shape.type === "triangle"
                        ? [
                            { key: "top", x: 0.5, y: 0, cursor: "ns-resize", handle: "tri-top" },
                            { key: "left", x: 0, y: 1, cursor: "ew-resize", handle: "tri-left" },
                            { key: "right", x: 1, y: 1, cursor: "ew-resize", handle: "tri-right" },
                          ]
                        : shape.type === "check"
                          ? [
                              { key: "p1", x: 0.0, y: 0.62, cursor: "nwse-resize", handle: "sw" },
                              { key: "p2", x: 0.32, y: 0.9, cursor: "ns-resize", handle: "s" },
                              { key: "p3", x: 1.0, y: 0.12, cursor: "nwse-resize", handle: "ne" },
                            ]
                          : [
                              { key: "nw", x: 0, y: 0, cursor: "nwse-resize", handle: "nw" },
                              { key: "ne", x: 1, y: 0, cursor: "nesw-resize", handle: "ne" },
                              { key: "sw", x: 0, y: 1, cursor: "nesw-resize", handle: "sw" },
                              { key: "se", x: 1, y: 1, cursor: "nwse-resize", handle: "se" },
                            ];
                const leftPercent = (boxLeft + boxWidth / 2) * 100;
                const topPercent = boxTop * 100;
                return (
                  <Fragment key={`shape-overlay-${shape.id}`}>
                    {showShapeIndicator ? (
                        <div
                          className="absolute z-20 flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/85 text-slate-700 shadow-sm"
                          data-shape-annotation
                          ref={registerShapeIndicatorNode(shape.id)}
                          style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: "translate(-50%, -2.5rem)" }}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200/80">
                            <Move className="h-4 w-4" />
                          </span>
                        </div>
                      ) : null}
                    {showShapeActions ? (
                        <div
                          className="absolute z-20 flex w-max items-center gap-0.5 rounded-lg border border-slate-300 bg-white/85 px-1 py-0.5 opacity-80 shadow-sm transition-opacity hover:opacity-100"
                          data-shape-annotation
                          style={{ left: `${leftPercent}%`, top: `${topPercent}%`, transform: "translate(-50%, -2.5rem)" }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 active:translate-y-[1px]"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setFocusedShapeId(shape.id);
                              setFocusedShapePageId(page.id);
                              startShapeDrag(page.id, shape.id, event);
                            }}
                          >
                            <Move className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-300/80" />
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 active:translate-y-[1px]"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              duplicateShape(page.id, shape.id);
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-300/80" />
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 active:translate-y-[1px]"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleDeleteShape(page.id, shape.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                    ) : null}
                    {showShapeHandles && !deleteMode
                      ? handles.map((handle) => {
                          const handleLeft = (boxLeft + boxWidth * handle.x) * 100;
                          const handleTop = (boxTop + boxHeight * handle.y) * 100;
                          return (
                            <div
                              key={`${shape.id}-handle-${handle.key}`}
                              className={`${handleBaseClass} z-20`}
                              data-shape-annotation
                              ref={registerShapeHandleNode(shape.id, handle.key)}
                              style={{
                                left: `${handleLeft}%`,
                                top: `${handleTop}%`,
                                cursor: handle.cursor,
                              }}
                              onPointerDown={(event) => {
                                setFocusedShapeId(shape.id);
                                setFocusedShapePageId(page.id);
                                startShapeResize(page.id, shape.id, handle.handle, event);
                              }}
                            />
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
              {draftTextBox && draftTextBox.pageId === page.id ? (() => {
                const widthDelta = Math.abs(draftTextBox.currentX - draftTextBox.startX);
                const heightDelta = Math.abs(draftTextBox.currentY - draftTextBox.startY);
                if (widthDelta === 0 && heightDelta === 0) return null;
                return (
                  <div
                    className="absolute border border-dashed border-slate-400/40"
                    style={{
                      left: `${Math.min(draftTextBox.startX, draftTextBox.currentX) * 100}%`,
                      top: `${Math.min(draftTextBox.startY, draftTextBox.currentY) * 100}%`,
                      width: `${Math.max(widthDelta, 0.01) * 100}%`,
                      height: `${Math.max(heightDelta, 0.01) * 100}%`,
                    }}
                  />
                );
              })() : null}
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
                const rotation = annotation.rotation ?? 0;
                const displayRotation = normalizeRotation(rotation);
                const displayFontSize = (annotation.textSizePt ?? textSize) * PT_TO_PX * zoomMultiplier;
                const lineSpacing = annotation.lineSpacing ?? DEFAULT_TEXT_LINE_SPACING;
                const annotationHtml = annotation.richTextHtml ?? textToHtml(annotation.text);
                const showTextActions = focusedTextId === annotation.id && typingTextId !== annotation.id;
                const showResizeHandles = focusedTextId === annotation.id || isResizingThis;
                const boxWidthPx = annotationWidth * contentWidth;
                const boxHeightPx = annotationHeight * contentHeight;
                const cornerSize = 12;
                const showCornerIndicators =
                  showResizeHandles && boxWidthPx >= cornerSize && boxHeightPx >= cornerSize;
                return (
                <div
                  key={annotation.id}
                  ref={registerTextAnnotationNode(annotation.id)}
                  className="group absolute"
                  data-text-annotation
                  style={{
                    left: `${annotation.x * 100}%`,
                    top: `${annotation.y * 100}%`,
                    width: `${annotationWidth * 100}%`,
                    height: `${annotationHeight * 100}%`,
                    transform: `rotate(${displayRotation}deg)`,
                    transformOrigin: "center",
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
                    <div className="relative h-full w-full overflow-visible">
                    <div
                      className={`pointer-events-none absolute inset-0 overflow-visible ${
                        focusedTextId === annotation.id || isDraggingThis
                          ? "border-2 border-[#A3A3A3] shadow-sm"
                          : "border border-transparent group-hover:border-slate-300"
                      }`}
                    >
                      {showCornerIndicators ? (
                        <>
                          <div className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2">
                            <span className="absolute left-0 top-0 h-0.5 w-2 bg-[#111111]" />
                            <span className="absolute left-0 top-0 h-2 w-0.5 bg-[#111111]" />
                          </div>
                          <div className="absolute right-0 top-0 h-2 w-2 translate-x-1/2 -translate-y-1/2">
                            <span className="absolute right-0 top-0 h-0.5 w-2 bg-[#111111]" />
                            <span className="absolute right-0 top-0 h-2 w-0.5 bg-[#111111]" />
                          </div>
                          <div className="absolute bottom-0 left-0 h-2 w-2 -translate-x-1/2 translate-y-1/2">
                            <span className="absolute left-0 bottom-0 h-0.5 w-2 bg-[#111111]" />
                            <span className="absolute left-0 bottom-0 h-2 w-0.5 bg-[#111111]" />
                          </div>
                          <div className="absolute bottom-0 right-0 h-2 w-2 translate-x-1/2 translate-y-1/2">
                            <span className="absolute right-0 bottom-0 h-0.5 w-2 bg-[#111111]" />
                            <span className="absolute right-0 bottom-0 h-2 w-0.5 bg-[#111111]" />
                          </div>
                          <div className="absolute left-1/2 top-0 h-0.5 w-3 -translate-x-1/2 -translate-y-[3px] bg-[#111111]" />
                          <div className="absolute left-1/2 bottom-0 h-0.5 w-3 -translate-x-1/2 translate-y-[3px] bg-[#111111]" />
                          <div className="absolute left-0 top-1/2 h-3 w-0.5 -translate-x-[3px] -translate-y-1/2 bg-[#111111]" />
                          <div className="absolute right-0 top-1/2 h-3 w-0.5 translate-x-[3px] -translate-y-1/2 bg-[#111111]" />
                        </>
                      ) : null}
                    </div>
                    {showResizeHandles ? (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="pointer-events-auto absolute inset-x-0 top-0 h-4 -translate-y-1/2 cursor-ns-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "n", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute inset-x-0 bottom-0 h-4 translate-y-1/2 cursor-ns-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "s", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute inset-y-0 left-0 w-4 -translate-x-1/2 cursor-ew-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "w", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute inset-y-0 right-0 w-4 translate-x-1/2 cursor-ew-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "e", event);
                          }}
                        />
                      </div>
                    ) : null}
                    {showCornerIndicators ? (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="pointer-events-auto absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "nw", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute right-0 top-0 h-6 w-6 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "ne", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute left-0 bottom-0 h-6 w-6 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "sw", event);
                          }}
                        />
                        <div
                          className="pointer-events-auto absolute right-0 bottom-0 h-6 w-6 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "se", event);
                          }}
                        />
                      </div>
                    ) : null}
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck={false}
                      onCopy={(event) => handleCopyOrCut(event, false)}
                      onCut={(event) => handleCopyOrCut(event, true)}
                      onKeyDown={(event) => {
                        if (event.key !== "Backspace") return;
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;
                        const range = selection.getRangeAt(0);
                        if (!range.collapsed) return;
                        const anchorNode =
                          range.startContainer.nodeType === Node.ELEMENT_NODE
                            ? (range.startContainer as HTMLElement)
                            : range.startContainer.parentElement;
                        const exitBlock = anchorNode?.closest("[data-list-exit='pending']") as HTMLElement | null;
                        if (exitBlock) {
                          const exitText = exitBlock.innerText.replace(/[\u200b\u2060]/g, "").trim();
                          if (exitText.length > 0) return;
                          event.preventDefault();
                          exitBlock.style.paddingLeft = "";
                          exitBlock.removeAttribute("data-list-exit");
                          const nextRange = document.createRange();
                          nextRange.selectNodeContents(exitBlock);
                          nextRange.collapse(true);
                          selection.removeAllRanges();
                          selection.addRange(nextRange);
                          selectionRangeRef.current = nextRange.cloneRange();
                          setListType(null);
                          return;
                        }
                        const li = anchorNode?.closest("li");
                        if (!li) return;
                        const text = li.innerText.replace(/[\u200b\u2060]/g, "").trim();
                        if (text.length > 0) return;
                        event.preventDefault();
                        const list = li.parentElement;
                        const replacement = document.createElement("div");
                        replacement.appendChild(document.createElement("br"));
                        replacement.dataset.listExit = "pending";
                        if (list && (list.tagName === "UL" || list.tagName === "OL")) {
                          const listStyle = window.getComputedStyle(list);
                          if (listStyle.paddingLeft) {
                            replacement.style.paddingLeft = listStyle.paddingLeft;
                          }
                          const afterList = list.cloneNode(false) as HTMLElement;
                          let sibling = li.nextSibling;
                          while (sibling) {
                            const next = sibling.nextSibling;
                            afterList.appendChild(sibling);
                            sibling = next;
                          }
                          li.remove();
                          list.insertAdjacentElement("afterend", replacement);
                          if (afterList.children.length > 0) {
                            replacement.insertAdjacentElement("afterend", afterList);
                          }
                          if (list.children.length === 0) {
                            list.remove();
                          }
                        } else {
                          li.replaceWith(replacement);
                        }
                        const nextRange = document.createRange();
                        nextRange.selectNodeContents(replacement);
                        nextRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(nextRange);
                        selectionRangeRef.current = nextRange.cloneRange();
                        setListType(null);
                      }}
                      onInput={(event) => {
                        noteTextTyping(annotation.id);
                        syncTextAnnotationContent(page.id, annotation.id, event.currentTarget);
                        if (textAutoExpandRafRef.current !== null) {
                          window.cancelAnimationFrame(textAutoExpandRafRef.current);
                        }
                        textAutoExpandRafRef.current = window.requestAnimationFrame(() => {
                          textAutoExpandRafRef.current = null;
                          autoExpandTextAnnotation(page.id, annotation.id);
                        });
                        normalizeStrikeMarkup(event.currentTarget);
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          if (event.currentTarget.contains(range.commonAncestorContainer)) {
                            selectionRangeRef.current = range.cloneRange();
                          }
                        }
                        if (pendingTextSizePt) {
                          applyFontSizeToSelection(pendingTextSizePt);
                          setPendingTextSizePt(null);
                        }
                        if (pendingTextColor) {
                          applyTextColorToSelection(pendingTextColor);
                          setPendingTextColor(null);
                        }
                      }}
                      onPaste={() => {
                        window.setTimeout(() => {
                          autoExpandTextAnnotation(page.id, annotation.id);
                          window.requestAnimationFrame(() => {
                            window.requestAnimationFrame(() => {
                              const node = textNodeRefs.current.get(annotation.id);
                              if (node) {
                                normalizeStrikeMarkup(node);
                                normalizeLineHeightMarkup(node);
                              }
                            });
                          });
                        }, 0);
                      }}
                      onFocus={() => {
                        setFocusedTextId(annotation.id);
                        setActiveTextContainerId(annotation.id);
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
                        }
                        const node = textNodeRefs.current.get(annotation.id);
                        if (node) {
                          // no-op for strike overlay
                        }
                        if (pendingTextSizePt) {
                          applyFontSizeToSelection(pendingTextSizePt);
                          setPendingTextSizePt(null);
                        }
                        if (pendingTextColor) {
                          applyTextColorToSelection(pendingTextColor);
                          setPendingTextColor(null);
                        }
                        if (annotation.text === TEXT_PLACEHOLDER) {
                          updateTextAnnotation(page.id, annotation.id, (item) => ({
                            ...item,
                            text: "",
                            richTextHtml: "",
                          }));
                          if (node) {
                            node.innerHTML = "";
                          }
                          if (node) {
                            applyDefaultTextStylesToCaret(node);
                          }
                        } else if (node) {
                          applyDefaultTextStylesToCaret(node);
                        }
                      }}
                      onBlur={(event) => {
                        if (document.activeElement && (document.activeElement as Element).closest("[data-text-popover]")) {
                          requestAnimationFrame(() => {
                            const node = textNodeRefs.current.get(annotation.id);
                            node?.focus();
                          });
                          return;
                        }
                        // no-op for strike overlay
                        if (typingTextTimeoutRef.current) {
                          window.clearTimeout(typingTextTimeoutRef.current);
                          typingTextTimeoutRef.current = null;
                        }
                        setTypingTextId((current) => (current === annotation.id ? null : current));
                        if (activeTextContainerId === annotation.id) {
                          setActiveTextContainerId(null);
                        }
                        const text = event.currentTarget.innerText.replace(/[\u200b\u2060]/g, "").trim();
                        if (!text) {
                          updateTextAnnotation(page.id, annotation.id, (item) => ({
                            ...item,
                            text: TEXT_PLACEHOLDER,
                            richTextHtml: "",
                          }));
                          event.currentTarget.innerHTML = textToHtml(TEXT_PLACEHOLDER);
                        }
                      }}
                      onClick={() => {
                        setFocusedTextId(annotation.id);
                        setActiveTextContainerId(annotation.id);
                      }}
                      ref={(node) => {
                        registerTextNode(annotation.id)(node);
                        if (!node) return;
                        const isActive = focusedTextId === annotation.id || typingTextId === annotation.id;
                        if (!isActive && node.innerHTML !== annotationHtml) {
                          node.innerHTML = annotationHtml;
                        }
                      }}
                      className={`min-w-[80px] min-h-[24px] rounded-none px-2 py-1 text-[12px] leading-snug transition border border-solid border-transparent outline-none focus:outline-none focus-visible:outline-none whitespace-pre-wrap ${
                        annotation.text === TEXT_PLACEHOLDER ? "text-slate-400" : "text-slate-900"
                      } ${
                        focusedTextId === annotation.id || isDraggingThis
                          ? `${isDraggingThis ? "bg-white/80" : "bg-white/70"}`
                          : "bg-transparent"
                      }`}
                      style={{
                        width: "100%",
                        height: "100%",
                        direction: "ltr",
                        backgroundColor: "transparent",
                        overflow: "hidden",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        fontFamily: TEXT_FONT_OPTIONS[textFont].cssFamily,
                        fontSize: `${displayFontSize}px`,
                        lineHeight: `${lineSpacing}`,
                        textTransform,
                        textAlign: textAlign,
                      }}
                    />
                    {/* Native strikethrough only; overlay removed */}
                    {showTextActions ? (
                      isDraggingThis ? (
                        <div
                          className="absolute flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white/85 text-slate-700 shadow-sm"
                          style={{ left: "50%", top: "-2.5rem", transform: "translateX(-50%)" }}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200/80">
                            <Move className="h-4 w-4" />
                          </span>
                        </div>
                      ) : (
                        <div
                          className="absolute flex w-max items-center gap-0.5 rounded-lg border border-slate-300 bg-white/85 px-1 py-0.5 opacity-80 shadow-sm transition-opacity hover:opacity-100"
                          style={{ left: "50%", top: "-2.5rem", transform: "translateX(-50%)" }}
                        >
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 active:translate-y-[1px]"
                            onPointerDown={(event) => {
                              focusTextAnnotation(annotation.id);
                              startTextDrag(page.id, annotation.id, event);
                            }}
                          >
                            <Move className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-300/80" />
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 active:translate-y-[1px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateTextAnnotation(page.id, annotation.id);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-300/80" />
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 active:translate-y-[1px]"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteTextAnnotation(page.id, annotation.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    ) : null}
                    {showResizeHandles ? (
                      <>
                        <div
                          className="absolute h-4 w-4 cursor-nwse-resize"
                          style={{ left: "0%", top: "0%", transform: "translate(-50%, -50%)" }}
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "nw", event);
                          }}
                        />
                        <div
                          className="absolute h-4 w-4 cursor-nesw-resize"
                          style={{ left: "100%", top: "0%", transform: "translate(50%, -50%)" }}
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "ne", event);
                          }}
                        />
                        <div
                          className="absolute h-4 w-4 cursor-nesw-resize"
                          style={{ left: "0%", top: "100%", transform: "translate(-50%, 50%)" }}
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "sw", event);
                          }}
                        />
                        <div
                          className="absolute h-4 w-4 cursor-nwse-resize"
                          style={{ left: "100%", top: "100%", transform: "translate(50%, 50%)" }}
                          onPointerDown={(event) => {
                            focusTextAnnotation(annotation.id);
                            startTextResize(page.id, annotation.id, "se", event);
                          }}
                        />
                      </>
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
        lineStyle: stroke.lineStyle,
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
      const current = draftHighlightRef.current;
      if (current) {
        const path = draftHighlightPathMapRef.current.get(current.pageId);
        if (path) {
          path.setAttribute("d", "");
          path.style.display = "none";
        }
      }
      draftHighlightRef.current = null;
      draftHighlightLivePathRef.current = null;
      if (draftHighlightLiveRafRef.current !== null) {
        window.cancelAnimationFrame(draftHighlightLiveRafRef.current);
        draftHighlightLiveRafRef.current = null;
      }
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
      rectHeight: rect.height,
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
    return (node: HTMLDivElement | null) => {
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

  function autoExpandTextAnnotation(pageId: string, id: string) {
    const element = textNodeRefs.current.get(id);
    if (!element) return;
    const node = previewNodeMap.current.get(pageId);
    if (!node) return;
    const containerRect = node.getBoundingClientRect();
    if (!containerRect.height) return;
    const nextHeight = clamp(element.scrollHeight / containerRect.height, 0.015, 1);
    const EPSILON = 0.0005;
    setTextAnnotations((prev) => {
      const existing = prev[pageId] ?? [];
      const current = existing.find((item) => item.id === id);
      if (!current) return prev;
      const maxHeight = 1 - current.y;
      const targetHeight = clamp(nextHeight, 0.015, maxHeight);
      const currentHeight = current.height ?? 0;
      if (targetHeight <= currentHeight + EPSILON) return prev;
      const updated = existing.map((item) =>
        item.id === id ? { ...item, height: targetHeight } : item
      );
      return { ...prev, [pageId]: updated };
    });
  }

  useLayoutEffect(() => {
    if (!focusedTextId) return;
    const pageId = Object.keys(textAnnotations).find((id) =>
      textAnnotations[id]?.some((item) => item.id === focusedTextId)
    );
    if (!pageId) return;
    autoExpandTextAnnotation(pageId, focusedTextId);
  }, [
    focusedTextId,
    textAnnotations,
    activeTextSize,
    textBold,
    textItalic,
    textUnderline,
    textAlign,
    textTransform,
    textFont,
  ]);

  function deleteTextAnnotation(pageId: string, id: string) {
    setTextAnnotations((prev) => {
      const existing = prev[pageId] ?? [];
      return { ...prev, [pageId]: existing.filter((item) => item.id !== id) };
    });
    setFocusedTextId((current) => (current === id ? null : current));
  }

  const duplicateTextAnnotation = useCallback((pageId: string, id: string) => {
    const newId = crypto.randomUUID();
    setTextAnnotations((prev) => {
      const existing = prev[pageId] ?? [];
      const current = existing.find((item) => item.id === id);
      if (!current) return prev;
      const width = current.width ?? 0.14;
      const height = current.height ?? 0.06;
      const offset = 0.015;
      const nextX = clamp(current.x + offset, 0, 1 - width);
      const nextY = clamp(current.y + offset, 0, 1 - height);
      return {
        ...prev,
        [pageId]: [
          ...existing,
          {
            ...current,
            id: newId,
            x: nextX,
            y: nextY,
          },
        ],
      };
    });
    setFocusedTextId(newId);
  }, []);

  const duplicateShape = useCallback((pageId: string, id: string) => {
    const newId = crypto.randomUUID();
    setShapesByPage((prev) => {
      const existing = prev[pageId] ?? [];
      const current = existing.find((shape) => shape.id === id);
      if (!current) return prev;
      const offset = 0.015;
      const { minX, minY, w, h } = shapeBounds(current);
      const nextMinX = clamp(minX + offset, 0, 1 - w);
      const nextMinY = clamp(minY + offset, 0, 1 - h);
      const deltaX = nextMinX - minX;
      const deltaY = nextMinY - minY;
      const nextShape: ShapeAnnotation = {
        ...current,
        id: newId,
        start: { x: current.start.x + deltaX, y: current.start.y + deltaY },
        end: { x: current.end.x + deltaX, y: current.end.y + deltaY },
      };
      return {
        ...prev,
        [pageId]: [...existing, nextShape],
      };
    });
    setFocusedShapeId(newId);
    setFocusedShapePageId(pageId);
  }, []);

  const itemsIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const isLoadingPages = loading && pages.length === 0;
  const downloadDisabled = busy || pages.length === 0 || isLoadingPages;
	  const activePageIndex = activePageIndexState >= 0 && activePageIndexState < pages.length ? activePageIndexState : -1;
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
      if (mode === "shapes") {
        setShapeType(null);
      }
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
  const applyTextSize = useCallback(
    (next: number) => {
      const normalized = normalizeTextSize(next);
      setTextSize(normalized);
      const applied = applyFontSizeToSelection(normalized);
      if (!applied) {
        setPendingTextSizePt(normalized);
      } else {
        setPendingTextSizePt(null);
      }
      if (focusedTextId) setSelectionFontSizePt(normalized);
    },
    [applyFontSizeToSelection, focusedTextId]
  );
  const applyTextColor = useCallback(
    (color: string) => {
      setTextColor(color);
      setShapeColor(color);
      const applied = applyTextColorToSelection(color);
      if (!applied) {
        setPendingTextColor(color);
      } else {
        setPendingTextColor(null);
      }
    },
    [applyTextColorToSelection]
  );
  const applyShapeBorderColor = useCallback(
    (color: string) => {
      setShapeColor(color);
      setTextColor(color);
      if (!focusedShapeId || !focusedShapePageId) return;
      setShapesByPage((prev) => {
        const list = prev[focusedShapePageId] ?? [];
        const updated = list.map((shape) => (shape.id === focusedShapeId ? { ...shape, color } : shape));
        return { ...prev, [focusedShapePageId]: updated };
      });
    },
    [focusedShapeId, focusedShapePageId]
  );
  const applyShapeFillColor = useCallback(
    (color: string | null) => {
      setShapeFillColor(color);
      if (!focusedShapeId || !focusedShapePageId) return;
      setShapesByPage((prev) => {
        const list = prev[focusedShapePageId] ?? [];
        const updated = list.map((shape) =>
          shape.id === focusedShapeId ? { ...shape, fillColor: color } : shape
        );
        return { ...prev, [focusedShapePageId]: updated };
      });
    },
    [focusedShapeId, focusedShapePageId]
  );
  const applyShapeLineStyle = useCallback(
    (style: LineStyle) => {
      setShapeLineStyle(style);
      if (!focusedShapeId || !focusedShapePageId) return;
      if (focusedShape?.type === "check" || focusedShape?.type === "arrow") return;
      setShapesByPage((prev) => {
        const list = prev[focusedShapePageId] ?? [];
        const updated = list.map((shape) =>
          shape.id === focusedShapeId ? { ...shape, lineStyle: style } : shape
        );
        return { ...prev, [focusedShapePageId]: updated };
      });
    },
    [focusedShape, focusedShapeId, focusedShapePageId]
  );
  const normalizeShapeThickness = useCallback(
    (value: number) => clamp(Math.round(value), MIN_SHAPE_THICKNESS, MAX_SHAPE_THICKNESS),
    [MIN_SHAPE_THICKNESS, MAX_SHAPE_THICKNESS]
  );
  const applyPenThickness = useCallback((value: number) => {
    const normalized = clamp(Math.round(value), 1, 10);
    setPenThickness(normalized);
  }, []);
  const applyPenOpacity = useCallback((value: number) => {
    const normalized = clamp(value, 0.1, 1);
    setPenOpacity(normalized);
  }, []);
  const applyShapeThickness = useCallback(
    (value: number) => {
      const normalized = normalizeShapeThickness(value);
      setShapeThickness(normalized);
      if (!focusedShapeId || !focusedShapePageId) return;
      const node = previewNodeMap.current.get(focusedShapePageId);
      const rect = node?.getBoundingClientRect();
      if (!rect?.width) return;
      const normalizedThickness = normalized / (rect.width / zoomMultiplier);
      setShapesByPage((prev) => {
        const list = prev[focusedShapePageId] ?? [];
        const updated = list.map((shape) =>
          shape.id === focusedShapeId ? { ...shape, thickness: normalizedThickness } : shape
        );
        return { ...prev, [focusedShapePageId]: updated };
      });
    },
    [focusedShapeId, focusedShapePageId, normalizeShapeThickness, zoomMultiplier]
  );
  const resolvePickerColor = useCallback(
    (target: "text" | "shape-border" | "shape-fill" | "pen") => {
      if (target === "text") {
        return selectionTextColorMixed ? textColor : activeTextColor ?? textColor;
      }
      if (target === "shape-border") {
        return activeShapeBorderColor ?? textColor;
      }
      if (target === "shape-fill") {
        return activeShapeFillColor ?? activeShapeBorderColor ?? textColor;
      }
      return penColor;
    },
    [activeShapeBorderColor, activeShapeFillColor, activeTextColor, penColor, selectionTextColorMixed, textColor]
  );
  const openColorPickerFor = useCallback(
    (target: "text" | "shape-border" | "shape-fill" | "pen") => {
      const current = resolvePickerColor(target);
      setColorPickerDraft(current || "#111827");
      setHighlightCustomOpen(false);
      setColorPickerOpen(target);
    },
    [resolvePickerColor]
  );
  const pickColorFromScreen = useCallback(async (target: "text" | "shape-border" | "shape-fill" | "pen") => {
    if (typeof window === "undefined") return;
    const EyeDropperCtor = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper;
    if (!EyeDropperCtor) {
      setHighlightCustomOpen(true);
      return;
    }
    try {
      hideToolbarTooltip();
      setColorPickerOpen(null);
      const result = await new EyeDropperCtor().open();
      if (result?.sRGBHex) {
        addCustomTextColor(result.sRGBHex);
        setColorPickerDraft(result.sRGBHex);
        setHighlightCustomOpen(true);
        setColorPickerOpen(target);
      }
    } catch {
      // User canceled the picker.
    }
  }, [addCustomTextColor]);
  const applyColorFromPicker = useCallback(
    (color: string | null) => {
      if (!colorPickerOpen) return;
      if (colorPickerOpen === "text" && color) {
        applyTextColor(color);
        setColorPickerOpen(null);
        restoreTextSelectionSoon();
        return;
      }
      if (colorPickerOpen === "shape-border" && color) {
        applyShapeBorderColor(color);
        setColorPickerOpen(null);
        return;
      }
      if (colorPickerOpen === "shape-fill") {
        applyShapeFillColor(color);
        setColorPickerOpen(null);
        return;
      }
      if (colorPickerOpen === "pen" && color) {
        setPenColor(color);
        setColorPickerOpen(null);
      }
    },
    [applyShapeBorderColor, applyShapeFillColor, applyTextColor, colorPickerOpen, restoreTextSelectionSoon]
  );
  const handleColorPickerMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!isTextColorPicker) return;
      keepTextEditingActive(event);
    },
    [isTextColorPicker, keepTextEditingActive]
  );
  useEffect(() => {
    if (!highlightCustomOpen) return;
    const rgb = hexToRgb(colorPickerDraft);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r * 255, rgb.g * 255, rgb.b * 255);
    setHighlightCustomHue(hsv.h);
    setHighlightCustomSat(hsv.s);
    setHighlightCustomVal(hsv.v);
  }, [colorPickerDraft, highlightCustomOpen]);
  const updateHighlightCustomColor = useCallback((nextHue: number, nextSat: number, nextVal: number) => {
    setHighlightCustomHue(nextHue);
    setHighlightCustomSat(nextSat);
    setHighlightCustomVal(nextVal);
    setColorPickerDraft(hsvToHex(nextHue, nextSat, nextVal));
  }, []);
  const updateHighlightPlaneFromEvent = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const nextSat = Math.round(x * 100);
      const nextVal = Math.round((1 - y) * 100);
      updateHighlightCustomColor(highlightCustomHue, nextSat, nextVal);
    },
    [highlightCustomHue, updateHighlightCustomColor]
  );
  const handleHighlightPlanePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      updateHighlightPlaneFromEvent(event);
    },
    [updateHighlightPlaneFromEvent]
  );
  const handleHighlightPlanePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.buttons !== 1) return;
      updateHighlightPlaneFromEvent(event);
    },
    [updateHighlightPlaneFromEvent]
  );
  const handleHighlightPlanePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release errors.
    }
  }, []);
  const handleHighlightRgbChange = useCallback(
    (channel: "r" | "g" | "b", value: string) => {
      if (!value.trim()) return;
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      const nextValue = clamp(numeric, 0, 255);
      const nextRgb = { ...highlightCustomRgb, [channel]: nextValue };
      setColorPickerDraft(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
    },
    [highlightCustomRgb]
  );
  const stepTextSize = useCallback(
    (direction: 1 | -1) => {
      if (focusedTextId) {
        const element = textNodeRefs.current.get(focusedTextId);
        const range = selectionRangeRef.current;
        if (element && range && element.contains(range.commonAncestorContainer) && !range.collapsed) {
          const applied = applyFontSizeDeltaToSelection(direction);
          if (applied) return;
        }
      }
      applyTextSize(activeTextSize + direction);
    },
    [activeTextSize, applyFontSizeDeltaToSelection, applyTextSize, focusedTextId]
  );
  const showToolbarTooltip = useCallback((label: string, target: HTMLElement) => {
    if (label === "Font" && fontMenuOpen) return;
    if (label === "Align" && alignMenuOpen) return;
    if (label === "Line spacing" && lineSpacingMenuOpen) return;
    if (label === "Line style" && (lineStyleMenuOpen || shapeLineStyleMenuOpen)) return;
    const rect = target.getBoundingClientRect();
    const toolbarRect = target.closest("[data-text-toolbar]")?.getBoundingClientRect();
    const baseY = toolbarRect ? toolbarRect.bottom - 6 : rect.bottom - 6;
    toolbarTooltipTargetRef.current = target;
    setToolbarTooltip({
      label,
      x: rect.left + rect.width / 2,
      y: baseY + 8,
      visible: true,
    });
  }, [fontMenuOpen, alignMenuOpen, lineSpacingMenuOpen, lineStyleMenuOpen, shapeLineStyleMenuOpen]);
  const hideToolbarTooltip = useCallback(() => {
    setToolbarTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);
  const applyTextAlignment = useCallback(
    (nextAlign: "left" | "center" | "right" | "justify") => {
      setTextAlign(nextAlign);
      setAlignMenuOpen(false);
      hideToolbarTooltip();
    },
    [hideToolbarTooltip]
  );
  useEffect(() => {
    if (!toolbarTooltip.visible) return;
    const updatePosition = () => {
      const target = toolbarTooltipTargetRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setToolbarTooltip((prev) =>
        prev.visible
          ? { ...prev, x: rect.left + rect.width / 2, y: rect.bottom + 8 }
          : prev
      );
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [toolbarTooltip.visible]);
  const signaturePlacementCount = useMemo(
    () => Object.values(signaturePlacements).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [signaturePlacements]
  );
  const imagePlacementCount = useMemo(() => {
    return Object.values(signaturePlacements).reduce((sum, list) => {
      if (!list) return sum;
      return (
        sum +
        list.reduce((innerSum, item) => (item.signatureId.startsWith("image-") ? innerSum + 1 : innerSum), 0)
      );
    }, 0);
  }, [signaturePlacements]);
  const hasAnyTextAnnotations = textAnnotationCount > 0;
  const hasAnyAnnotations = highlightCount > 0 || shapeCount > 0 || hasAnyTextAnnotations || signaturePlacementCount > 0;
  useEffect(() => {
    setTextSizeInput((current) =>
      document.activeElement?.getAttribute("aria-label") === "Text size" ? current : `${activeTextSize}`
    );
  }, [activeTextSize]);
  useEffect(() => {
    setShapeThicknessInput((current) =>
      document.activeElement?.getAttribute("aria-label") === "Thickness"
        ? current
        : `${Math.round(shapeThickness)}`
    );
  }, [shapeThickness]);
  useEffect(() => {
    setPenThicknessInput((current) =>
      document.activeElement?.getAttribute("aria-label") === "Stroke thickness"
        ? current
        : `${Math.round(penThickness)}`
    );
  }, [penThickness]);
  useEffect(() => {
    setPenOpacityInput((current) =>
      document.activeElement?.getAttribute("aria-label") === "Stroke opacity"
        ? current
        : `${Math.round(penOpacity * 100)}`
    );
  }, [penOpacity]);
  useEffect(() => {
    if (!focusedShapeId || !focusedShapePageId || !focusedShape) return;
    setShapeColor(focusedShape.color);
    setShapeFillColor(focusedShape.fillColor ?? null);
    setShapeLineStyle(
      focusedShape.type === "check" || focusedShape.type === "arrow" ? "solid" : focusedShape.lineStyle ?? "solid"
    );
    const node = previewNodeMap.current.get(focusedShapePageId);
    const rect = node?.getBoundingClientRect();
    if (!rect?.width) return;
    const nextThickness = clamp(
      Math.round(focusedShape.thickness * (rect.width / zoomMultiplier)),
      MIN_SHAPE_THICKNESS,
      MAX_SHAPE_THICKNESS
    );
    setShapeThickness(nextThickness);
  }, [focusedShape, focusedShapeId, focusedShapePageId, MAX_SHAPE_THICKNESS, MIN_SHAPE_THICKNESS, zoomMultiplier]);
  useEffect(() => {
    if (!focusedShapeId || focusedShape) return;
    setFocusedShapeId(null);
    setFocusedShapePageId(null);
  }, [focusedShape, focusedShapeId]);
  useEffect(() => {
    setTextAnnotations((prev) => {
      let updated = false;
      const next = { ...prev };
      Object.entries(prev).forEach(([pageId, list]) => {
        let changed = false;
        const nextList = list.map((item) => {
          let nextItem = item;
          if (typeof item.textSizePt !== "number") {
            changed = true;
            updated = true;
            nextItem = { ...nextItem, textSizePt: textSize };
          }
          if (typeof nextItem.lineSpacing !== "number") {
            changed = true;
            updated = true;
            nextItem = { ...nextItem, lineSpacing: DEFAULT_TEXT_LINE_SPACING };
          }
          return nextItem;
        });
        if (changed) {
          next[pageId] = nextList;
        }
      });
      return updated ? next : prev;
    });
  }, [textAnnotations, textSize]);
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
        thumb: page.thumb,
        preview: page.preview,
      })),
      highlights,
      shapesByPage,
      textAnnotations,
        textSizePt: textSize,
        textColor,
        textUnderline,
        textTransform,
        textAlign,
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
      textSize,
      textColor,
      textUnderline,
      textTransform,
      textAlign,
    signaturePlacements,
    savedSignatures,
  ]);

  useEffect(() => {
    if (!authSession?.user) return;
    if (!hasWorkspaceData) return;
    if (draggingText || resizingText || draggingShape || draftHighlight) return;
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
  }, [
    authSession?.user,
    buildCloudProjectData,
    hasWorkspaceData,
    projectName,
    saveProject,
    draggingText,
    resizingText,
    draggingShape,
    draftHighlight,
  ]);

	  const computeBaseScale = useCallback(() => {
	    const container = previewContainerRef.current;
	    const pageList = pagesRef.current;
	    if (!container || pageList.length === 0) return;
	    const targetIndex = activePageIndexRef.current >= 0 ? activePageIndexRef.current : 0;
	    const targetPage = pageList[targetIndex] ?? pageList[0];
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

		    const documentScale = PT_TO_PX;
		    // Default zoom: fit-to-width (still leaving side space).
		    const fitWidthScale = Math.max(0.2, (availableWidth / baseWidth) * fitPadding);
		    const desiredZoomPercent = clamp(
		      Math.round((fitWidthScale / documentScale) * 100),
		      ZOOM_MIN_PERCENT,
		      ZOOM_MAX_PERCENT,
		    );

		    if (!userAdjustedZoom) {
		      setZoomPercent((prev) => (prev === desiredZoomPercent ? prev : desiredZoomPercent));
		    }
		    setBaseScale((prev) => (Math.abs(prev - documentScale) > 0.001 ? documentScale : prev));
	  }, [pageIdSignature, userAdjustedZoom]);

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

  const applyDraftHighlightStyle = useCallback((draft: DraftHighlight, path: SVGPathElement) => {
    const tool = draft.tool === "pencil" ? "pen" : draft.tool;
    const baseWidth = Math.max(1, draft.thickness * 1000);
    const isHighlight = tool === "highlight";
    const cap = isHighlight ? "butt" : "round";
    const join = isHighlight ? "miter" : "round";
    const opacity = isHighlight ? draft.opacity ?? 0.35 : draft.opacity ?? 1;
    const isDashed = !isHighlight && draft.lineStyle === "dashed";
    const dash = Math.max(6, baseWidth * 1.6);
    const gap = Math.max(4, baseWidth * 1.2);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", draft.color);
    path.setAttribute("stroke-width", String(isHighlight ? baseWidth * 1.2 : baseWidth));
    path.setAttribute("stroke-linecap", cap);
    path.setAttribute("stroke-linejoin", join);
    path.setAttribute("stroke-opacity", `${opacity}`);
    if (isDashed) {
      path.setAttribute("stroke-dasharray", `${dash} ${gap}`);
    } else {
      path.removeAttribute("stroke-dasharray");
    }
    path.style.pointerEvents = "none";
    path.style.mixBlendMode = isHighlight ? "multiply" : "";
  }, []);

  const scheduleDraftHighlightLiveRender = useCallback(() => {
    if (draftHighlightLiveRafRef.current !== null) return;
    draftHighlightLiveRafRef.current = window.requestAnimationFrame(() => {
      draftHighlightLiveRafRef.current = null;
      const live = draftHighlightLivePathRef.current;
      if (!live) return;
      const path = draftHighlightPathMapRef.current.get(live.pageId);
      if (!path) return;
      path.setAttribute("d", live.d);
      path.style.display = "";
    });
  }, []);

  const clearDraftHighlightPath = useCallback((pageId: string) => {
    const path = draftHighlightPathMapRef.current.get(pageId);
    if (!path) return;
    path.setAttribute("d", "");
    path.style.display = "none";
  }, []);
  useEffect(() => {
    if (draftHighlight) return;
    const current = draftHighlightRef.current;
    if (current) {
      clearDraftHighlightPath(current.pageId);
    }
    draftHighlightRef.current = null;
  }, [clearDraftHighlightPath, draftHighlight]);

  useEffect(() => {
    return () => {
      if (draftHighlightLiveRafRef.current !== null) {
        window.cancelAnimationFrame(draftHighlightLiveRafRef.current);
        draftHighlightLiveRafRef.current = null;
      }
    };
  }, []);

  function handleShapePointerDown(pageId: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (!shapeType) return;
    const point = getPointerPoint(event, { requireInside: true, clampToBounds: true });
    if (!point) return;
    const lineStyle = shapeType === "check" || shapeType === "arrow" ? "solid" : shapeLineStyle;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraftShape({
      pageId,
      type: shapeType,
      start: { x: point.x, y: point.y },
      end: { x: point.x, y: point.y },
      color: shapeColor,
      fillColor: shapeFillColor,
      thickness: shapeThickness / (point.rectWidth / zoomMultiplier),
      lineStyle,
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
      fillColor: draftShape.fillColor ?? null,
      thickness: draftShape.thickness,
      lineStyle: draftShape.lineStyle ?? "solid",
    };
    setShapesByPage((prev) => {
      const list = prev[pageId] ? [...prev[pageId]] : [];
      list.push(shape);
      return { ...prev, [pageId]: list };
    });
    setFocusedShapeId(shape.id);
    setFocusedShapePageId(pageId);
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
    if (
      !event.target ||
      !(event.target as HTMLElement).closest("[data-text-annotation], [data-shape-annotation]")
    ) {
      clearTextFocus();
      clearShapeFocus();
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
        rectWidth: point.rectWidth,
        rectHeight: point.rectHeight,
      });
      event.preventDefault();
      return;
    }
    strokeOutsidePageRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const baseThickness = tool === "highlight" ? highlightThickness : penThickness;
    const startPoint = { x: point.x, y: point.y };
    let seedPoints = [startPoint];
    if (tool !== "highlight") {
      const epsilon = 0.0002;
      const bumpedX =
        startPoint.x + epsilon <= 1
          ? startPoint.x + epsilon
          : startPoint.x - epsilon >= 0
            ? startPoint.x - epsilon
            : startPoint.x;
      seedPoints = [startPoint, { x: bumpedX, y: startPoint.y }];
    }
    const draft: DraftHighlight = {
      tool,
      pageId,
      points: seedPoints,
      color: tool === "highlight" ? HIGHLIGHT_COLORS[highlightColor] : penColor,
      opacity: tool === "highlight" ? highlightOpacity : penOpacity,
      thickness: baseThickness / point.rectWidth,
      lineStyle: tool === "highlight" ? "solid" : penLineStyle,
    };
    draftHighlightRef.current = draft;
    setDraftHighlight(draft);
    const path = draftHighlightPathMapRef.current.get(pageId);
    if (path) {
      applyDraftHighlightStyle(draft, path);
      const x = startPoint.x * 1000;
      const y = startPoint.y * 1000;
      const d = tool === "highlight" ? `M ${x} ${y}` : `M ${x} ${y} L ${x} ${y}`;
      draftHighlightLivePathRef.current = { pageId, d, last: startPoint };
      path.setAttribute("d", d);
      path.style.display = "";
    }
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
        const current = draftHighlightRef.current;
        if (current && current.pageId === pageId) {
          const nextPoints = [...current.points];
          let boundary: Point | null = null;
          for (let i = nextPoints.length - 1; i >= 0; i--) {
            const candidate = nextPoints[i];
            if (candidate && !candidate.move) {
              boundary = intersectUnitSquareBoundary(candidate, point, false);
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
          draftHighlightRef.current = { ...current, points: nextPoints };
          const live = draftHighlightLivePathRef.current;
          if (live && live.pageId === pageId && boundary) {
            live.d += ` L ${boundary.x * 1000} ${boundary.y * 1000}`;
            live.last = { x: boundary.x, y: boundary.y };
            scheduleDraftHighlightLiveRender();
          }
        }
      }
      return;
    }

    if (strokeOutsidePageRef.current) {
      strokeOutsidePageRef.current = false;
      const outside = lastOutsideRawRef.current;
      lastOutsideRawRef.current = null;
      const current = draftHighlightRef.current;
      if (current && current.pageId === pageId) {
        const nextPoints = [...current.points];
        const boundary = outside ? intersectUnitSquareBoundary(outside, point, true) : null;
        nextPoints.push({
          x: boundary?.x ?? clamp(point.x, 0, 1),
          y: boundary?.y ?? clamp(point.y, 0, 1),
          move: true,
        });
        nextPoints.push({ x: point.x, y: point.y });
        draftHighlightRef.current = {
          ...current,
          points: nextPoints,
          thickness: (current.tool === "highlight" ? highlightThickness : penThickness) / point.rectWidth,
          opacity: current.tool === "highlight" ? highlightOpacity : penOpacity,
        };
        const live = draftHighlightLivePathRef.current;
        if (live && live.pageId === pageId) {
          const mx = boundary?.x ?? clamp(point.x, 0, 1);
          const my = boundary?.y ?? clamp(point.y, 0, 1);
          live.d += ` M ${mx * 1000} ${my * 1000}`;
          live.last = { x: mx, y: my };
          scheduleDraftHighlightLiveRender();
        }
      }
      event.preventDefault();
      return;
    }

    const current = draftHighlightRef.current;
    if (current && current.pageId === pageId) {
      const nextPoints = [...current.points];
      const last = nextPoints[nextPoints.length - 1];
      const distanceThreshold = current.tool === "highlight" ? 0.004 : 0.0015;
      if (!last || pointDistance(last, { x: point.x, y: point.y }) > distanceThreshold) {
        nextPoints.push({ x: point.x, y: point.y });
      }
      draftHighlightRef.current = {
        ...current,
        points: nextPoints,
        thickness: (current.tool === "highlight" ? highlightThickness : penThickness) / point.rectWidth,
        opacity: current.tool === "highlight" ? highlightOpacity : penOpacity,
      };
      const live = draftHighlightLivePathRef.current;
      if (live && live.pageId === pageId) {
        const lastLive = live.last ?? { x: point.x, y: point.y };
        const midX = (lastLive.x + point.x) / 2;
        const midY = (lastLive.y + point.y) / 2;
        live.d += ` Q ${lastLive.x * 1000} ${lastLive.y * 1000} ${midX * 1000} ${midY * 1000}`;
        live.last = { x: point.x, y: point.y };
        scheduleDraftHighlightLiveRender();
      }
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
        const isClick = widthDelta < 0.005 && heightDelta < 0.005;
        const width = isClick
          ? Math.min(TEXT_DEFAULT_WIDTH_PX / draftTextBox.rectWidth, 1)
          : Math.max(widthDelta, 0.04);
        const height = isClick
          ? Math.min(TEXT_DEFAULT_HEIGHT_PX / draftTextBox.rectHeight, 1)
          : Math.max(heightDelta, 0.03);
        const x = isClick
          ? clamp(draftTextBox.startX, 0, 1 - width)
          : Math.min(draftTextBox.startX, draftTextBox.currentX);
        const y = isClick
          ? clamp(draftTextBox.startY, 0, 1 - height)
          : Math.min(draftTextBox.startY, draftTextBox.currentY);
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
                textSizePt: textSize,
                lineSpacing: DEFAULT_TEXT_LINE_SPACING,
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
    const current = draftHighlightRef.current;
    if (current && current.pageId === pageId) {
      commitDraftHighlight(current);
    }
    draftHighlightRef.current = null;
    draftHighlightLivePathRef.current = null;
    setDraftHighlight(null);
    clearDraftHighlightPath(pageId);
  }

  function handlePageStep(direction: 1 | -1) {
    if (isLoadingPages) return;
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

  const handleSaveUploadedImage = useCallback(async () => {
    if (!imageUploadPreview) {
      setImageUploadError("Upload an image file first.");
      return;
    }
    const { width, height } = await loadImageDimensions(imageUploadPreview);
    const imageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? `image-${crypto.randomUUID()}` : `image-${Date.now()}`;
    const signatureLike: SavedSignature = {
      id: imageId,
      name: imageUploadName.trim() || `Image ${imagePlacementCount + 1}`,
      dataUrl: imageUploadPreview,
      naturalWidth: width,
      naturalHeight: height,
      createdAt: Date.now(),
    };
    setShowImageUploadModal(false);
    setImageUploadPreview(null);
    setImageUploadName("");
    setImageUploadError(null);
    applySignatureToActivePage(signatureLike);
  }, [
    applySignatureToActivePage,
    imagePlacementCount,
    imageUploadName,
    imageUploadPreview,
    loadImageDimensions,
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

  const handleCloseImageUploadModal = useCallback(() => {
    setShowImageUploadModal(false);
    setImageUploadPreview(null);
    setImageUploadName("");
    setImageUploadError(null);
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

  const handleOpenImageUpload = useCallback(() => {
    setShowSignatureHub(false);
    setShowImageUploadModal(true);
    setImageUploadPreview(null);
    setImageUploadName("");
    setImageUploadError(null);
  }, []);

  const handleImageUploadFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImageUploadPreview(result);
        setImageUploadError(null);
      }
    };
    reader.onerror = () => {
      setImageUploadError("Could not read that file. Try a PNG, JPG, or SVG.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddStickyNote = useCallback(() => {
    const pageId = activePageId || pages[0]?.id;
    if (!pageId) return;
    const pageIndex = pages.findIndex((p) => p.id === pageId);
    const width = 0.22;
    const height = 0.14;
    const x = clamp(0.5 - width / 2, 0, 1 - width);
    const y = clamp(0.5 - height / 2, 0, 1 - height);
    const annotationId = crypto.randomUUID();
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
            textSizePt: textSize,
            lineSpacing: DEFAULT_TEXT_LINE_SPACING,
          },
        ],
      };
    });
    setFocusedTextId(annotationId);
  }, [activePageId, pages]);

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
      async function getDownloadFont(variant: TextFontVariant) {
        const config = TEXT_FONT_OPTIONS[textFont];
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
	              const baseOpacity = tool === "highlight" ? (stroke.opacity ?? 0.35) : stroke.opacity ?? 1;
	              const dashed = tool !== "highlight" && stroke.lineStyle === "dashed";
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
	                  ...(dashed ? { dashArray: [baseThickness * 2.5, baseThickness * 1.5] } : {}),
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
              const fillColorValue = shape.fillColor ? hexToRgb(shape.fillColor) : null;
              const thickness = Math.max(1, shape.thickness * pageWidth);
              const allowDashed = shape.type !== "check" && shape.type !== "arrow";
              const isDashed = allowDashed && shape.lineStyle === "dashed";
              const dashArray = isDashed ? [thickness * 2.5, thickness * 1.5] : undefined;
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
                  ...(dashArray ? { dashArray } : {}),
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
                      ...(fillColorValue
                        ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
                        : {}),
	                    borderWidth: thickness,
	                    borderColor: strokeColor,
	                    borderOpacity: 1,
	                    ...(dashArray ? { borderDashArray: dashArray } : {}),
	                    borderLineCap: LineCapStyle.Round,
	                  });
	                  break;
	                case "ellipse":
	                  copied.drawEllipse({
	                    x: minX + w / 2,
	                    y: minY + h / 2,
	                    xScale: w / 2,
	                    yScale: h / 2,
                      ...(fillColorValue
                        ? { color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b) }
                        : {}),
	                    borderWidth: thickness,
	                    borderColor: strokeColor,
	                    borderOpacity: 1,
	                    ...(dashArray ? { borderDashArray: dashArray } : {}),
	                    borderLineCap: LineCapStyle.Round,
	                  });
	                  break;
	                case "triangle": {
	                  const top = { x: minX + w / 2, y: maxY };
	                  const left = { x: minX, y: minY };
	                  const right = { x: maxX, y: minY };
                    if (fillColorValue) {
                      copied.drawSvgPath(`M ${top.x} ${top.y} L ${right.x} ${right.y} L ${left.x} ${left.y} Z`, {
                        color: rgb(fillColorValue.r, fillColorValue.g, fillColorValue.b),
                        borderColor: strokeColor,
                        borderWidth: thickness,
                        borderOpacity: 1,
                        ...(dashArray ? { borderDashArray: dashArray } : {}),
                      });
                    } else {
                      drawLineSegment(top, right);
                      drawLineSegment(right, left);
                      drawLineSegment(left, top);
                    }
	                  break;
	                }
	                case "x":
	                  drawLineSegment({ x: minX, y: minY }, { x: maxX, y: maxY });
	                  drawLineSegment({ x: maxX, y: minY }, { x: minX, y: maxY });
	                  break;
                case "check": {
                  const p1 = { x: minX + w * 0.0, y: minY + h * 0.62 };
                  const p2 = { x: minX + w * 0.32, y: minY + h * 0.9 };
                  const p3 = { x: minX + w * 1.0, y: minY + h * 0.12 };
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
	          const fontCache = new Map<TextFontVariant, PDFFont>();
	          const getFontForVariant = async (variant: TextFontVariant) => {
	            const cached = fontCache.get(variant);
	            if (cached) return cached;
	            const embedded = await getDownloadFont(variant);
	            fontCache.set(variant, embedded);
	            return embedded;
	          };
	          const { width: pageWidth, height: pageHeight } = copied.getSize();
          const defaultTextColorValue = hexToRgb(textColor) ?? { r: 0.13, g: 0.15, b: 0.18 };
          const defaultTextColor = rgb(defaultTextColorValue.r, defaultTextColorValue.g, defaultTextColorValue.b);
          for (const annotation of pageTexts) {
            const content = annotation.text;
            if (!content || content === TEXT_PLACEHOLDER) continue;
            const boxWidth = (annotation.width ?? 0.14) * pageWidth;
            const padding = Math.min(6, boxWidth * 0.05);
            const x = annotation.x * pageWidth + padding;
            const startY = pageHeight - annotation.y * pageHeight - padding;
            let cursorY = startY;
            const html = annotation.richTextHtml ?? textToHtml(annotation.text);
            const baseSize = annotation.textSizePt ?? textSize;
            const lineSpacing = annotation.lineSpacing ?? DEFAULT_TEXT_LINE_SPACING;
            const runs = extractRichTextRuns(html, baseSize);
            const lines = splitRunsIntoLines(runs);
            const rotation = annotation.rotation ?? 0;
            const rotationRadians = (rotation * Math.PI) / 180;
            const variants = new Set<TextFontVariant>();
            runs.forEach((run) => {
              variants.add(resolveFontVariant(!!run.bold, !!run.italic));
            });
            for (const variant of variants) {
              await getFontForVariant(variant);
            }
            lines.forEach((line, lineIndex) => {
              if (line.length === 0) {
                cursorY -= baseSize * lineSpacing;
                return;
              }
              const maxWidth = Math.max(10, boxWidth - padding * 2);
          const lineHeight = baseSize * lineSpacing;
              let lineWidth = 0;
              line.forEach((run) => {
                const transformed = applyTextTransform(run.text, textTransform);
                const variant = resolveFontVariant(!!run.bold, !!run.italic);
                const runFont = fontCache.get(variant);
                if (runFont) {
                  lineWidth += runFont.widthOfTextAtSize(transformed, run.sizePt);
                }
              });
              const clampedWidth = Math.min(lineWidth, maxWidth);
              let lineX = x;
              if (textAlign === "center") {
                lineX = x + Math.max(0, (maxWidth - clampedWidth) / 2);
              } else if (textAlign === "right") {
                lineX = x + Math.max(0, maxWidth - clampedWidth);
              }
              const shouldJustify = textAlign === "justify" && lineIndex < lines.length - 1;
              const spaceCount = shouldJustify
                ? line.reduce(
                    (count, run) => count + (applyTextTransform(run.text, textTransform).match(/ /g)?.length ?? 0),
                    0
                  )
                : 0;
              const extraSpace =
                shouldJustify && spaceCount > 0 ? Math.max(0, maxWidth - lineWidth) / spaceCount : 0;
              cursorY -= baseSize;
              let cursorX = lineX;
              line.forEach((run) => {
                const transformed = applyTextTransform(run.text, textTransform);
                const variant = resolveFontVariant(!!run.bold, !!run.italic);
                const runFont = fontCache.get(variant);
                if (!runFont) return;
                const runStartX = cursorX;
                const runWidth = runFont.widthOfTextAtSize(transformed, run.sizePt);
                const runSpaceCount = shouldJustify ? (transformed.match(/ /g)?.length ?? 0) : 0;
                const runWidthAdjusted = runWidth + runSpaceCount * extraSpace;
                const runColorValue = run.color ? hexToRgb(run.color) : null;
                const runColor = runColorValue
                  ? rgb(runColorValue.r, runColorValue.g, runColorValue.b)
                  : defaultTextColor;
                const highlightValue = run.highlightColor ? hexToRgb(run.highlightColor) : null;
                if (highlightValue) {
                  copied.drawRectangle({
                    x: runStartX,
                    y: cursorY - lineHeight * 0.15,
                    width: runWidthAdjusted,
                    height: lineHeight,
                    color: rgb(highlightValue.r, highlightValue.g, highlightValue.b),
                    rotate: degrees(rotation),
                  });
                }
                if (shouldJustify && spaceCount > 0) {
                  const segments = transformed.split(/( )/);
                  segments.forEach((segment) => {
                    if (segment === " ") {
                      const spaceWidth = runFont.widthOfTextAtSize(" ", run.sizePt);
                      cursorX += spaceWidth + extraSpace;
                    } else if (segment) {
                      copied.drawText(segment, {
                        x: cursorX,
                        y: cursorY,
                        size: run.sizePt,
                        font: runFont,
                        color: runColor,
                        maxWidth,
                        rotate: degrees(rotation),
                      });
                      cursorX += runFont.widthOfTextAtSize(segment, run.sizePt);
                    }
                  });
                } else {
                  copied.drawText(transformed, {
                    x: cursorX,
                    y: cursorY,
                    size: run.sizePt,
                    font: runFont,
                    color: runColor,
                    maxWidth,
                    rotate: degrees(rotation),
                  });
                  cursorX += runWidth;
                }
                if (run.underline) {
                  const lineOrigin = { x: runStartX, y: cursorY };
                  const decorationThickness = Math.max(0.5, lineHeight / 14);
                  const underlineY = cursorY - lineHeight * 0.1;
                  const start = rotatePoint({ x: runStartX, y: underlineY }, lineOrigin, rotationRadians);
                  const end = rotatePoint(
                    { x: runStartX + runWidthAdjusted, y: underlineY },
                    lineOrigin,
                    rotationRadians
                  );
                  copied.drawLine({ start, end, thickness: decorationThickness, color: runColor });
                }
              });
              cursorY -= lineHeight - baseSize;
            });
          }
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

  const handleLogoNavigate = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      event.stopPropagation();
      router.push("/");
    },
    [router]
  );

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
    if (suppressNextAutoZoomRef.current > 0) {
      suppressNextAutoZoomRef.current -= 1;
      return;
    }
    computeBaseScale();
  }, [computeBaseScale, pages.length, userAdjustedZoom]);

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
    textNodeRefs.current.forEach((node) => {
      const spans = node.querySelectorAll<HTMLElement>("[data-font-size-pt]");
      spans.forEach((span) => {
        const parsed = Number(span.dataset.fontSizePt);
        if (!Number.isNaN(parsed)) {
          span.style.fontSize = `${fontSizeToDisplayPx(parsed)}px`;
        }
      });
    });
  }, [fontSizeToDisplayPx]);

  useEffect(() => {
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        clearTextFocus();
        return;
      }
      if (target.closest("[data-text-toolbar]") || target.closest("[data-text-popover]")) {
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
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        clearShapeFocus();
        return;
      }
      if (target.closest("[data-shape-toolbar]") || target.closest("[data-text-popover]")) {
        return;
      }
      if (!target.closest("[data-shape-annotation]")) {
        clearShapeFocus();
      }
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => window.removeEventListener("pointerdown", handleGlobalPointerDown);
  }, [clearShapeFocus]);

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
      shapeDragCleanupRef.current?.();
    };
  }, []);
  useEffect(() => {
    if (!fontMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!fontMenuRef.current?.contains(event.target) && !fontMenuButtonRef.current?.contains(event.target)) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [fontMenuOpen]);
  useEffect(() => {
    if (!alignMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!alignMenuRef.current?.contains(event.target) && !alignMenuButtonRef.current?.contains(event.target)) {
        setAlignMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [alignMenuOpen]);
  useEffect(() => {
    if (!lineSpacingMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !lineSpacingMenuRef.current?.contains(event.target) &&
        !lineSpacingMenuButtonRef.current?.contains(event.target)
      ) {
        setLineSpacingMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [lineSpacingMenuOpen]);
  useEffect(() => {
    if (!lineStyleMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!lineStyleMenuRef.current?.contains(event.target) && !lineStyleMenuButtonRef.current?.contains(event.target)) {
        setLineStyleMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [lineStyleMenuOpen]);
  useEffect(() => {
    if (!shapeLineStyleMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !shapeLineStyleMenuRef.current?.contains(event.target) &&
        !shapeLineStyleMenuButtonRef.current?.contains(event.target)
      ) {
        setShapeLineStyleMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [shapeLineStyleMenuOpen]);
  const updateFontMenuPosition = useCallback(() => {
    const button = fontMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(224, rect.width);
    const maxLeft = window.innerWidth - width - 8;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, maxLeft));
    const top = rect.bottom + 8;
    setFontMenuPosition({ left, top, width });
  }, []);
  const updateAlignMenuPosition = useCallback(() => {
    const button = alignMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;
    setAlignMenuPosition({ left, top });
  }, []);
  const updateLineSpacingMenuPosition = useCallback(() => {
    const button = lineSpacingMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;
    setLineSpacingMenuPosition({ left, top });
  }, []);
  const updateLineStyleMenuPosition = useCallback(() => {
    const button = lineStyleMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;
    setLineStyleMenuPosition({ left, top });
  }, []);
  const updateShapeLineStyleMenuPosition = useCallback(() => {
    const button = shapeLineStyleMenuButtonRef.current;
    if (!button || typeof window === "undefined") return;
    const rect = button.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;
    setShapeLineStyleMenuPosition({ left, top });
  }, []);
  useEffect(() => {
    if (!fontMenuOpen) {
      setFontMenuPosition(null);
      return;
    }
    updateFontMenuPosition();
    const handleReposition = () => updateFontMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [fontMenuOpen, updateFontMenuPosition]);
  useEffect(() => {
    if (!alignMenuOpen) {
      setAlignMenuPosition(null);
      return;
    }
    updateAlignMenuPosition();
    const handleReposition = () => updateAlignMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [alignMenuOpen, updateAlignMenuPosition]);
  useEffect(() => {
    if (!lineSpacingMenuOpen) {
      setLineSpacingMenuPosition(null);
      return;
    }
    updateLineSpacingMenuPosition();
    const handleReposition = () => updateLineSpacingMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [lineSpacingMenuOpen, updateLineSpacingMenuPosition]);
  useEffect(() => {
    if (!lineStyleMenuOpen) {
      setLineStyleMenuPosition(null);
      return;
    }
    updateLineStyleMenuPosition();
    const handleReposition = () => updateLineStyleMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [lineStyleMenuOpen, updateLineStyleMenuPosition]);
  useEffect(() => {
    if (!shapeLineStyleMenuOpen) {
      setShapeLineStyleMenuPosition(null);
      return;
    }
    updateShapeLineStyleMenuPosition();
    const handleReposition = () => updateShapeLineStyleMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [shapeLineStyleMenuOpen, updateShapeLineStyleMenuPosition]);
  useEffect(() => {
    if (!textMode) setFontMenuOpen(false);
  }, [textMode]);
  useEffect(() => {
    if (!textMode) setAlignMenuOpen(false);
  }, [textMode]);
  useEffect(() => {
    if (!textMode) setLineSpacingMenuOpen(false);
  }, [textMode]);
  useEffect(() => {
    if (!penMode) setLineStyleMenuOpen(false);
  }, [penMode]);
  useEffect(() => {
    if (!shapeMode) setShapeLineStyleMenuOpen(false);
  }, [shapeMode]);
  useEffect(() => {
    if (!textMode && colorPickerOpen === "text") setColorPickerOpen(null);
  }, [colorPickerOpen, textMode]);
  useEffect(() => {
    if (!shapeMode && (colorPickerOpen === "shape-border" || colorPickerOpen === "shape-fill")) {
      setColorPickerOpen(null);
    }
  }, [colorPickerOpen, shapeMode]);
  useEffect(() => {
    if (!penMode && colorPickerOpen === "pen") {
      setColorPickerOpen(null);
    }
  }, [colorPickerOpen, penMode]);
  const updateHighlightPopoverPosition = useCallback(() => {
    const button =
      colorPickerOpen === "shape-border"
        ? shapeBorderColorButtonRef.current
        : colorPickerOpen === "shape-fill"
          ? shapeFillColorButtonRef.current
          : colorPickerOpen === "pen"
            ? penColorButtonRef.current
            : textColorButtonRef.current;
    const popover = highlightPopoverRef.current;
    if (!button || !popover || typeof window === "undefined") return;
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const padding = 8;
    const left = Math.max(padding, Math.min(buttonRect.left, window.innerWidth - popoverRect.width - padding));
    let top = buttonRect.bottom + 8;
    if (top + popoverRect.height > window.innerHeight - padding) {
      top = buttonRect.top - popoverRect.height - 8;
    }
    setHighlightPopoverPosition({ left, top });
  }, [colorPickerOpen]);
  useEffect(() => {
    if (!colorPickerOpen) {
      setHighlightPopoverPosition(null);
      return;
    }
    updateHighlightPopoverPosition();
    const handleReposition = () => updateHighlightPopoverPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [colorPickerOpen, highlightCustomOpen, updateHighlightPopoverPosition]);
  useEffect(() => {
    if (!colorPickerOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        highlightPopoverRef.current?.contains(event.target) ||
        textColorButtonRef.current?.contains(event.target) ||
        shapeBorderColorButtonRef.current?.contains(event.target) ||
        shapeFillColorButtonRef.current?.contains(event.target) ||
        penColorButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      setColorPickerOpen(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColorPickerOpen(null);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [colorPickerOpen]);

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
    if (focusedShapeId === shapeId && focusedShapePageId === pageId) {
      setFocusedShapeId(null);
      setFocusedShapePageId(null);
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
      {showStartupOverlay ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-md rounded-2xl bg-white px-8 py-6 text-center shadow-[0_30px_80px_rgba(5,10,30,0.45)]">
            <p className="text-base font-semibold text-slate-800">Getting project ready...</p>
            <p className="mt-1 text-sm text-slate-500">Loading your workspace</p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0b2f6a] via-[#1f4b99] to-[#7c3aed] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(startupProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
        {/* Top row */}
        <div className="w-full border-b border-slate-100 bg-white">
          <div className="flex h-14 w-full items-center gap-4 px-4 lg:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="Back to workspace"
              onClickCapture={handleLogoNavigate}
            >
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
                <button className={`${buttonNeutral} px-5 py-2`} onClick={handleAddClick} disabled={isLoadingPages}>
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
        <div
          className="toolbar-font relative z-[100] w-full bg-[#F1F5F9] shadow-[0_1px_4px_rgba(15,23,42,0.06)]"
          data-text-toolbar
        >
	          <div className="w-full pl-8 pr-4 py-0.5 lg:pl-10 lg:pr-6">
	            <div className="relative h-10">
	              <div className={`absolute inset-0 flex w-full items-center gap-3 lg:gap-4 ${loading ? "pointer-events-none" : ""}`}>
	                <div className="tools-scroll flex min-w-0 flex-1 overflow-x-auto overflow-y-visible">
	                  <div className="flex items-center gap-0 rounded-xl bg-[#F1F5F9] pl-0 pr-1.5 py-0">
	                  <div className="group relative">
	                    <button
	                      type="button"
	                      className={`${toolButtonBase} ${toolIconButton} ${toolButtonInactiveBlack}`}
	                      disabled={loading}
	                      aria-disabled={!hasUndoHistory}
	                      aria-label="Undo"
	                      onClick={() => {
	                        if (loading) return;
	                        if (!hasUndoHistory) return;
	                        handleUndoHighlight();
	                      }}
	                    >
	                      <Undo2 className="h-5 w-5" />
	                    </button>
	                    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
	                      Undo
	                    </div>
	                  </div>

	                  <div className="group relative">
	                    <button
	                      type="button"
	                      className={`${toolButtonBase} ${toolIconButton} ${toolButtonInactiveBlack}`}
	                      disabled={loading}
	                      aria-disabled={!hasRedoHistory}
	                      aria-label="Redo"
	                      onClick={() => {
	                        if (loading) return;
	                        if (!hasRedoHistory) return;
	                        handleRedoHighlight();
	                      }}
	                    >
	                      <Redo2 className="h-5 w-5" />
	                    </button>
	                    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
	                      Redo
	                    </div>
	                  </div>

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
	                    <Type className="h-5 w-5" />
	                    Text
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={loading}
	                    className={`${toolButtonBase} ${toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (loading) return;
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setTextMode(false);
	                      setPenMode(false);
	                      setHighlightMode(false);
	                      setShapeMode(false);
	                      setDraftHighlight(null);
	                      setDraftShape(null);
	                      setDraftTextBox(null);
	                      setShowSignatureHub(false);
	                      setSignaturePanelMode("none");
	                      setPendingSignatureForPlacement(null);
	                      handleOpenImageUpload();
	                    }}
	                  >
	                    <ImageIcon className="h-5 w-5" />
	                    Image
	                  </button>

	                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

	                  <button
	                    type="button"
	                    disabled={highlightButtonDisabled}
	                    aria-pressed={shapeButtonVisualOn}
	                    className={`${toolButtonBase} ${shapeButtonVisualOn ? toolButtonActive : toolButtonInactiveBlack}`}
	                    onClick={() => {
	                      if (highlightButtonDisabled) return;
	                      clearTextFocus();
	                      setSelectMode(false);
	                      setDeleteMode(false);
	                      setShapeMode(true);
	                      setShapeType(null);
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
                    disabled={loading}
                    className={`${toolButtonBase} ${deleteMode ? toolButtonActive : toolButtonInactiveBlack}`}
                    onClick={handleToggleDeleteMode}
                    aria-pressed={deleteMode}
	                    aria-disabled={!hasAnyAnnotations && !deleteMode}
	                  >
                    <Eraser className="h-5 w-5" />
                    Eraser
                  </button>

                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

                  <button
                    type="button"
                    disabled={loading}
                    className={`${toolButtonBase} ${toolButtonInactiveBlack}`}
                    onClick={() => {
                      if (loading) return;
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
                      handleAddStickyNote();
                    }}
                  >
                    <Pin className="h-5 w-5 rotate-[45deg]" />
                    Note
                  </button>

                  <div className="mx-1 h-6 w-px bg-slate-300/90" aria-hidden />

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

	                {!organizeMode && (pages.length > 0 || loading) ? (
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
				                              animate={{ height: 44, opacity: 1, y: 0 }}
				                              exit={{ height: 0, opacity: 0, y: -6 }}
				                              transition={{ duration: 0.18, ease: SOFT_EASE }}
				                              className="relative z-[30] min-w-0 overflow-hidden border-b border-slate-200 bg-white"
				                            >
                              <div className="toolbar-font w-full">
                                <div className="w-full pl-8 pr-4 py-0.5 lg:pl-10 lg:pr-6">
                                  <div className="relative h-10">
                                    <div
                                      className={`absolute inset-0 flex w-full items-center gap-3 lg:gap-4 ${
                                        loading ? "pointer-events-none" : ""
                                      }`}
                                      data-text-toolbar
                                    >
                                      {shapeMode ? (
                                        <div
                                          className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto ${
                                            loading ? "pointer-events-none" : ""
                                          }`}
                                          aria-label="Options"
                                          data-shape-toolbar
                                        >
                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />
                                          <div className="flex items-center gap-1.5">
                                            {[
                                              { type: "line" as const, label: "Line", icon: Minus },
                                              { type: "arrow" as const, label: "Arrow", icon: ArrowRight },
                                            ].map((item) => {
                                              const Icon = item.icon;
                                              const selected = shapeType === item.type;
                                              return (
                                                <button
                                                  key={item.type}
                                                  type="button"
                                                  onClick={() => setShapeType(item.type)}
                                                  aria-pressed={selected}
                                                  className={`${textOptionButtonBase} ${
                                                    selected ? textOptionButtonActive : textOptionButtonHover
                                                  }`}
                                                  onMouseEnter={(event) =>
                                                    showToolbarTooltip(item.label, event.currentTarget)
                                                  }
                                                  onMouseLeave={hideToolbarTooltip}
                                                  aria-label={item.label}
                                                >
                                                  <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                                                </button>
                                              );
                                            })}
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1.5">
                                            {[
                                              { type: "check" as const, label: "Check", icon: Check },
                                              { type: "x" as const, label: "Cross", icon: X },
                                            ].map((item) => {
                                              const Icon = item.icon;
                                              const selected = shapeType === item.type;
                                              return (
                                                <button
                                                  key={item.type}
                                                  type="button"
                                                  onClick={() => setShapeType(item.type)}
                                                  aria-pressed={selected}
                                                  className={`${textOptionButtonBase} ${
                                                    selected ? textOptionButtonActive : textOptionButtonHover
                                                  }`}
                                                  onMouseEnter={(event) =>
                                                    showToolbarTooltip(item.label, event.currentTarget)
                                                  }
                                                  onMouseLeave={hideToolbarTooltip}
                                                  aria-label={item.label}
                                                >
                                                  <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                                                </button>
                                              );
                                            })}
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1.5">
                                            {[
                                              { type: "rect" as const, label: "Rectangle", icon: Square },
                                              { type: "ellipse" as const, label: "Circle", icon: Circle },
                                              { type: "triangle" as const, label: "Triangle", icon: Triangle },
                                            ].map((item) => {
                                              const Icon = item.icon;
                                              const selected = shapeType === item.type;
                                              return (
                                                <button
                                                  key={item.type}
                                                  type="button"
                                                  onClick={() => setShapeType(item.type)}
                                                  aria-pressed={selected}
                                                  className={`${textOptionButtonBase} ${
                                                    selected ? textOptionButtonActive : textOptionButtonHover
                                                  }`}
                                                  onMouseEnter={(event) =>
                                                    showToolbarTooltip(item.label, event.currentTarget)
                                                  }
                                                  onMouseLeave={hideToolbarTooltip}
                                                  aria-label={item.label}
                                                >
                                                  <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden />
                                                </button>
                                              );
                                            })}
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center">
                                            <div className="inline-flex items-center gap-0 justify-start">
                                              <button
                                                type="button"
                                                className="mr-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => applyShapeThickness(shapeThickness - 1)}
                                                onMouseEnter={(event) =>
                                                  showToolbarTooltip("Decrease stroke", event.currentTarget)
                                                }
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Decrease thickness"
                                              >
                                                <Minus className="h-4 w-4" />
                                              </button>
                                              <input
                                                type="text"
                                                maxLength={2}
                                                inputMode="decimal"
                                                value={shapeThicknessInput}
                                                onChange={(event) => {
                                                  const nextValue = event.target.value;
                                                  setShapeThicknessInput(nextValue);
                                                }}
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    event.currentTarget.blur();
                                                  }
                                                }}
                                                onBlur={() => {
                                                  if (!shapeThicknessInput) {
                                                    const fallback = MIN_SHAPE_THICKNESS;
                                                    applyShapeThickness(fallback);
                                                    setShapeThicknessInput(`${fallback}`);
                                                    return;
                                                  }
                                                  const next = Number(shapeThicknessInput);
                                                  if (Number.isNaN(next)) {
                                                    setShapeThicknessInput(`${Math.round(shapeThickness)}`);
                                                    return;
                                                  }
                                                  const normalized = normalizeShapeThickness(next);
                                                  applyShapeThickness(normalized);
                                                  setShapeThicknessInput(`${normalized}`);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Stroke", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                className="bg-transparent text-center text-sm font-semibold text-slate-800 outline-none rounded-md"
                                                style={{
                                                  border: "1px solid rgba(148, 163, 184, 0.7)",
                                                  padding: "3px 5px",
                                                  margin: "-3px -5px",
                                                  width: "4ch",
                                                  alignSelf: "center",
                                                }}
                                                aria-label="Thickness"
                                              />
                                              <button
                                                type="button"
                                                className="ml-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => applyShapeThickness(shapeThickness + 1)}
                                                onMouseEnter={(event) =>
                                                  showToolbarTooltip("Increase stroke", event.currentTarget)
                                                }
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Increase thickness"
                                              >
                                                <Plus className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-600">Border</span>
                                            <button
                                              type="button"
                                              className={`relative h-8 w-8 rounded-full border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                                colorPickerOpen === "shape-border"
                                                  ? "border-[#024d7c]"
                                                  : "border-slate-200 hover:border-slate-300"
                                              }`}
                                              onClick={() => openColorPickerFor("shape-border")}
                                              aria-label="Border color"
                                              ref={shapeBorderColorButtonRef}
                                            >
                                              <span
                                                className="absolute inset-[2px] rounded-full"
                                                style={{ backgroundColor: resolvedShapeBorderColor ?? "#111827" }}
                                                aria-hidden
                                              />
                                            </button>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-600">Fill</span>
                                            <button
                                              type="button"
                                              className={`relative h-8 w-8 rounded-full border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                                colorPickerOpen === "shape-fill"
                                                  ? "border-[#024d7c]"
                                                  : "border-slate-200 hover:border-slate-300"
                                              }`}
                                              onClick={() => openColorPickerFor("shape-fill")}
                                              aria-label="Fill color"
                                              ref={shapeFillColorButtonRef}
                                            >
                                              <span
                                                className={`absolute inset-[2px] rounded-full ${
                                                  activeShapeFillColor ? "" : "bg-white"
                                                }`}
                                                style={
                                                  activeShapeFillColor
                                                    ? { backgroundColor: activeShapeFillColor }
                                                    : {
                                                        backgroundImage:
                                                          "linear-gradient(45deg, rgba(148,163,184,0.6) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.6) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.6) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.6) 75%)",
                                                        backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                                                        backgroundSize: "6px 6px",
                                                      }
                                                }
                                                aria-hidden
                                              />
                                            </button>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                ref={shapeLineStyleMenuButtonRef}
                                                disabled={!shapeLineStyleEligible}
                                                className={`${textOptionButtonBase} ${textOptionButtonHover} w-auto px-2 flex items-center gap-1 text-slate-800 disabled:cursor-not-allowed disabled:opacity-40`}
                                                onClick={() => {
                                                  if (!shapeLineStyleEligible) return;
                                                  hideToolbarTooltip();
                                                  setShapeLineStyleMenuOpen((prev) => !prev);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Line style", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Line style"
                                              >
                                                <svg className="h-[18px] w-[18px]" viewBox="0 0 18 6" aria-hidden="true">
                                                  {resolvedShapeLineStyle === "dashed" ? (
                                                    <>
                                                      <line x1="1" y1="3" x2="5" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                      <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                      <line x1="15" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                    </>
                                                  ) : (
                                                    <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                  )}
                                                </svg>
                                                <svg className="h-2 w-2 text-slate-800" viewBox="0 0 8 5" aria-hidden="true">
                                                  <path d="M4 5L0 0h8L4 5z" fill="currentColor" />
                                                </svg>
                                              </button>
                                              {shapeLineStyleMenuOpen && shapeLineStyleMenuPosition && typeof document !== "undefined"
                                                ? createPortal(
                                                    <div
                                                      ref={shapeLineStyleMenuRef}
                                                      className="fixed z-[9999] rounded-lg bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                                      style={{
                                                        left: shapeLineStyleMenuPosition.left,
                                                        top: shapeLineStyleMenuPosition.top,
                                                        transform: "translateX(-50%)",
                                                      }}
                                                    >
                                                      <div className="flex flex-col gap-1">
                                                        {[
                                                          { value: "solid", label: "Solid" },
                                                          { value: "dashed", label: "Dashed" },
                                                        ].map(({ value, label }) => (
                                                          <button
                                                            key={value}
                                                            type="button"
                                                            className={`flex w-28 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition ${
                                                              resolvedShapeLineStyle === value
                                                                ? "bg-[#E0F2FE] text-[#024d7c]"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                            onMouseEnter={(event) => showToolbarTooltip(label, event.currentTarget)}
                                                            onMouseLeave={hideToolbarTooltip}
                                                            onClick={() => {
                                                              applyShapeLineStyle(value as LineStyle);
                                                              setShapeLineStyleMenuOpen(false);
                                                            }}
                                                            aria-label={`Line style ${label.toLowerCase()}`}
                                                          >
                                                            <svg className="h-[18px] w-[18px] text-slate-700" viewBox="0 0 18 6" aria-hidden="true">
                                                              {value === "dashed" ? (
                                                                <>
                                                                  <line x1="1" y1="3" x2="5" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                  <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                  <line x1="15" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                </>
                                                              ) : (
                                                                <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                              )}
                                                            </svg>
                                                            <span>{label}</span>
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>,
                                                    document.body,
                                                  )
                                                : null}
                                            </div>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />
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

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

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

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

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
                                          className={`tools-scroll flex min-w-0 items-center gap-2 overflow-x-auto overflow-y-visible py-1 ${
                                            loading ? "pointer-events-none" : ""
                                          }`}
                                          aria-label="Draw options"
                                        >
                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center">
                                            <div className="inline-flex items-center gap-0 justify-start">
                                              <button
                                                type="button"
                                                className="mr-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => applyPenThickness(penThickness - 1)}
                                                onMouseEnter={(event) =>
                                                  showToolbarTooltip("Decrease stroke", event.currentTarget)
                                                }
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Decrease thickness"
                                              >
                                                <Minus className="h-4 w-4" />
                                              </button>
                                              <input
                                                type="text"
                                                maxLength={2}
                                                inputMode="decimal"
                                                value={penThicknessInput}
                                                onChange={(event) => {
                                                  const nextValue = event.target.value;
                                                  setPenThicknessInput(nextValue);
                                                }}
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    event.currentTarget.blur();
                                                  }
                                                }}
                                                onBlur={() => {
                                                  if (!penThicknessInput) {
                                                    const fallback = 1;
                                                    applyPenThickness(fallback);
                                                    setPenThicknessInput(`${fallback}`);
                                                    return;
                                                  }
                                                  const next = Number(penThicknessInput);
                                                  if (Number.isNaN(next)) {
                                                    setPenThicknessInput(`${Math.round(penThickness)}`);
                                                    return;
                                                  }
                                                  const normalized = clamp(Math.round(next), 1, 10);
                                                  applyPenThickness(normalized);
                                                  setPenThicknessInput(`${normalized}`);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Stroke", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                className="bg-transparent text-center text-sm font-semibold text-slate-800 outline-none rounded-md"
                                                style={{
                                                  border: "1px solid rgba(148, 163, 184, 0.7)",
                                                  padding: "3px 5px",
                                                  margin: "-3px -5px",
                                                  width: "4ch",
                                                  alignSelf: "center",
                                                }}
                                                aria-label="Stroke thickness"
                                              />
                                              <button
                                                type="button"
                                                className="ml-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => applyPenThickness(penThickness + 1)}
                                                onMouseEnter={(event) =>
                                                  showToolbarTooltip("Increase stroke", event.currentTarget)
                                                }
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Increase thickness"
                                              >
                                                <Plus className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-semibold text-slate-600">Opacity</span>
                                              <input
                                                type="range"
                                                min={10}
                                                max={100}
                                                step={10}
                                                value={Math.round(penOpacity * 100)}
                                                onChange={(event) => applyPenOpacity(Number(event.target.value) / 100)}
                                                className="opacity-slider w-28 cursor-pointer"
                                                style={{
                                                  background: `linear-gradient(to right, #024d7c ${Math.round(
                                                    penOpacity * 100
                                                  )}%, #e2e8f0 ${Math.round(penOpacity * 100)}%)`,
                                                }}
                                                aria-label="Stroke opacity"
                                              />
                                              <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-700">
                                                {Math.round(penOpacity * 100)}%
                                              </span>
                                            </div>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                ref={lineStyleMenuButtonRef}
                                                className={`${textOptionButtonBase} ${textOptionButtonHover} w-auto px-2 flex items-center gap-1 text-slate-800`}
                                                onClick={() => {
                                                  hideToolbarTooltip();
                                                  setLineStyleMenuOpen((prev) => !prev);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Line style", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Line style"
                                              >
                                                <svg className="h-[18px] w-[18px]" viewBox="0 0 18 6" aria-hidden="true">
                                                  {penLineStyle === "dashed" ? (
                                                    <>
                                                      <line x1="1" y1="3" x2="5" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                      <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                      <line x1="15" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                    </>
                                                  ) : (
                                                    <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                  )}
                                                </svg>
                                                <svg className="h-2 w-2 text-slate-800" viewBox="0 0 8 5" aria-hidden="true">
                                                  <path d="M4 5L0 0h8L4 5z" fill="currentColor" />
                                                </svg>
                                              </button>
                                              {lineStyleMenuOpen && lineStyleMenuPosition && typeof document !== "undefined"
                                                ? createPortal(
                                                    <div
                                                      ref={lineStyleMenuRef}
                                                      className="fixed z-[9999] rounded-lg bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                                      style={{
                                                        left: lineStyleMenuPosition.left,
                                                        top: lineStyleMenuPosition.top,
                                                        transform: "translateX(-50%)",
                                                      }}
                                                    >
                                                      <div className="flex flex-col gap-1">
                                                        {[
                                                          { value: "solid", label: "Solid" },
                                                          { value: "dashed", label: "Dashed" },
                                                        ].map(({ value, label }) => (
                                                          <button
                                                            key={value}
                                                            type="button"
                                                            className={`flex w-28 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition ${
                                                              penLineStyle === value
                                                                ? "bg-[#E0F2FE] text-[#024d7c]"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                            onMouseEnter={(event) => showToolbarTooltip(label, event.currentTarget)}
                                                            onMouseLeave={hideToolbarTooltip}
                                                            onClick={() => {
                                                              setPenLineStyle(value as LineStyle);
                                                              setLineStyleMenuOpen(false);
                                                            }}
                                                            aria-label={`Line style ${label.toLowerCase()}`}
                                                          >
                                                            <svg className="h-[18px] w-[18px] text-slate-700" viewBox="0 0 18 6" aria-hidden="true">
                                                              {value === "dashed" ? (
                                                                <>
                                                                  <line x1="1" y1="3" x2="5" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                  <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                  <line x1="15" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                                </>
                                                              ) : (
                                                                <line x1="1" y1="3" x2="17" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                                              )}
                                                            </svg>
                                                            <span>{label}</span>
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>,
                                                    document.body,
                                                  )
                                                : null}
                                            </div>
                                          </div>

                                          <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-600">Color</span>
                                            <button
                                              type="button"
                                              className={`relative h-8 w-8 rounded-full border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                                colorPickerOpen === "pen"
                                                  ? "border-[#024d7c]"
                                                  : "border-slate-200 hover:border-slate-300"
                                              }`}
                                              onClick={() => openColorPickerFor("pen")}
                                              aria-label="Stroke color"
                                              ref={penColorButtonRef}
                                            >
                                              <span
                                                className="absolute inset-[2px] rounded-full"
                                                style={{ backgroundColor: penColor }}
                                                aria-hidden
                                            />
                                          </button>
                                        </div>

                                        <div className="mx-1 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />
                                      </div>
                                    ) : (
                                        <div
                                          className={`tools-scroll flex min-w-0 items-center gap-0.5 overflow-visible ${
                                            loading ? "pointer-events-none" : ""
                                          }`}
                                          aria-label="Text options"
                                        >
                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="relative flex items-center gap-0.5">
                                            <div
                                              className="group"
                                              onMouseEnter={(event) => showToolbarTooltip("Font", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                            >
                                      <button
                                        type="button"
                                        ref={fontMenuButtonRef}
                                        className={`${textInputPill} w-[150px] justify-between`}
                                        onMouseDown={keepTextEditingActive}
                                        onClick={() => setFontMenuOpen((prev) => !prev)}
                                        aria-label="Text font"
                                      >
                                      <span className="min-w-0 flex-1 truncate text-left">
                                        {textFontEntries.find(([key]) => key === textFont)?.[1].label ?? textFont}
                                      </span>
                                      <svg
                                        className="ml-2 h-2 w-2 text-slate-800"
                                        viewBox="0 0 8 5"
                                        aria-hidden="true"
                                      >
                                        <path d="M4 5L0 0h8L4 5z" fill="currentColor" />
                                      </svg>
                                    </button>
                                            </div>
                                          </div>
                                          {fontMenuOpen && fontMenuPosition && typeof document !== "undefined"
                                            ? createPortal(
                                                <div
                                                  ref={fontMenuRef}
                                                  className="fixed z-[9999] rounded-lg bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                                  style={{
                                                    left: fontMenuPosition.left,
                                                    top: fontMenuPosition.top,
                                                    width: fontMenuPosition.width,
                                                  }}
                                                >
                                                  {textFontEntries.map(([key, option]) => (
                                                      <button
                                                        key={key}
                                                        type="button"
                                                        className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 ${
                                                          key === textFont ? "bg-blue-100 text-blue-700" : ""
                                                        }`}
                                                        onMouseDown={keepTextEditingActive}
                                                        onClick={() => {
                                                          setTextFont(key);
                                                          setFontMenuOpen(false);
                                                        }}
                                                      >
                                                        {option.label}
                                                      </button>
                                                    ))}
                                                </div>,
                                                document.body,
                                              )
                                            : null}

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center">
                                            <div className="inline-flex items-center gap-0 justify-start">
                                              <button
                                                type="button"
                                                className="mr-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onMouseDown={keepTextEditingActive}
                                                onClick={() => stepTextSize(-1)}
                                                onMouseEnter={(event) => showToolbarTooltip("Decrease font size", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Decrease text size"
                                              >
                                                <Minus className="h-4 w-4" />
                                              </button>
                                              <input
                                                type="text"
                                                maxLength={2}
                                                inputMode="decimal"
                                                value={textSizeInput}
                                                onMouseDown={() => {
                                                  if (!focusedTextId) return;
                                                  const element = textNodeRefs.current.get(focusedTextId);
                                                  const selection = window.getSelection();
                                                  if (!element || !selection || selection.rangeCount === 0) return;
                                                  const range = selection.getRangeAt(0);
                                                  if (element.contains(range.commonAncestorContainer)) {
                                                    selectionRangeRef.current = range.cloneRange();
                                                  }
                                                }}
                                                onChange={(event) => {
                                                  const nextValue = event.target.value;
                                                  setTextSizeInput(nextValue);
                                                }}
                                                onKeyDown={(event) => {
                                                  if (event.key === "Enter") {
                                                    textSizeCommitKeepSelectionRef.current = true;
                                                    event.currentTarget.blur();
                                                  }
                                                }}
                                                onBlur={(event) => {
                                                  const shouldRestoreSelection =
                                                    textSizeCommitKeepSelectionRef.current ||
                                                    (event.relatedTarget instanceof Element &&
                                                      event.relatedTarget.closest("[data-text-toolbar]"));
                                                  if (!textSizeInput) {
                                                    const fallback = 11;
                                                    applyTextSize(fallback);
                                                    setTextSizeInput(`${fallback}`);
                                                    if (shouldRestoreSelection) {
                                                      restoreTextSelection();
                                                    }
                                                    textSizeCommitKeepSelectionRef.current = false;
                                                    return;
                                                  }
                                                  const next = Number(textSizeInput);
                                                  if (Number.isNaN(next)) {
                                                    setTextSizeInput(`${activeTextSize}`);
                                                    if (shouldRestoreSelection) {
                                                      restoreTextSelection();
                                                    }
                                                    textSizeCommitKeepSelectionRef.current = false;
                                                    return;
                                                  }
                                                  const normalized = normalizeTextSize(next);
                                                  applyTextSize(normalized);
                                                  setTextSizeInput(`${normalized}`);
                                                  if (shouldRestoreSelection) {
                                                    restoreTextSelection();
                                                  }
                                                  textSizeCommitKeepSelectionRef.current = false;
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Font size", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                className="bg-transparent text-center text-sm font-semibold text-slate-800 outline-none rounded-md"
                                                style={{
                                                  border: "1px solid rgba(148, 163, 184, 0.7)",
                                                  padding: "3px 5px",
                                                  margin: "-3px -5px",
                                                  width: "4ch",
                                                  alignSelf: "center",
                                                }}
                                                aria-label="Text size"
                                              />
                                              <button
                                                type="button"
                                                className="ml-2 flex h-7 w-7 items-center justify-center rounded text-slate-800 transition hover:bg-slate-100 hover:text-slate-900"
                                                onMouseDown={keepTextEditingActive}
                                                onClick={() => stepTextSize(1)}
                                                onMouseEnter={(event) => showToolbarTooltip("Increase font size", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Increase text size"
                                              >
                                                <Plus className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              className={`${textOptionButtonBase} ${textOptionButtonHover}`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => openColorPickerFor("text")}
                                              onMouseEnter={(event) => showToolbarTooltip("Text color", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Text color"
                                              ref={textColorButtonRef}
                                            >
                                              <span className="relative flex h-7 w-7 items-center justify-center">
                                                <svg
                                                  className="h-4 w-4 text-slate-800"
                                                  viewBox="0 0 24 24"
                                                  aria-hidden="true"
                                                >
                                                  <path
                                                    d="M5 20L10.5 4h3L19 20M7.5 14h9"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  />
                                                </svg>
                                                {!selectionTextColorMixed ? (
                                                  <span
                                                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-sm"
                                                    style={{ backgroundColor: activeTextColor || "#111827" }}
                                                  />
                                                ) : null}
                                              </span>
                                            </button>
                                          </div>

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              aria-pressed={focusedTextId ? textBold : defaultTextStyles.bold}
                                              className={`${textOptionButtonBase} ${
                                                (focusedTextId ? textBold : defaultTextStyles.bold)
                                                  ? textOptionButtonActive
                                                  : textOptionButtonHover
                                              } text-slate-800`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => applyInlineCommand("bold")}
                                              onMouseEnter={(event) => showToolbarTooltip("Bold", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Bold"
                                            >
                                              <Bold className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                            </button>
                                            <button
                                              type="button"
                                              aria-pressed={focusedTextId ? textItalic : defaultTextStyles.italic}
                                              className={`${textOptionButtonBase} ${
                                                (focusedTextId ? textItalic : defaultTextStyles.italic)
                                                  ? textOptionButtonActive
                                                  : textOptionButtonHover
                                              } text-slate-800`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => applyInlineCommand("italic")}
                                              onMouseEnter={(event) => showToolbarTooltip("Italic", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Italic"
                                            >
                                              <Italic className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                            </button>
                                            <button
                                              type="button"
                                              aria-pressed={focusedTextId ? textUnderline : defaultTextStyles.underline}
                                              className={`${textOptionButtonBase} ${
                                                (focusedTextId ? textUnderline : defaultTextStyles.underline)
                                                  ? textOptionButtonActive
                                                  : textOptionButtonHover
                                              } text-slate-800`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => applyInlineCommand("underline")}
                                              onMouseEnter={(event) => showToolbarTooltip("Underline", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Underline"
                                            >
                                              <Underline className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                            </button>
                                          </div>

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                ref={alignMenuButtonRef}
                                                className={`${textOptionButtonBase} ${textOptionButtonHover} w-auto px-2 flex items-center gap-1 text-slate-800`}
                                                onMouseDown={keepTextEditingActive}
                                                onClick={() => {
                                                  hideToolbarTooltip();
                                                  setAlignMenuOpen((prev) => !prev);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Align", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Text alignment"
                                              >
                                                {textAlign === "left" ? (
                                                  <AlignLeft className="h-[18px] w-[18px]" />
                                                ) : textAlign === "center" ? (
                                                  <AlignCenter className="h-[18px] w-[18px]" />
                                                ) : (
                                                  <AlignRight className="h-[18px] w-[18px]" />
                                                )}
                                                <svg className="h-2 w-2 text-slate-800" viewBox="0 0 8 5" aria-hidden="true">
                                                  <path d="M4 5L0 0h8L4 5z" fill="currentColor" />
                                                </svg>
                                              </button>
                                              {alignMenuOpen && alignMenuPosition && typeof document !== "undefined"
                                                ? createPortal(
                                                    <div
                                                      ref={alignMenuRef}
                                                      className="fixed z-[9999] rounded-lg bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                                      style={{
                                                        left: alignMenuPosition.left,
                                                        top: alignMenuPosition.top,
                                                        transform: "translateX(-50%)",
                                                      }}
                                                    >
                                                      <div className="flex flex-col gap-1">
                                                        {[
                                                          { value: "left", label: "Left", Icon: AlignLeft },
                                                          { value: "center", label: "Center", Icon: AlignCenter },
                                                          { value: "right", label: "Right", Icon: AlignRight },
                                                        ].map(({ value, label, Icon }) => (
                                                          <button
                                                            key={value}
                                                            type="button"
                                                            className={`flex w-24 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition ${
                                                              textAlign === value
                                                                ? "bg-[#E0F2FE] text-[#024d7c]"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                            onPointerDown={keepTextEditingActive}
                                                            onMouseEnter={(event) => showToolbarTooltip(label, event.currentTarget)}
                                                            onMouseLeave={hideToolbarTooltip}
                                                            onClick={() => {
                                                              applyTextAlignment(value as typeof textAlign);
                                                              restoreTextSelectionSoon();
                                                            }}
                                                            aria-label={`Align ${label.toLowerCase()}`}
                                                          >
                                                            <Icon className="h-[18px] w-[18px]" />
                                                            <span>{label}</span>
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>,
                                                    document.body,
                                                  )
                                                : null}
                                            </div>
                                            <div className="relative">
                                              <button
                                                type="button"
                                                ref={lineSpacingMenuButtonRef}
                                                className={`${textOptionButtonBase} ${
                                                  lineSpacingMenuOpen ? textOptionButtonActive : textOptionButtonHover
                                                } w-auto px-2 flex items-center gap-1 text-slate-800`}
                                                onMouseDown={keepTextEditingActive}
                                                onClick={() => {
                                                  hideToolbarTooltip();
                                                  setLineSpacingMenuOpen((prev) => !prev);
                                                }}
                                                onMouseEnter={(event) => showToolbarTooltip("Line spacing", event.currentTarget)}
                                                onMouseLeave={hideToolbarTooltip}
                                                aria-label="Line spacing"
                                              >
                                                <LineSpacingIcon className="h-[18px] w-[18px]" />
                                                <svg className="h-2 w-2 text-slate-800" viewBox="0 0 8 5" aria-hidden="true">
                                                  <path d="M4 5L0 0h8L4 5z" fill="currentColor" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />

                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              aria-pressed={listType === "bullet"}
                                              className={`${textOptionButtonBase} ${
                                                listType === "bullet" ? textOptionButtonActive : textOptionButtonHover
                                              } text-slate-800`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => applyListCommand("bullet")}
                                              onMouseEnter={(event) => showToolbarTooltip("Bulleted list", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Bulleted list"
                                            >
                                              <List className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                            </button>
                                            <button
                                              type="button"
                                              aria-pressed={listType === "number"}
                                              className={`${textOptionButtonBase} ${
                                                listType === "number" ? textOptionButtonActive : textOptionButtonHover
                                              } text-slate-800`}
                                              onMouseDown={keepTextEditingActive}
                                              onClick={() => applyListCommand("number")}
                                              onMouseEnter={(event) => showToolbarTooltip("Numbered list", event.currentTarget)}
                                              onMouseLeave={hideToolbarTooltip}
                                              aria-label="Numbered list"
                                            >
                                              <ListOrdered className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                            </button>
                                          </div>

                                          <div className="mx-2 hidden h-6 w-px bg-slate-300/90 sm:block" aria-hidden />
                                          {lineSpacingMenuOpen && lineSpacingMenuPosition && typeof document !== "undefined"
                                            ? createPortal(
                                                <div
                                                  ref={lineSpacingMenuRef}
                                                  className="fixed z-[9999] rounded-lg bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                                                  style={{
                                                    left: lineSpacingMenuPosition.left,
                                                    top: lineSpacingMenuPosition.top,
                                                    transform: "translateX(-50%)",
                                                  }}
                                                >
                                                  <div className="flex flex-col gap-1">
                                                    {[
                                                      { label: "Single", value: 1.0 },
                                                      { label: "1.5", value: 1.5 },
                                                      { label: "Double", value: 2.0 },
                                                    ].map((option) => (
                                                      <button
                                                        key={option.label}
                                                        type="button"
                                                        className={`flex w-24 items-center justify-between rounded-md px-2 py-1.5 text-sm font-semibold transition ${
                                                          activeLineSpacing === option.value
                                                            ? "bg-[#E0F2FE] text-[#024d7c]"
                                                            : "text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                        onPointerDown={keepTextEditingActive}
                                                        onClick={() => applyLineSpacing(option.value)}
                                                      >
                                                        <span>{option.label}</span>
                                                        {activeLineSpacing === option.value ? (
                                                          <Check className="h-3.5 w-3.5" />
                                                        ) : null}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>,
                                                document.body,
                                              )
                                            : null}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
				              ) : null}
				                        </AnimatePresence>
			
				                        <div className="relative min-w-0 flex-1 min-h-0 overflow-hidden">
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
                                <div
                                  className="toolbar-font flex h-[45px] items-center justify-between border-b border-slate-200 bg-white px-4"
                                  data-text-toolbar
                                >
				                                  {loading && pages.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#024d7c]" aria-hidden />
                                      <span>Loading</span>
                                    </div>
                                  ) : (
				                                    <p className="text-sm font-semibold text-slate-600">{pages.length} pages</p>
                                  )}
				                                  <button
				                                    type="button"
				                                    onClick={() => setOrganizeMode(true)}
				                                    disabled={pages.length === 0 || organizeMode}
				                                    className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#024d7c] transition hover:bg-slate-100 hover:text-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#51bdff]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50"
				                                  >
				                                    Manage pages
				                                  </button>
				                                </div>
				                                <div
                                    ref={thumbsScrollRef}
                                    className="thumbs-scroll relative min-h-0 flex-1 overflow-y-auto pl-4 pr-0"
                                  >
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
                                            registerThumbNode={registerThumbNode}
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
                            className={`flex w-10 shrink-0 flex-col bg-white ${showPageOrderPanel ? "border-l border-slate-200" : ""}`}
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

      {showImageUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseImageUploadModal} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-[0_40px_120px_rgba(5,10,30,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Add an image</h3>
                <p className="text-sm text-slate-600">Upload a PNG, JPG, or SVG. We&apos;ll drop it on the current page.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseImageUploadModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100">
                <ImageIcon className="h-5 w-5" />
                <span>{imageUploadPreview ? "Replace image" : "Choose an image file"}</span>
                <span className="text-xs font-medium text-slate-500">PNG, JPG, or SVG</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadFileInput} />
              </label>
              {imageUploadPreview ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUploadPreview}
                    alt="Uploaded image preview"
                    className="h-16 w-28 rounded border border-slate-100 object-contain"
                  />
                  <div className="text-sm text-slate-700">Preview</div>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-800">Label (optional)</label>
                <input
                  type="text"
                  value={imageUploadName}
                  onChange={(event) => {
                    setImageUploadName(event.target.value);
                    setImageUploadError(null);
                  }}
                  placeholder="e.g. Logo or Stamp"
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                />
              </div>
              {imageUploadError ? <p className="text-xs font-semibold text-rose-600">{imageUploadError}</p> : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
                  onClick={handleCloseImageUploadModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                  disabled={!imageUploadPreview}
                  onClick={handleSaveUploadedImage}
                >
                  Add to page
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
	        <div className="flex w-full justify-end px-4 py-[6.5px] lg:px-8">
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

      {colorPickerOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={highlightPopoverRef}
              className="fixed z-[9999] w-[230px] rounded-lg bg-white px-3 pb-3 pt-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
              data-text-popover
              style={{
                left: highlightPopoverPosition?.left ?? 0,
                top: highlightPopoverPosition?.top ?? 0,
                opacity: highlightPopoverPosition ? 1 : 0,
                pointerEvents: highlightPopoverPosition ? "auto" : "none",
              }}
            >
              <div className="sr-only">
                {isTextColorPicker
                  ? "Text color"
                  : isShapeBorderPicker
                    ? "Border color"
                    : isShapeFillPicker
                      ? "Fill color"
                      : "Stroke color"}
              </div>
              {!isTextColorPicker ? null : null}
              {isTextColorPicker ? (
                <button
                  type="button"
                  className="mb-2 mt-0 flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-base font-semibold text-slate-900 transition hover:bg-slate-100"
                  onMouseDown={handleColorPickerMouseDown}
                  onClick={() => {
                    applyColorFromPicker("#111827");
                    setColorPickerDraft("#111827");
                  }}
                >
                  <DropletOff className="h-5 w-5 text-slate-900" />
                  <span>None</span>
                </button>
              ) : isShapeFillPicker ? (
                <button
                  type="button"
                  className="mb-2 mt-0 flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => applyColorFromPicker(null)}
                >
                  <DropletOff className="h-4 w-4 text-slate-700" />
                  <span>None / Clear fill</span>
                </button>
              ) : null}
              <div className="grid gap-[2px]">
                {HIGHLIGHT_COLOR_ROWS.map((row, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="flex items-center gap-[2px]">
                    {row.map((value, valueIndex) => {
                      if (!value) {
                        return <span key={`empty-${rowIndex}-${valueIndex}`} className="h-6 w-6" aria-hidden />;
                      }
                      const selectedValue = isTextColorPicker
                        ? selectionTextColorMixed
                          ? ""
                          : (activeTextColor ?? textColor).toLowerCase()
                        : isShapeBorderPicker
                          ? (resolvedShapeBorderColor ?? "").toLowerCase()
                          : isShapeFillPicker
                            ? (resolvedShapeFillColor ?? "").toLowerCase()
                            : penColor.toLowerCase();
                      const isSelected = value.toLowerCase() === selectedValue;
                      const rgb = hexToRgb(value);
                      const luminance = rgb ? 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b : 1;
                      const checkColor = luminance < 0.55 ? "#ffffff" : "#111827";
                      return (
                        <button
                          key={`${value}-${valueIndex}`}
                          type="button"
                          className={`flex h-6 w-6 items-center justify-center rounded-full border transition-transform duration-150 hover:scale-105 ${
                            isSelected ? "border-slate-300" : "border-slate-200 hover:border-slate-300"
                          }`}
                          style={{ backgroundColor: value }}
                          onMouseDown={handleColorPickerMouseDown}
                          onClick={() => {
                            applyColorFromPicker(value);
                          }}
                          aria-label={`${
                            isTextColorPicker
                              ? "Text"
                              : isShapeBorderPicker
                                ? "Border"
                                : isShapeFillPicker
                                  ? "Fill"
                                  : "Stroke"
                          } color ${value}`}
                        >
                          {isSelected ? (
                            <svg className="h-4 w-4" viewBox="0 0 20 20" aria-hidden="true">
                              <path
                                d="M4.5 10.5l3.2 3.2L15.5 6.9"
                                fill="none"
                                stroke={checkColor}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">Custom</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  onMouseDown={handleColorPickerMouseDown}
                  onClick={() => setHighlightCustomOpen((prev) => !prev)}
                  onMouseEnter={(event) => showToolbarTooltip("Add a custom color", event.currentTarget)}
                  onMouseLeave={hideToolbarTooltip}
                  aria-label="Custom color"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  onMouseDown={handleColorPickerMouseDown}
                  onClick={() => {
                    const target =
                      colorPickerOpen === "shape-border"
                        ? "shape-border"
                        : colorPickerOpen === "shape-fill"
                          ? "shape-fill"
                          : colorPickerOpen === "pen"
                            ? "pen"
                            : "text";
                    pickColorFromScreen(target);
                  }}
                  onMouseEnter={(event) => showToolbarTooltip("Pick a custom color", event.currentTarget)}
                  onMouseLeave={hideToolbarTooltip}
                  aria-label="Pick color from screen"
                >
                  <Pipette className="h-4 w-4" />
                </button>
              </div>
              {customTextColors.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {customTextColors.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 transition hover:border-slate-300"
                      style={{ backgroundColor: value }}
                      onMouseDown={handleColorPickerMouseDown}
                      onClick={() => {
                        applyColorFromPicker(value);
                        setColorPickerDraft(value);
                      }}
                      aria-label={`Custom ${
                        isTextColorPicker
                          ? "text"
                          : isShapeBorderPicker
                            ? "border"
                            : isShapeFillPicker
                              ? "fill"
                              : "stroke"
                      } color ${value}`}
                    />
                  ))}
                </div>
              ) : null}
              {highlightCustomOpen ? (
                <div className="mt-3 space-y-3 rounded-md border border-slate-200 p-2">
                  <div
                    className="relative h-28 w-full overflow-hidden rounded-md border border-slate-200"
                    onPointerDown={handleHighlightPlanePointerDown}
                    onPointerMove={handleHighlightPlanePointerMove}
                    onPointerUp={handleHighlightPlanePointerUp}
                    aria-label="Custom color selector"
                    role="presentation"
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(to right, #ffffff, hsl(${highlightCustomHue} 100% 50%))` }}
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000000, transparent)" }} />
                    <div
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
                      style={{
                        left: `${highlightCustomSat}%`,
                        top: `${100 - highlightCustomVal}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-200"
                      style={{ backgroundColor: colorPickerDraft }}
                      aria-hidden="true"
                    />
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={Math.round(highlightCustomHue)}
                      onChange={(event) => {
                        updateHighlightCustomColor(Number(event.target.value), highlightCustomSat, highlightCustomVal);
                      }}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full"
                      style={{
                        background:
                          "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                      }}
                      aria-label="Hue"
                    />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-400">Hex</label>
                      <input
                        value={colorPickerDraft}
                        onChange={(event) => {
                          const next = event.target.value.trim();
                          const normalized = next.startsWith("#") ? next : `#${next}`;
        setColorPickerDraft(normalized.slice(0, 7));
      }}
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#51bdff] focus:ring-2 focus:ring-[#51bdff]/25"
                        aria-label="Hex color"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-400">R</label>
                      <input
                        value={highlightCustomRgb.r}
                        inputMode="numeric"
                        onChange={(event) => handleHighlightRgbChange("r", event.target.value)}
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#51bdff] focus:ring-2 focus:ring-[#51bdff]/25"
                        aria-label="Red channel"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-400">G</label>
                      <input
                        value={highlightCustomRgb.g}
                        inputMode="numeric"
                        onChange={(event) => handleHighlightRgbChange("g", event.target.value)}
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#51bdff] focus:ring-2 focus:ring-[#51bdff]/25"
                        aria-label="Green channel"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-400">B</label>
                      <input
                        value={highlightCustomRgb.b}
                        inputMode="numeric"
                        onChange={(event) => handleHighlightRgbChange("b", event.target.value)}
                        className="h-8 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-600 outline-none focus:border-[#51bdff] focus:ring-2 focus:ring-[#51bdff]/25"
                        aria-label="Blue channel"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {highlightCustomOpen ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    onMouseDown={handleColorPickerMouseDown}
                    onClick={() => setHighlightCustomOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[#024d7c] px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-[#012a44]/25 transition hover:bg-[#013d63]"
                    onMouseDown={handleColorPickerMouseDown}
                    onClick={() => {
                      addCustomTextColor(colorPickerDraft);
                      applyColorFromPicker(colorPickerDraft);
                    }}
                  >
                    Apply
                  </button>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}

      {toolbarTooltip.visible && (!fontMenuOpen || toolbarTooltip.label !== "Font") && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[10000] whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-opacity duration-150"
              style={{ left: toolbarTooltip.x, top: toolbarTooltip.y, transform: "translateX(-50%)" }}
            >
              {toolbarTooltip.label}
            </div>,
            document.body
          )
        : null}
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
        .opacity-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: #e2e8f0;
        }
        .opacity-slider::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: transparent;
        }
        .opacity-slider::-moz-range-progress {
          height: 6px;
          border-radius: 9999px;
          background: #024d7c;
        }
        .opacity-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background-color: #ffffff;
          border: 2px solid #024d7c;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
          margin-top: -4px;
        }
        .opacity-slider::-moz-range-track {
          height: 6px;
          border-radius: 9999px;
          background: #e2e8f0;
        }
        .opacity-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background-color: #ffffff;
          border: 2px solid #024d7c;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
        }
        [data-text-annotation] [contenteditable] span {
          display: inline;
          white-space: inherit;
          word-break: inherit;
          overflow-wrap: inherit;
          line-height: inherit;
        }
        [data-text-annotation] [contenteditable] * {
          line-height: inherit !important;
        }
        [data-text-annotation] ul,
        [data-text-annotation] ol {
          list-style-position: outside;
          padding-left: 1.4em;
          margin: 0.1em 0;
        }
        [data-text-annotation] ul {
          list-style-type: disc;
        }
        [data-text-annotation] ol {
          list-style-type: decimal;
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
