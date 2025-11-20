"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import dynamic from "next/dynamic";
import { PDFDocument, rgb, LineCapStyle, LineJoinStyle, degrees } from "pdf-lib";
import { Highlighter, Minus, Plus, Trash2, Undo2, Eraser, Pencil, RotateCcw } from "lucide-react";
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
type DrawingTool = "highlight" | "pencil";
type HighlightStroke = {
  id: string;
  tool: DrawingTool;
  points: Point[];
  color: string;
  thickness: number;
};
type DraftHighlight = {
  tool: DrawingTool;
  pageId: string;
  points: Point[];
  color: string;
  thickness: number;
};
type HighlightHistoryEntry =
  | { type: "add"; pageId: string; highlight: HighlightStroke }
  | { type: "delete"; pageId: string; highlight: HighlightStroke }
  | { type: "clear"; previous: Record<string, HighlightStroke[]> };

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
const THUMB_MAX_WIDTH = 200;
const PREVIEW_IMAGE_QUALITY = 0.95;
const WORKSPACE_SESSION_KEY = "mpdf:files";
const WORKSPACE_DB_NAME = "mpdf-file-store";
const WORKSPACE_DB_STORE = "files";
const WORKSPACE_HIGHLIGHTS_KEY = "mpdf:highlights";
const DEFAULT_ASPECT_RATIO = 792 / 612; // fallback letter portrait
const ORGANIZER_CARD_SIZE = 450;
const ORGANIZER_CARD_PADDING = 34;

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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };
  const rotationDegrees = normalizeRotation(item.rotation);

  return (
    <li ref={setNodeRef} style={style} className="w-full" {...attributes} {...listeners}>
      <button
        type="button"
        aria-label={`Focus page ${index + 1}`}
        onClick={onSelect}
        className={`group block w-full rounded-2xl bg-white/95 shadow-sm ring-1 transition ${
          selected ? "ring-brand shadow-brand/30" : "ring-slate-200 hover:ring-brand/40 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between px-3 pt-3 text-xs font-semibold text-slate-500">
          <span className="text-slate-900">Page {index + 1}</span>
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-semibold text-white ${
              selected ? "bg-brand" : "bg-slate-900/70"
            }`}
          >
            {index + 1}
          </span>
        </div>
        <div className="relative mt-3 w-full" style={{ paddingBottom: getAspectPadding(item.width, item.height) }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ transform: `rotate(${rotationDegrees}deg)`, transformOrigin: "center" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumb}
                alt={`Page ${index + 1}`}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function SortableOrganizeTile({
  item,
  index,
  onRotate,
  onDelete,
}: {
  item: PageItem;
  index: number;
  onRotate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };
  const rotationDegrees = normalizeRotation(item.rotation);

  return (
    <div ref={setNodeRef} style={style} className="flex h-full flex-col gap-3" {...attributes} {...listeners}>
      <div className="relative flex w-full justify-center">
        <div
          className="flex items-center justify-center overflow-visible"
          style={{
            height: `${ORGANIZER_CARD_SIZE}px`,
            width: `${ORGANIZER_CARD_SIZE}px`,
            padding: `${ORGANIZER_CARD_PADDING * 1.5}px`,
          }}
        >
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              transform: `rotate(${rotationDegrees}deg)`,
              transformOrigin: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.preview}
              alt={`Page ${index + 1}`}
              className="h-full rounded-none object-contain"
              style={{
                width: "auto",
                maxWidth: "none",
                filter: "drop-shadow(0px 28px 60px rgba(15,23,42,0.25))",
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 px-2 pb-8">
        <div className="text-lg font-semibold text-slate-800">{index + 1}</div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Rotate page"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRotate();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9cc7ff] bg-[#e8f1ff] text-slate-700 shadow-[0_12px_35px_rgba(24,87,191,0.25)] transition hover:-translate-y-0.5"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-400 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
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
  const [zoom, setZoom] = useState(1);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColorKey>("yellow");
  const [highlightThickness, setHighlightThickness] = useState(14);
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilThickness, setPencilThickness] = useState(4);
  const [highlights, setHighlights] = useState<Record<string, HighlightStroke[]>>({});
  const [highlightHistory, setHighlightHistory] = useState<HighlightHistoryEntry[]>([]);
  const [draftHighlight, setDraftHighlight] = useState<DraftHighlight | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectNameEditing, setProjectNameEditing] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("Untitled Project");
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [organizeMode, setOrganizeMode] = useState(false);

  const addInputRef = useRef<HTMLInputElement>(null);
  const renderedSourcesRef = useRef(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewNodeMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasHydratedSources = useRef(false);
  const objectUrlCacheRef = useRef<Map<string, string>>(new Map());
  const hasHydratedHighlights = useRef(false);
  const MIN_HIGHLIGHT_THICKNESS = 6;
  const MAX_HIGHLIGHT_THICKNESS = 32;
  const MIN_PENCIL_THICKNESS = 1;
  const MAX_PENCIL_THICKNESS = 10;

  // Better drag in grids
  const sensors = useSensors(useSensor(PointerSensor));

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
      return;
    }
    if (!activePageId || !pages.some((p) => p.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId]);

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

  function handleSelectPage(id: string) {
    setActivePageId(id);
    const node = previewNodeMap.current.get(id);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function registerPreviewRef(id: string) {
    return (node: HTMLDivElement | null) => {
      if (node) {
        previewNodeMap.current.set(id, node);
      } else {
        previewNodeMap.current.delete(id);
      }
    };
  }

  const renderPreviewPage = (page: PageItem, idx: number) => {
    const pageHighlights = highlights[page.id] ?? [];
    const rotationDegrees = normalizeRotation(page.rotation);
    return (
      <div
        key={page.id}
        data-page-id={page.id}
        ref={registerPreviewRef(page.id)}
        className="mx-auto w-full max-w-[1500px]"
      >
        <div
          className={`relative bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] ${
            activePageId === page.id ? "ring-2 ring-brand/50 shadow-brand/30" : ""
          }`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="relative w-full" style={{ paddingBottom: getAspectPadding(page.width, page.height) }}>
            <div className="absolute inset-0 flex items-center justify-center">
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
                      : undefined,
                }}
                onMouseDown={(event) => handleMarkupPointerDown(page.id, event)}
                onMouseMove={(event) => handleMarkupPointerMove(page.id, event)}
                onMouseUp={() => handleMarkupPointerUp(page.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.preview} alt={`Page ${idx + 1}`} className="h-full w-full object-contain" draggable={false} />
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
              </div>
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
    if (!highlightMode && !pencilMode) {
      setDraftHighlight(null);
    }
  }, [highlightMode, pencilMode]);

  useEffect(() => {
    if (deleteMode) {
      setHighlightMode(false);
      setPencilMode(false);
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
    return null;
  }

  function handleMarkupPointerDown(pageId: string, event: ReactMouseEvent<HTMLDivElement>) {
    if (deleteMode) return;
    const tool = getActiveTool();
    if (!tool) return;
    const point = getPointerPoint(event);
    if (!point) return;
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
      handleSelectPage(targetPage.id);
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
      setShowDownloadGate(true);
      return;
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
      for (const p of pages) {
        const srcDoc = docCache.get(p.srcIdx)!;
        const [copied] = await out.copyPages(srcDoc, [p.pageIdx]);
        copied.setRotation(degrees(p.rotation ?? 0));
        const pageHighlights = highlights[p.id] ?? [];
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

  const itemsIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const downloadDisabled = busy || pages.length === 0;
  const activePageIndex = pages.findIndex((p) => p.id === activePageId);
  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const minZoom = 0.6;
  const maxZoom = 2;
  const zoomStep = 0.1;
  const canZoomOut = zoom > minZoom + 0.001;
  const canZoomIn = zoom < maxZoom - 0.001;
  const highlightButtonDisabled = pages.length === 0 || loading;
  const highlightColorEntries = Object.entries(
    HIGHLIGHT_COLORS
  ) as [HighlightColorKey, string][];
  const highlightButtonOn = highlightMode && !highlightButtonDisabled;
  const pencilButtonOn = pencilMode && !highlightButtonDisabled;
  const highlightTrayVisible = (highlightMode || pencilMode || deleteMode) && !highlightButtonDisabled;
  const highlightActive = highlightButtonOn && !deleteMode;
  const pencilActive = pencilButtonOn && !deleteMode;
  const activeDrawingTool: DrawingTool | null = highlightActive ? "highlight" : pencilActive ? "pencil" : null;
  const highlightCount = useMemo(
    () => Object.values(highlights).reduce((sum, list) => sum + list.length, 0),
    [highlights]
  );
  const hasWorkspaceData = pages.length > 0 || highlightCount > 0 || !!draftHighlight;

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
      activeDrawingTool === "highlight" ? `url(${HIGHLIGHT_CURSOR}) 4 24, crosshair` : "crosshair";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [activeDrawingTool]);
  const hasAnyHighlights = Object.values(highlights).some((list) => list && list.length > 0);
  const hasUndoHistory = highlightHistory.length > 0;
  useEffect(() => {
    if (!hasAnyHighlights && deleteMode) {
      setDeleteMode(false);
    }
  }, [hasAnyHighlights, deleteMode]);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3fbff,_#ffffff)] pt-16">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrganizeMode(true)}
                  disabled={pages.length === 0 || organizeMode}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Manage pages
                </button>
                <button
                  type="button"
                  disabled={highlightButtonDisabled}
                  onClick={() =>
                    setHighlightMode((prev) => {
                      const next = !prev;
                      if (next) {
                        setDeleteMode(false);
                        setPencilMode(false);
                      }
                      return next;
                    })
                  }
                  aria-pressed={highlightButtonOn}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    highlightButtonOn
                      ? "border-transparent bg-[#024d7c] text-white shadow-lg shadow-[#012a44]/30"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:hover:border-slate-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Highlighter className="h-4 w-4" />
                  Highlight
                </button>
                <button
                  type="button"
                  disabled={highlightButtonDisabled}
                  onClick={() =>
                    setPencilMode((prev) => {
                      const next = !prev;
                      if (next) {
                        setDeleteMode(false);
                        setHighlightMode(false);
                      }
                      return next;
                    })
                  }
                  aria-pressed={pencilButtonOn}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    pencilButtonOn
                      ? "border-transparent bg-slate-900 text-white shadow-lg shadow-slate-900/30"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 disabled:hover:border-slate-200"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <Pencil className="h-4 w-4" />
                  Pencil
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndoHighlight}
                  disabled={!hasUndoHistory}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-slate-300 disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearHighlights}
                  disabled={!hasAnyHighlights}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-slate-300 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
            <div
              className={`overflow-hidden rounded-2xl border border-slate-100/80 bg-slate-50/80 px-4 transition-all duration-300 ease-out ${
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

        <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Project name</p>
              {projectNameEditing ? (
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400"
                  value={projectNameDraft}
                  onChange={(event) => {
                    setProjectNameDraft(event.target.value);
                    if (projectNameError) setProjectNameError(null);
                  }}
                  placeholder="Name your project"
                />
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{projectName}</h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {projectNameEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleProjectNameSave}
                    className="rounded-full bg-[#024d7c] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:-translate-y-0.5"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    onClick={handleProjectNameCancel}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProjectNameDraft(projectName);
                    setProjectNameError(null);
                    setProjectNameEditing(true);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 p-3 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  aria-label="Edit project name"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
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
              )}
            </div>
          </div>
          {projectNameError ? <p className="mt-3 text-sm text-rose-500">{projectNameError}</p> : null}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-4 pt-4 pb-32 lg:px-10 lg:pt-6">

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

        {organizeMode && !loading && pages.length > 0 && (
          <div className="rounded-[40px] border border-slate-200 bg-white p-6 shadow-[0_25px_80px_rgba(15,23,42,0.15)] max-w-[1080px] mx-auto">
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
            <div className="mx-auto mt-6 w-full px-6">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 justify-items-center gap-x-32 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                    {pages.map((page, idx) => (
                      <SortableOrganizeTile
                        key={page.id}
                        item={page}
                        index={idx}
                        onRotate={() => handleRotatePage(page.id)}
                        onDelete={() => handleDeletePage(page.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {!organizeMode && !loading && pages.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div
                ref={previewContainerRef}
                className="h-[70vh] space-y-8 overflow-y-auto pr-4"
              >
                {pages.map(renderPreviewPage)}
              </div>
            </div>

            <div className="lg:w-[240px]">
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
                          onSelect={() => handleSelectPage(p.id)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        )}

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

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-brand/30 bg-brand/5 px-7 py-3 text-base font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
            <p className="text-sm text-gray-600">
              {pages.length > 0
                ? `Ready to download ${pages.length} ${pages.length === 1 ? "page" : "pages"}?`
                : "Add some pages to enable download."}
            </p>
          </div>
          <button
            className="rounded-full bg-[#024d7c] px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#012a44]/30 transition hover:bg-[#013d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-2 active:bg-[#012f4e] disabled:cursor-not-allowed disabled:bg-[#d1e3f2] disabled:text-[#5f7085] disabled:shadow-none"
            onClick={() => handleDownload()}
            disabled={downloadDisabled}
          >
            {busy ? "Building..." : "Download pages"}
          </button>
        </div>

        {pages.length > 0 && activePageIndex >= 0 && (
          <div className="pointer-events-none fixed bottom-24 left-6 z-30">
            <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-[#1b2a3c] px-5 py-3 text-white shadow-xl shadow-black/25">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-white/70">Page</span>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-base font-semibold">
                  <button
                    type="button"
                    aria-label="Previous page"
                    className="rounded-full p-1 transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                    onClick={() => handlePageStep(-1)}
                    disabled={activePageIndex === 0}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span>{activePageIndex + 1}</span>
                  <span className="text-sm text-white/60">/ {pages.length}</span>
                  <button
                    type="button"
                    aria-label="Next page"
                    className="rounded-full p-1 transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                    onClick={() => handlePageStep(1)}
                    disabled={activePageIndex === pages.length - 1}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    setZoom((z) =>
                      Math.max(minZoom, Number((z - zoomStep).toFixed(2)))
                    )
                  }
                  disabled={!canZoomOut}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/80 w-12 text-center">
                  {zoomLabel}
                </div>
                <button
                  type="button"
                  aria-label="Zoom in"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    setZoom((z) =>
                      Math.min(maxZoom, Number((z + zoomStep).toFixed(2)))
                    )
                  }
                  disabled={!canZoomIn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
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
