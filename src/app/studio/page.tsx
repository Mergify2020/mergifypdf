"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  PDFDocument,
  rgb,
  LineCapStyle,
  LineJoinStyle,
  degrees,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import { AnimatePresence, motion } from "framer-motion";
import { Highlighter, Minus, Plus, Trash2, Undo2, Eraser, Pencil, RotateCcw, Move, ChevronDown } from "lucide-react";
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
import HeaderLoginButton from "@/components/HeaderLoginButton";
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
type Point = { x: number; y: number };
type DrawingTool = "highlight" | "pencil" | "text";
type HighlightStroke = {
  id: string;
  tool: DrawingTool;
  points: Point[];
  color: string;
  thickness: number;
};
type DraftHighlight = {
  tool: Exclude<DrawingTool, "text">;
  pageId: string;
  points: Point[];
  color: string;
  thickness: number;
};
type HighlightHistoryEntry =
  | { type: "add"; pageId: string; highlight: HighlightStroke }
  | { type: "delete"; pageId: string; highlight: HighlightStroke }
  | { type: "clear"; previous: Record<string, HighlightStroke[]> };

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
const PENCIL_COLOR = "#111827";

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

const HIGHLIGHT_CURSOR =
  "data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 24 L24 2 L30 8 L10 28 L3 29 Z' fill='%23024d7c'/%3E%3Crect x='5' y='25' width='10' height='3' fill='%23ffd43b'/%3E%3C/svg%3E";
const PREVIEW_BASE_SCALE = 1.85;
const MAX_DEVICE_PIXEL_RATIO = 3.5;
const TEXT_PLACEHOLDER = "Type here";
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.95;
const WORKSPACE_SESSION_KEY = "mpdf:files";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const DEFAULT_ASPECT_RATIO = 792 / 612; // fallback letter portrait
const SOFT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3];
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

function persistSourceMetadata(list: SourceRef[]) {
  const storage = getLocalStorage();
  if (!storage) return;
  if (list.length === 0) {
    storage.removeItem(WORKSPACE_SESSION_KEY);
    return;
  }
  const payload = list.map(({ storageId, name, size, updatedAt }) => ({
    id: storageId,
    name,
    size,
    updatedAt,
  }));
  try {
    storage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(payload));
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

function createThumbnailDataUrl(canvas: HTMLCanvasElement) {
  if (canvas.width <= THUMB_MAX_WIDTH) {
    return canvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);
  }
  const ratio = THUMB_MAX_WIDTH / canvas.width;
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = THUMB_MAX_WIDTH;
  thumbCanvas.height = Math.floor(canvas.height * ratio);
  const thumbCtx = thumbCanvas.getContext("2d")!;
  thumbCtx.imageSmoothingEnabled = true;
  thumbCtx.imageSmoothingQuality = "high";
  thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return thumbCanvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);
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


/** One sortable thumbnail tile */
function SortableThumb({
  item,
  index,
  selected,
  onSelect,
}: {
  item: PageItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
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
    <li ref={setNodeRef} style={style} className="w-full" {...attributes}>
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
        className={`group relative mb-4 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md cursor-pointer ${
          selected ? "border-[#0052ff] ring-2 ring-[#0052ff33]" : ""
        }`}
        {...listeners}
      >
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
          Page {index + 1}
        </span>
        <div className="relative w-full" style={{ paddingBottom: getAspectPadding(item.width, item.height) }}>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden group">
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb} alt={`Page ${index + 1}`} className="block h-full w-full object-contain" draggable={false} />
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
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [showDelayOverlay, setShowDelayOverlay] = useState<"intro" | "progress" | null>(null);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activePageIndexState, setActivePageIndex] = useState(0);
  const [shouldCenterOnChange, setShouldCenterOnChange] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [baseScale, setBaseScale] = useState(1);
  const scrollRatioRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilThickness, setPencilThickness] = useState(4);
  const [textMode, setTextMode] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, HighlightStroke[]>>({});
  const [textAnnotations, setTextAnnotations] = useState<Record<string, TextAnnotation[]>>({});
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textFont, setTextFont] = useState<TextFont>("Inter");
  const [textSize, setTextSize] = useState(12);
  const [highlightHistory, setHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [draftHighlight, setDraftHighlight] = useState<DraftHighlight | null>(null);
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
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectNameEditing, setProjectNameEditing] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("Untitled Project");
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [organizeMode, setOrganizeMode] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const viewerScrollRef = previewContainerRef;
  const [viewerWidth, setViewerWidth] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasHydratedSources = useRef(false);
  const objectUrlCacheRef = useRef<Map<string, string>>(new Map());
  const hasHydratedHighlights = useRef(false);
  const MIN_HIGHLIGHT_THICKNESS = 6;
  const MAX_HIGHLIGHT_THICKNESS = 32;
  const MIN_PENCIL_THICKNESS = 1;
  const MAX_PENCIL_THICKNESS = 10;
  const VIEWER_PADDING_X = 60;
  const VIEWER_PADDING_TOP = 40;
  const VIEWER_PADDING_BOTTOM = 120;
  const VIEWER_SCROLL_HEIGHT = "calc(100vh - 260px)";
  const toolSwitchBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition";
  const toolSwitchActive = "bg-[#024d7c] text-white shadow-sm";
  const toolSwitchInactive = "bg-white text-slate-700 hover:bg-slate-50";

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

  /** Rehydrate any stored PDFs from IndexedDB so refreshes survive deployments */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function hydrateFromStorage() {
      const local = getLocalStorage();
      const session = getSessionStorage();
      let raw: string | null = null;
      if (local) raw = local.getItem(WORKSPACE_SESSION_KEY);
      if (!raw && session) {
        raw = session.getItem(WORKSPACE_SESSION_KEY);
        if (raw && local) {
          try {
            local.setItem(WORKSPACE_SESSION_KEY, raw);
          } catch {
            // ignore
          }
        }
        session?.removeItem(WORKSPACE_SESSION_KEY);
      }
      if (!raw) {
        hasHydratedSources.current = true;
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredSourceMeta[];
        if (!Array.isArray(parsed)) {
          local?.removeItem(WORKSPACE_SESSION_KEY);
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
            setSources((prev) => (prev.length > 0 ? prev : restored));
          } else {
            local?.removeItem(WORKSPACE_SESSION_KEY);
            setError("We couldn't restore your previous workspace. Please re-upload your PDFs.");
          }
        }
      } catch (err) {
        console.error("Failed to parse stored workspace", err);
        local?.removeItem(WORKSPACE_SESSION_KEY);
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
  }, []);

  /** Persist source metadata whenever it changes (after hydration) */
  useEffect(() => {
    if (!hasHydratedSources.current || typeof window === "undefined") return;
    persistSourceMetadata(sources);
  }, [sources]);

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
      setLoading(true);
      setError(null);
      const next: PageItem[] = [];
      const startIdx = renderedSourcesRef.current;

      try {
        // Import pdf.js in the browser only
        const pdfjsLib = (await import("pdfjs-dist")) as typeof import("pdfjs-dist") & {
          GlobalWorkerOptions: { workerSrc: string };
        };
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

        const pixelRatio = getDevicePixelRatio();
        const previewScale = PREVIEW_BASE_SCALE;

        // Only render thumbnails for sources we haven't seen yet
        for (let s = startIdx; s < sources.length; s++) {
          const src = sources[s];
          const pdf = await pdfjsLib.getDocument(src.url).promise;
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

            const previewData = canvas.toDataURL("image/png", PREVIEW_IMAGE_QUALITY);
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
          setPages((prev) => [...prev, ...next]);
          renderedSourcesRef.current = sources.length;
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not render previews (file may be encrypted or corrupted).");
      } finally {
        if (!cancelled) setLoading(false);
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
    if (pages.length === 0) {
      if (sources.length === 0) {
        setHighlights({});
        setHighlightHistory([]);
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

    setHighlightHistory((prev) =>
      prev.filter((entry) => (entry.type === "clear" ? true : allowed.has(entry.pageId)))
    );
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
      setActivePageId(page.id);
    }
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
    const rotationDegrees = normalizeRotation(page.rotation);
    const naturalWidth = page.width || 612;
    const naturalHeight = page.height || naturalWidth * DEFAULT_ASPECT_RATIO;
    const rotated = rotationDegrees % 180 !== 0;
    const baseWidth = rotated ? naturalHeight : naturalWidth;
    const baseHeight = rotated ? naturalWidth : naturalHeight;
    return (
      <div
        key={page.id}
        data-page-id={page.id}
        ref={registerPreviewRef(page.id)}
        className="mx-auto w-fit opacity-0 scale-[0.98] animate-[page-enter_0.15s_ease-out_forwards]"
      >
        <div
          className={`relative bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition ${
            idx === activePageIndex ? "shadow-brand/30" : ""
          }`}
          style={{
            width: baseWidth * baseScale * zoomMultiplier,
            aspectRatio: `${baseWidth} / ${baseHeight}`,
          }}
          onClick={() => handleSelectPage(idx)}
        >
          <div
            className="absolute inset-0 flex items-center justify-center overflow-visible"
            style={{
              width: "100%",
              height: "100%",
            }}
          >
            <div
              className="absolute inset-0 bg-white"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transformOrigin: "center",
                cursor:
                  activeDrawingTool === "highlight"
                    ? (`url(${HIGHLIGHT_CURSOR}) 4 24, crosshair` as CSSProperties["cursor"])
                    : activeDrawingTool === "pencil"
                    ? ("crosshair" as CSSProperties["cursor"])
                    : activeDrawingTool === "text"
                    ? ("text" as CSSProperties["cursor"])
                    : undefined,
              }}
              onMouseDown={(event) => handleMarkupPointerDown(page.id, event)}
              onMouseMove={(event) => handleMarkupPointerMove(page.id, event)}
              onMouseUp={() => handleMarkupPointerUp(page.id)}
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
                {pageHighlights.map((stroke) =>
                  stroke.points.length > 1 ? (
                    <polyline
                      key={stroke.id}
                      points={stroke.points.map((pt) => `${pt.x * 1000},${pt.y * 1000}`).join(" ")}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={Math.max(1, stroke.thickness * 1000)}
                      strokeLinecap="round"
                      strokeOpacity={stroke.tool === "pencil" ? 1 : 0.25}
                      style={{
                        pointerEvents: deleteMode ? "stroke" : "none",
                        cursor: deleteMode ? "pointer" : "default",
                      }}
                      onClick={(event) => {
                        if (!deleteMode) return;
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteStroke(page.id, stroke.id);
                      }}
                    />
                  ) : null
                )}
                {draftHighlight?.pageId === page.id && draftHighlight.points.length > 1 ? (
                  <polyline
                    aria-hidden
                    points={draftHighlight.points.map((pt) => `${pt.x * 1000},${pt.y * 1000}`).join(" ")}
                    fill="none"
                    stroke={draftHighlight.color}
                    strokeWidth={Math.max(1, draftHighlight.thickness * 1000)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={draftHighlight.tool === "pencil" ? 1 : 0.25}
                  />
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
              {pageTexts.map((annotation) => {
                const annotationWidth = annotation.width ?? 0.14;
                const annotationHeight = annotation.height ?? 0.06;
                const isDraggingThis = draggingText?.id === annotation.id;
                const isResizingThis = resizingText?.id === annotation.id;
                const isRotatingThis = rotatingText?.id === annotation.id;
                const rotation = annotation.rotation ?? 0;
                const displayRotation = normalizeRotation(rotation);
                const displayFontSize = textSize * zoomMultiplier;
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
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    focusTextAnnotation(annotation.id);
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    focusTextAnnotation(annotation.id);
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
      </div>
    );
  };

  const commitDraftHighlight = useCallback(
    (stroke: DraftHighlight | null, cancel?: boolean) => {
      if (!stroke || cancel || stroke.points.length < 2) {
        return;
      }
      const highlight: HighlightStroke = {
        id: crypto.randomUUID(),
        tool: stroke.tool,
        points: stroke.points.map((pt) => ({ ...pt })),
        color: stroke.color,
        thickness: stroke.thickness,
      };
      setHighlights((existing) => {
        const nextList = existing[stroke.pageId] ? [...existing[stroke.pageId]] : [];
        nextList.push(highlight);
        return { ...existing, [stroke.pageId]: nextList };
      });
      setHighlightHistory((prev) => [...prev, { type: "add", pageId: stroke.pageId, highlight: cloneStroke(highlight) }]);
    },
    []
  );

  useEffect(() => {
    if (!draftHighlight || typeof window === "undefined") return;
    function handleWindowUp() {
      setDraftHighlight((current) => {
        if (!current) return null;
        commitDraftHighlight(current);
        return null;
      });
    }
    window.addEventListener("mouseup", handleWindowUp);
    return () => window.removeEventListener("mouseup", handleWindowUp);
  }, [draftHighlight, commitDraftHighlight]);

  useEffect(() => {
    if (deleteMode) {
      setHighlightMode(false);
      setPencilMode(false);
      setTextMode(false);
      setDraftHighlight(null);
    }
  }, [deleteMode]);

  function getPointerPoint(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      rectWidth: rect.width,
    };
  }

  function getActiveTool(): DrawingTool | null {
    if (highlightMode) return "highlight";
    if (pencilMode) return "pencil";
    if (textMode) return "text";
    return null;
  }

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
  const zoomMultiplier = clamp(zoomPercent / 100, 1, 3);
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
  const pencilButtonOn = pencilMode && !highlightButtonDisabled;
  const textButtonOn = textMode && !highlightButtonDisabled;
  const highlightTrayVisible = (highlightMode || pencilMode || deleteMode || textMode) && !highlightButtonDisabled;
  const highlightActive = highlightButtonOn && !deleteMode;
  const pencilActive = pencilButtonOn && !deleteMode;
  const textActive = textButtonOn && !deleteMode;
  const activeDrawingTool: DrawingTool | null = highlightActive
    ? "highlight"
    : pencilActive
    ? "pencil"
    : textActive
    ? "text"
    : null;
  const highlightCount = useMemo(
    () => Object.values(highlights).reduce((sum, list) => sum + list.length, 0),
    [highlights]
  );
  const textAnnotationCount = useMemo(
    () => Object.values(textAnnotations).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [textAnnotations]
  );
  const hasWorkspaceData =
    pages.length > 0 || highlightCount > 0 || textAnnotationCount > 0 || !!draftHighlight || !!draftTextBox;

  const computeBaseScale = useCallback(() => {
    const container = previewContainerRef.current;
    if (!container || pages.length === 0) return;
    const targetIndex = activePageIndex >= 0 ? activePageIndex : 0;
    const targetPage = pages[targetIndex];
    const naturalWidth = targetPage?.width || 612;
    const naturalHeight = targetPage?.height || naturalWidth * DEFAULT_ASPECT_RATIO;
    const rotation = normalizeRotation(targetPage?.rotation ?? 0);
    const rotated = rotation % 180 !== 0;
    const baseWidth = rotated ? naturalHeight : naturalWidth;
    const baseHeight = rotated ? naturalWidth : naturalHeight;
    const availableWidth = Math.max(container.clientWidth - VIEWER_PADDING_X * 2, 200);
    const availableHeight = Math.max(
      container.clientHeight - (VIEWER_PADDING_TOP + VIEWER_PADDING_BOTTOM),
      200
    );
    setViewerWidth(availableWidth);
    const fitScale = Math.max(0.2, Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
    setBaseScale((prev) => (Math.abs(prev - fitScale) > 0.001 ? fitScale : prev));
  }, [activePageIndex, pages]);

  useEffect(() => {
    if (!shouldCenterOnChange) return;
    const container = previewContainerRef.current;
    const target = activePageIndex >= 0 ? pageRefs.current[activePageIndex] : null;
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
  }, [activePageIndex, zoomMultiplier, baseScale, shouldCenterOnChange]);

  useEffect(() => {
    function handleResize() {
      computeBaseScale();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [computeBaseScale]);

  const setZoomWithScrollPreserved = useCallback(
    (nextPercent: number) => {
      const clamped = clamp(nextPercent, 100, 300);
      const container = previewContainerRef.current;
      if (container) {
        scrollRatioRef.current = {
          x: container.scrollLeft / Math.max(1, container.scrollWidth - container.clientWidth),
          y: container.scrollTop / Math.max(1, container.scrollHeight - container.clientHeight),
        };
      }
      setZoomPercent(clamped);
    },
    []
  );

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const { x, y } = scrollRatioRef.current;
    requestAnimationFrame(() => {
      const maxX = Math.max(0, container.scrollWidth - container.clientWidth);
      const maxY = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollLeft = maxX * x;
      container.scrollTop = maxY * y;
    });
  }, [zoomPercent, baseScale]);

  function handleMarkupPointerDown(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (!event.target || !(event.target as HTMLElement).closest("[data-text-annotation]")) {
      clearTextFocus();
    }
    if (deleteMode) return;
    const tool = getActiveTool();
    if (!tool) return;
    const point = getPointerPoint(event);
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
    const baseThickness = tool === "highlight" ? highlightThickness : pencilThickness;
    setDraftHighlight({
      tool,
      pageId,
      points: [{ x: point.x, y: point.y }],
      color: tool === "highlight" ? HIGHLIGHT_COLORS[highlightColor] : PENCIL_COLOR,
      thickness: baseThickness / point.rectWidth,
    });
    event.preventDefault();
  }

  function handleMarkupPointerMove(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (deleteMode) return;
    if (getActiveTool() === "text") {
      if (!draftTextBox || draftTextBox.pageId !== pageId) return;
      const point = getPointerPoint(event);
      if (!point) return;
      setDraftTextBox((prev) => (prev ? { ...prev, currentX: point.x, currentY: point.y } : prev));
      event.preventDefault();
      return;
    }
    const point = getPointerPoint(event);
    if (!point) return;
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
          (prev.tool === "highlight" ? highlightThickness : pencilThickness) / point.rectWidth,
      };
    });
    if (draftHighlight?.pageId === pageId) {
      event.preventDefault();
    }
  }

  function handleMarkupPointerUp(pageId: string) {
    if (deleteMode) return;
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


  /** Drag end reorders the pages array */
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((x) => x.id === active.id);
    const newIndex = pages.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setPages((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  /** Build final PDF respecting order + keep flags */
  async function handleDownload(forceBypass = false) {
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
        const pageTexts = textAnnotations[p.id] ?? [];
        if (pageHighlights.length > 0) {
          const { width: pageWidth, height: pageHeight } = copied.getSize();
          pageHighlights.forEach((stroke) => {
            const colorValue = hexToRgb(stroke.color);
            if (!colorValue) return;
            for (let i = 1; i < stroke.points.length; i++) {
              const start = stroke.points[i - 1];
              const end = stroke.points[i];
              const opacity = stroke.tool === "pencil" ? 1 : 0.25;
              copied.drawLine({
                start: {
                  x: start.x * pageWidth,
                  y: pageHeight - start.y * pageHeight,
                },
                end: {
                  x: end.x * pageWidth,
                  y: pageHeight - end.y * pageHeight,
                },
                thickness: Math.max(1, stroke.thickness * pageWidth),
                color: rgb(colorValue.r, colorValue.g, colorValue.b),
                opacity,
                lineCap: LineCapStyle.Round,
              });
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
    router.push("/account?view=pricing");
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

  useEffect(() => {
    computeBaseScale();
  }, [computeBaseScale, pages.length, activePageIndex]);

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
    if (typeof document === "undefined") return;
    if (!activeDrawingTool) {
      document.body.style.cursor = "";
      return;
    }
    const previous = document.body.style.cursor;
    document.body.style.cursor =
      activeDrawingTool === "highlight"
        ? `url(${HIGHLIGHT_CURSOR}) 4 24, crosshair`
        : activeDrawingTool === "pencil"
        ? "crosshair"
        : "text";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [activeDrawingTool]);
  useEffect(() => {
    if (!highlightMode && !pencilMode) {
      setDraftHighlight(null);
    }
  }, [highlightMode, pencilMode]);
  const hasAnyHighlights = Object.values(highlights).some((list) => list && list.length > 0);
  const hasUndoHistory = highlightHistory.length > 0;
  useEffect(() => {
    if (!hasAnyHighlights && deleteMode) {
      setDeleteMode(false);
    }
  }, [hasAnyHighlights, deleteMode]);

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

  function adjustPencilThickness(delta: number) {
    setPencilThickness((prev) => clamp(prev + delta, MIN_PENCIL_THICKNESS, MAX_PENCIL_THICKNESS));
  }

  function handleUndoHighlight() {
    setHighlightHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHighlights((map) => {
        switch (last.type) {
          case "add": {
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
          }
          case "delete": {
            const next = { ...map };
            const list = next[last.pageId] ? [...next[last.pageId]] : [];
            list.push(cloneStroke(last.highlight));
            next[last.pageId] = list;
            return next;
          }
          case "clear":
            return cloneHighlightMap(last.previous);
          default:
            return map;
        }
      });
      return prev.slice(0, -1);
    });
  }

  function handleClearHighlights() {
    if (!hasAnyHighlights) return;
    setDraftHighlight(null);
    setDeleteMode(false);
    setHighlights((current) => {
      const snapshot = cloneHighlightMap(current);
      setHighlightHistory((prev) => [...prev, { type: "clear", previous: snapshot }]);
      return {};
    });
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
    }
  }

  function handleToggleDeleteMode() {
    if (!hasAnyHighlights && !deleteMode) return;
    setDeleteMode((prev) => {
      const next = !prev;
      if (next) {
        setHighlightMode(false);
        setPencilMode(false);
        setDraftHighlight(null);
      }
      return next;
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f3f6fb]">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="Back to workspace">
            <Image src="/logo-wordmark2.svg" alt="MergifyPDF" width={160} height={40} priority />
          </Link>
          {authSession?.user ? <WorkspaceSettingsMenu /> : <HeaderLoginButton />}
        </div>
        <div className="mx-auto w-full px-4 pb-4 lg:px-10">
          <div className="bg-white shadow-sm rounded-lg px-4 py-2 flex flex-col gap-2 w-full max-w-[1400px] mx-auto">
            <div className="flex flex-wrap items-center justify-between w-full gap-3 align-middle">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-[320px]">
                  {projectNameEditing ? (
                    <input
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                      value={projectNameDraft}
                      onChange={(event) => {
                        setProjectNameDraft(event.target.value);
                        if (projectNameError) setProjectNameError(null);
                      }}
                      placeholder="Name your project"
                    />
                  ) : (
                    <input
                      className="h-10 w-full cursor-text rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-900 shadow-inner outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70"
                      value={projectName}
                      readOnly
                      aria-readonly="true"
                      onClick={() => {
                        setProjectNameDraft(projectName);
                        setProjectNameError(null);
                        setProjectNameEditing(true);
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setProjectNameDraft(projectName);
                      setProjectNameError(null);
                      setProjectNameEditing(true);
                    }}
                    className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    aria-label="Edit project name"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path
                        d="M16.5 3.5a2.121 2.121 0 013 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                    onClick={() => handlePageStep(-1)}
                    disabled={activePageIndex <= 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="text-xs font-semibold text-slate-700">
                    Page {activePageIndex >= 0 ? activePageIndex + 1 : 0} / {pages.length || 0}
                  </div>
                  <button
                    type="button"
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                    onClick={() => handlePageStep(1)}
                    disabled={activePageIndex === pages.length - 1 || pages.length === 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                  <button
                    type="button"
                    aria-label="Zoom out"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40"
                    onClick={() => setZoomWithScrollPreserved(zoomPercent - 25)}
                    disabled={zoomPercent <= 100}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={25}
                    value={zoomPercent}
                    onChange={(e) => setZoomWithScrollPreserved(Number(e.target.value))}
                    className="horizontal-slider w-28"
                  />
                  <span className="min-w-[44px] text-right text-xs font-semibold text-slate-800">{zoomLabel}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
                <button
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleAddClick}
                  disabled={pages.length === 0}
                >
                  Add pages
                </button>
                <input
                  ref={addInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleAddChange}
                />
                <button
                  className="rounded-lg bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#012a44]/30 transition hover:-translate-y-0.5 hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-1 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#d1e3f2] disabled:text-[#5f7085] disabled:shadow-none"
                  onClick={() => handleDownload()}
                  disabled={downloadDisabled}
                >
                  {busy ? "Building..." : "Download pages"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between w-full gap-3 align-middle">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    aria-pressed={!highlightButtonOn && !pencilButtonOn}
                    className={`${toolSwitchBase} ${
                      !highlightButtonOn && !pencilButtonOn && !textButtonOn ? toolSwitchActive : toolSwitchInactive
                    }`}
                    onClick={() => {
                      setHighlightMode(false);
                      setPencilMode(false);
                      setTextMode(false);
                      setDeleteMode(false);
                      setDraftHighlight(null);
                    }}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    disabled={highlightButtonDisabled}
                    aria-pressed={highlightButtonOn}
                    className={`${toolSwitchBase} ${
                      highlightButtonOn ? toolSwitchActive : toolSwitchInactive
                    } border-l border-slate-200 disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() =>
                      setHighlightMode((prev) => {
                        const next = !prev;
                        if (next) {
                          setDeleteMode(false);
                          setPencilMode(false);
                          setTextMode(false);
                        }
                        return next;
                      })
                    }
                  >
                    <Highlighter className="h-4 w-4" />
                    Highlight
                  </button>
                  <button
                    type="button"
                    disabled={highlightButtonDisabled}
                    aria-pressed={pencilButtonOn}
                    className={`${toolSwitchBase} ${
                      pencilButtonOn ? toolSwitchActive : toolSwitchInactive
                    } border-l border-slate-200 disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() =>
                      setPencilMode((prev) => {
                        const next = !prev;
                        if (next) {
                          setDeleteMode(false);
                          setHighlightMode(false);
                          setTextMode(false);
                        }
                        return next;
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                    Pencil
                  </button>
                  <button
                    type="button"
                    disabled={highlightButtonDisabled}
                    aria-pressed={textButtonOn}
                    className={`${toolSwitchBase} ${
                      textButtonOn ? toolSwitchActive : toolSwitchInactive
                    } border-l border-slate-200 disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() =>
                      setTextMode((prev) => {
                        const next = !prev;
                        if (next) {
                          setDeleteMode(false);
                          setHighlightMode(false);
                          setPencilMode(false);
                          setDraftHighlight(null);
                        }
                        return next;
                      })
                    }
                  >
                    Text
                  </button>
                </div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
                <button
                  type="button"
                  onClick={() => setOrganizeMode(true)}
                  disabled={pages.length === 0 || organizeMode}
                  aria-pressed={organizeMode}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Manage pages
                </button>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndoHighlight}
                  disabled={!hasUndoHistory}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearHighlights}
                  disabled={!hasAnyHighlights}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
            {projectNameError ? (
              <div className="px-1 pb-1 text-sm text-rose-500">{projectNameError}</div>
            ) : null}
            <div
              className={`border-t border-slate-100/80 bg-slate-50/80 px-2 transition-all duration-300 ease-out sm:px-4 ${
                highlightTrayVisible
                  ? "pointer-events-auto max-h-40 translate-x-0 opacity-100 py-3"
                  : "pointer-events-none max-h-0 -translate-x-4 opacity-0 py-0"
              }`}
            >
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleDeleteMode}
                    disabled={!hasAnyHighlights && !deleteMode}
                    aria-pressed={deleteMode}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      deleteMode
                        ? "border-transparent bg-slate-900 text-white shadow-lg shadow-slate-900/25"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:hover:border-slate-200"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Select markups
                  </button>
                  {deleteMode ? (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                      Tap a highlight or pencil mark to remove it
                    </span>
                  ) : null}
                </div>
                {textMode ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[0.7rem] font-semibold text-slate-700 shadow-sm">
                    <button
                      type="button"
                      className={`rounded px-2 py-1 transition ${
                        textBold ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                      }`}
                      onClick={() => setTextBold((prev) => !prev)}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className={`rounded px-2 py-1 transition ${
                        textItalic ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                      }`}
                      onClick={() => setTextItalic((prev) => !prev)}
                    >
                      I
                    </button>
                    <div className="relative" ref={fontMenuRef}>
                      <button
                        type="button"
                        onClick={() => setFontMenuOpen((prev) => !prev)}
                        className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-inner transition hover:border-slate-300 focus:outline-none"
                      >
                        <span className="truncate" style={{ fontFamily: TEXT_FONT_OPTIONS[textFont].cssFamily }}>
                          {TEXT_FONT_OPTIONS[textFont].label}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                      {fontMenuOpen ? (
                        <div className="absolute z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                          <div className="max-h-56 overflow-y-auto">
                            {textFontEntries.map(([key, option]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setTextFont(key);
                                  setFontMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                                  textFont === key ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700"
                                }`}
                                style={{ fontFamily: option.cssFamily }}
                              >
                                <span>{option.label}</span>
                                {textFont === key ? (
                                  <span className="text-[10px] uppercase text-slate-500">Active</span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[0.65rem] text-slate-500">Size</span>
                      <input
                        type="range"
                        min={10}
                        max={28}
                        value={textSize}
                        onChange={(event) => setTextSize(Number(event.target.value))}
                        className="h-1 w-24 accent-slate-500"
                      />
                      <span className="text-[0.65rem] text-slate-700 min-w-[28px] text-right">
                        {textSize}px
                      </span>
                    </div>
                  </div>
                ) : null}
                {highlightActive ? (
                  <>
                    <div className="flex items-center gap-2">
                      {highlightColorEntries.map(([key, value]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setHighlightColor(key)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            highlightColor === key
                              ? "border-[#024d7c] ring-2 ring-[#024d7c]/30"
                              : "border-white/30 hover:border-slate-300"
                          }`}
                          style={{ backgroundColor: value }}
                          aria-label={`Use ${key} highlighter`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                      <button
                        type="button"
                        onClick={() => adjustHighlightThickness(-2)}
                        disabled={highlightThickness <= MIN_HIGHLIGHT_THICKNESS}
                        className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span>{Math.round(highlightThickness)} px</span>
                      <button
                        type="button"
                        onClick={() => adjustHighlightThickness(2)}
                        disabled={highlightThickness >= MAX_HIGHLIGHT_THICKNESS}
                        className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : null}
                {pencilActive ? (
                  <>
                    <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                        Streak
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustPencilThickness(-1)}
                        disabled={pencilThickness <= MIN_PENCIL_THICKNESS}
                        className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span>{Math.round(pencilThickness)} px</span>
                      <button
                        type="button"
                        onClick={() => adjustPencilThickness(1)}
                        disabled={pencilThickness >= MAX_PENCIL_THICKNESS}
                        className="rounded-full border border-transparent p-1 transition hover:border-slate-200 hover:bg-white disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                      Ink color: black
                    </span>
                  </>
                ) : null}
              </div>
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

            {loading && (
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm">
                Rendering previews...
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden">
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

                {!organizeMode && !loading && pages.length > 0 ? (
                  <motion.div
                    key="preview-view"
                    initial={{ opacity: 0.95, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={VIEW_TRANSITION}
                    className="editor-shell mx-auto flex h-full min-h-0 w-full max-w-[1280px] flex-1 flex-col gap-6 overflow-hidden px-4 lg:flex-row lg:items-start lg:gap-6 lg:px-6"
                  >
                    <div className="viewer flex-1 min-h-0 overflow-hidden">
                      <div className="flex h-full min-h-0 flex-col overflow-hidden">
                        <div
                      ref={viewerScrollRef}
                      className="viewer-shell viewer-scroll mx-auto flex flex-1 min-h-0 w-full flex-col items-start justify-start"
                      style={{
                        padding: `${VIEWER_PADDING_TOP}px ${VIEWER_PADDING_X}px ${VIEWER_PADDING_BOTTOM}px`,
                        maxHeight: VIEWER_SCROLL_HEIGHT,
                        overflowY: "auto",
                        overflowX: "hidden",
                        scrollbarGutter: "stable both-edges",
                      }}
                    >
                          <div className="flex w-full flex-col items-center gap-8">
                            {activePageIndex >= 0 && pages[activePageIndex]
                              ? renderPreviewPage(pages[activePageIndex], activePageIndex)
                              : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="sidebar w-full lg:w-[260px] lg:shrink-0">
                      <div className="flex h-full flex-col rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-white">Page order</p>
                          <p className="text-xs text-slate-300">Tap to focus or drag to reorder</p>
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                            <ul className="mt-4 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
                              {pages.map((p, i) => (
                                <SortableThumb
                                  key={p.id}
                                  item={p}
                                  index={i}
                                  selected={p.id === activePageId}
                                  onSelect={() => handleSelectPage(i)}
                                />
                              ))}
                            </ul>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </aside>
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
                    className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-[#024d7c] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/20 transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
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
                  className="h-full w-full rounded-full bg-gradient-to-r from-[#0ea5e9] via-[#2563eb] to-[#4c1d95]"
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
      <style jsx global>{`
        .horizontal-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          background-color: #e5e7eb;
          cursor: pointer;
        }
        .horizontal-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background-color: #111827;
          border: none;
          margin-top: -4px;
        }
        .horizontal-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background-color: #111827;
          border: none;
        }
        .horizontal-slider::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background-color: #e5e7eb;
        }
        .viewer-scroll {
          overflow: auto;
          scrollbar-width: auto;
        }
        .viewer-scroll::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .viewer-scroll::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 9999px;
        }
        .viewer-scroll::-webkit-scrollbar-track {
          background-color: #e5e7eb;
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
