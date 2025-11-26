"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
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
import {
  Highlighter,
  Minus,
  Plus,
  Trash2,
  Undo2,
  Eraser,
  Pencil,
  RotateCcw,
  Move,
  ChevronDown,
  Signature as SignatureIcon,
  UploadCloud,
  X,
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
const PENCIL_COLOR = "#111827";

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

  const HIGHLIGHT_CURSOR =
    "data:image/svg+xml;utf8,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 24 L24 2 L30 8 L10 28 L3 29 Z' fill='%23024d7c'/%3E%3Crect x='5' y='25' width='10' height='3' fill='%23ffd43b'/%3E%3C/svg%3E";
const PREVIEW_BASE_SCALE = 3;
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
const BASE_ZOOM_MULTIPLIER = 1; // true 100% baseline
const MAX_ZOOM_MULTIPLIER = 2.5; // cap matches previous 250% even when UI shows 300%
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
  const [zoomPercent, setZoomPercent] = useState(125);
  const [baseScale, setBaseScale] = useState(1);
  const [userAdjustedZoom, setUserAdjustedZoom] = useState(false);
  const scrollRatioRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0 });
  const [previewHeightLimit, setPreviewHeightLimit] = useState<number | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilThickness, setPencilThickness] = useState(4);
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
  const [isErasing, setIsErasing] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectNameEditing, setProjectNameEditing] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("Untitled Project");
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [organizeMode, setOrganizeMode] = useState(false);

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
  const MIN_PENCIL_THICKNESS = 1;
  const MAX_PENCIL_THICKNESS = 10;
  const toolSwitchBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold transition";
  const toolSwitchActive = "bg-[#024d7c] text-white shadow-sm";
  const toolSwitchInactive = "bg-white text-slate-700 hover:bg-slate-50";
  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition";
  const buttonNeutral =
    `${buttonBase} border border-slate-200 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50`;
  const buttonPrimary =
    `${buttonBase} bg-[#024d7c] text-white shadow-md shadow-[#012a44]/30 hover:-translate-y-0.5 hover:bg-[#013d63]`;
  const toolButtonBase = "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition";
  const toolButtonInactive =
    "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
  const toolButtonActive = "border-transparent bg-[#024d7c] text-white shadow-sm";
  const controlButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40";
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

  /** Restore saved signatures for signed-in users from the API */
  useEffect(() => {
    if (!authSession?.user?.id || hasHydratedSignatures.current) return;
    hasHydratedSignatures.current = true;
    let cancelled = false;
    const hydrate = async () => {
      try {
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
    const pageSignatures = signaturePlacements[page.id] ?? [];
    const rotationDegrees = normalizeRotation(page.rotation);
    const naturalWidth = page.width || 612;
    const naturalHeight = page.height || naturalWidth * DEFAULT_ASPECT_RATIO;
    const rotated = rotationDegrees % 180 !== 0;
    const baseWidth = rotated ? naturalHeight : naturalWidth;
    const baseHeight = rotated ? naturalWidth : naturalHeight;
    const effectiveScale = baseScale * zoomMultiplier;
    const fittedWidth = baseWidth * effectiveScale;
    const fittedHeight = baseHeight * effectiveScale;
    const heightLimit =
      zoomPercent > 125 && previewHeightLimit ? previewHeightLimit * 1.08 : null; // allow a bit more than the sidebar to avoid early clipping
    const displayHeight =
      heightLimit && heightLimit > 0 ? Math.min(fittedHeight, heightLimit) : fittedHeight;
    const clipped = heightLimit != null && displayHeight < fittedHeight;
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
            width: fittedWidth,
            height: displayHeight,
            overflow: clipped ? "hidden" : undefined,
          }}
          onClick={() => handleSelectPage(idx)}
        >
          <div
            className="absolute inset-0 flex items-start justify-center overflow-visible"
            style={{ width: "100%", height: "100%" }}
          >
            <div
              className="absolute left-0 top-0 bg-white"
            style={{
              width: fittedWidth,
              height: fittedHeight,
              transform: `rotate(${rotationDegrees}deg)`,
              transformOrigin: "top right",
              cursor: deleteMode
                ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"])
                : activeDrawingTool === "highlight"
                ? (`url(${HIGHLIGHT_CURSOR}) 4 24, crosshair` as CSSProperties["cursor"])
                : activeDrawingTool === "pencil"
                ? ("crosshair" as CSSProperties["cursor"])
                : activeDrawingTool === "text"
                ? ("text" as CSSProperties["cursor"])
                : undefined,
            }}
            onMouseDown={(event) => {
              if (deleteMode) {
                setIsErasing(true);
                event.preventDefault();
              }
              handleMarkupPointerDown(page.id, event);
            }}
            onMouseMove={(event) => handleMarkupPointerMove(page.id, event)}
            onMouseUp={() => {
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
                {deleteMode
                  ? pageHighlights.map((stroke) =>
                      stroke.points.length > 1 ? (
                        <polyline
                          key={`${stroke.id}-hit`}
                          points={stroke.points.map((pt) => `${pt.x * 1000},${pt.y * 1000}`).join(" ")}
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
                    )
                  : null}
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
                        cursor: deleteMode
                          ? ("url('/icons/eraser.svg') 4 4, auto" as CSSProperties["cursor"])
                          : "default",
                      }}
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
    setPencilMode(false);
    setTextMode(false);
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
  const zoomMultiplier = clamp(
    (zoomPercent / 100) * (MAX_ZOOM_MULTIPLIER / 3), // 300% label maps to 250% effective
    0.8,
    MAX_ZOOM_MULTIPLIER
  );
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
  const signatureButtonOn = signaturePanelMode !== "none" || showSignatureHub;
  const highlightActive = highlightButtonOn && !deleteMode;
  const pencilActive = pencilButtonOn && !deleteMode;
  const textActive = textButtonOn && !deleteMode;
  const mobileCaptureLink = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/sign-on-mobile` : "https://mergifypdf.com/sign-on-mobile"),
    []
  );
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
  const signaturePlacementCount = useMemo(
    () => Object.values(signaturePlacements).reduce((sum, list) => sum + (list?.length ?? 0), 0),
    [signaturePlacements]
  );
  const hasAnyTextAnnotations = textAnnotationCount > 0;
  const hasAnyAnnotations = highlightCount > 0 || hasAnyTextAnnotations || signaturePlacementCount > 0;
  useEffect(() => {
    updatePreviewHeightLimit();
  }, [updatePreviewHeightLimit, pages.length, activePageIndex]);
  const hasWorkspaceData =
    pages.length > 0 ||
    highlightCount > 0 ||
    textAnnotationCount > 0 ||
    signaturePlacementCount > 0 ||
    !!draftHighlight ||
    !!draftTextBox;

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
    const availableWidth = Math.max(container.clientWidth, 200);
    const availableHeight = Math.max(container.clientHeight, 200);
    const fitScale = Math.max(
      0.2,
      Math.min(availableWidth / baseWidth, availableHeight / baseHeight, 1) * 0.85 // start smaller so ~75% height is visible at 100%
    );
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
      if (userAdjustedZoom) return; // keep user-chosen zoom steady across resizes
      computeBaseScale();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [computeBaseScale, userAdjustedZoom]);

  const setZoomWithScrollPreserved = useCallback(
    (nextPercent: number) => {
      const clamped = clamp(nextPercent, 100, 300);
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
      const targetLeft = x * container.scrollWidth - container.clientWidth / 2;
      container.scrollLeft = clamp(targetLeft, 0, maxX);
      container.scrollTop = clamp(maxY * y, 0, maxY);
    });
  }, [zoomPercent, baseScale]);

  function handleMarkupPointerDown(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (pendingSignatureForPlacement) {
      const point = getPointerPoint(event);
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
    if (typeof document === "undefined") return;
    if (!activeDrawingTool && !deleteMode) {
      document.body.style.cursor = "";
      return;
    }
    const previous = document.body.style.cursor;
    if (deleteMode) {
      document.body.style.cursor = "url('/icons/eraser.svg') 4 4, auto";
    } else {
      document.body.style.cursor =
        activeDrawingTool === "highlight"
          ? `url(${HIGHLIGHT_CURSOR}) 4 24, crosshair`
          : activeDrawingTool === "pencil"
          ? "crosshair"
          : "text";
    }
    return () => {
      document.body.style.cursor = previous;
    };
  }, [activeDrawingTool, deleteMode]);
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
    if (!hasAnyAnnotations) return;
    setDraftHighlight(null);
    setDeleteMode(false);
    setIsErasing(false);
    setHighlights((current) => {
      const snapshot = cloneHighlightMap(current);
      if (Object.keys(current).length > 0) {
        setHighlightHistory((prev) => [...prev, { type: "clear", previous: snapshot }]);
      }
      return {};
    });
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
          <div className="w-full max-w-[1400px] mx-auto rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex w-full flex-wrap items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-2 min-w-[260px]">
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
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

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Zoom</span>
                <button
                  type="button"
                  aria-label="Zoom out"
                  className={controlButtonClass}
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
                  className="horizontal-slider w-32"
                />
                <span className="min-w-[44px] text-right text-sm font-semibold text-slate-800">{zoomLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  className={controlButtonClass}
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
                  className={controlButtonClass}
                  onClick={() => handlePageStep(1)}
                  disabled={activePageIndex === pages.length - 1 || pages.length === 0}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={highlightButtonDisabled}
                  aria-pressed={highlightButtonOn}
                  className={`${toolButtonBase} ${highlightButtonOn ? toolButtonActive : toolButtonInactive}`}
                  onClick={() =>
                    setHighlightMode((prev) => {
                      setShowSignatureHub(false);
                      setSignaturePanelMode("none");
                      setPendingSignatureForPlacement(null);
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
                  className={`${toolButtonBase} ${pencilButtonOn ? toolButtonActive : toolButtonInactive}`}
                  onClick={() =>
                    setPencilMode((prev) => {
                      setShowSignatureHub(false);
                      setSignaturePanelMode("none");
                      setPendingSignatureForPlacement(null);
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
                  className={`${toolButtonBase} ${textButtonOn ? toolButtonActive : toolButtonInactive}`}
                  onClick={() =>
                    setTextMode((prev) => {
                      setShowSignatureHub(false);
                      setSignaturePanelMode("none");
                      setPendingSignatureForPlacement(null);
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
                <button
                  type="button"
                  aria-pressed={signatureButtonOn}
                  className={`${toolButtonBase} ${signatureButtonOn ? toolButtonActive : toolButtonInactive}`}
                  onClick={() => {
                    setShowSignatureHub(true);
                    setSignatureHubStep("gallery");
                    setSignaturePanelMode("none");
                    setPendingSignatureForPlacement(null);
                    setHighlightMode(false);
                    setPencilMode(false);
                    setTextMode(false);
                    setDeleteMode(false);
                  }}
                >
                  <SignatureIcon className="h-4 w-4" />
                  Signature
                  {savedSignatures.length > 0 ? (
                    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-white/80 px-1 text-[0.65rem] font-bold text-[#024d7c]">
                      {savedSignatures.length}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setOrganizeMode(true)}
                  disabled={pages.length === 0 || organizeMode}
                  aria-pressed={organizeMode}
                  className={`${toolButtonBase} ${organizeMode ? toolButtonActive : toolButtonInactive}`}
                >
                  Manage pages
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={`${toolButtonBase} ${toolButtonInactive}`}
                  onClick={handleUndoHighlight}
                  disabled={!hasUndoHistory}
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
                <button
                  className={`${toolButtonBase} ${deleteMode ? toolButtonActive : toolButtonInactive}`}
                  onClick={handleToggleDeleteMode}
                  aria-pressed={deleteMode}
                  disabled={!hasAnyAnnotations && !deleteMode}
                >
                  <Eraser className="h-4 w-4" />
                  Eraser
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  className={`${buttonPrimary} px-5 py-2`}
                  onClick={() => handleDownload()}
                  disabled={downloadDisabled}
                >
                  {busy ? "Building..." : "Download pages"}
                </button>
                <button
                  className={`${buttonNeutral} px-5 py-2`}
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
              </div>
            </div>
            {projectNameError ? (
              <div className="px-1 pb-1 text-sm text-rose-500">{projectNameError}</div>
            ) : null}

            {highlightActive || pencilActive ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
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
                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">Streak</span>
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
            ) : null}
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
                  className="editor-shell mx-auto flex h-full min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden px-4 lg:px-6"
                >
                    <div className="flex h-full min-h-0 w-full">
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <div
                          ref={viewerScrollRef}
                          className={`viewer-scroll relative flex h-full w-full overflow-auto ${deleteMode ? "eraser-cursor" : ""}`}
                          style={{ scrollbarGutter: "stable both-edges" }}
                        >
                          <div className="relative mx-auto flex min-w-full items-start justify-center gap-6 pr-4">
                            <div className="flex w-fit justify-center">
                              <div id="pdf-viewport" className="origin-top flex w-fit flex-col gap-8">
                                {activePageIndex >= 0 && pages[activePageIndex]
                                  ? renderPreviewPage(pages[activePageIndex], activePageIndex)
                                  : null}
                              </div>
                            </div>

                            <aside className="w-[260px] shrink-0">
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
                          </div>
                        </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">Create:</span>
                  <button
                    type="button"
                    className={signatureTabBase}
                    onClick={() => {
                      setSignatureHubStep("type");
                      setTypeSignatureText("");
                      setTypedSignatureError(null);
                    }}
                  >
                    <span className="text-xs font-semibold">Type</span>
                  </button>
                  <button type="button" className={signatureTabBase} onClick={handleOpenDrawFromHub}>
                    Draw
                  </button>
                  <button type="button" className={signatureTabBase} onClick={handleOpenUploadFromHub}>
                    Upload
                  </button>
                  <button type="button" className={signatureTabBase} onClick={() => setSignatureHubStep("qr")}>
                    QR code
                  </button>
                  <button type="button" className={signatureTabBase} onClick={() => setSignatureHubStep("email")}>
                    Email
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
        .eraser-cursor,
        .eraser-cursor * {
          cursor: url("/icons/eraser.svg") 4 4, auto !important;
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
