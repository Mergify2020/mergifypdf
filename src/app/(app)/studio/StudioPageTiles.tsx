"use client";

import { memo } from "react";
import { Copy, ChevronDown, ChevronUp, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { normalizeRotation } from "./studioPure";
import type { PageItem } from "./studioTypes";

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const DEFAULT_ASPECT_RATIO = 792 / 612;
const SOFT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const TILE_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function getAspectPadding(width?: number, height?: number) {
  if (!width || !height || width === 0) return `${DEFAULT_ASPECT_RATIO * 100}%`;
  return `${(height / width) * 100}%`;
}

type SortableThumbProps = {
  item: PageItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
  disableMoveDown: boolean;
  registerThumbNode: (id: string) => (node: HTMLLIElement | null) => void;
  onThumbLoad: (id: string) => void;
  deferRender?: boolean;
};

function SortableThumb({
  item,
  index,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRotate,
  onDelete,
  disableMoveDown,
  registerThumbNode,
  onThumbLoad,
  deferRender = false,
}: SortableThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null),
    transition,
    cursor: "default",
  };
  const rotationDegrees = normalizeRotation(item.rotation);
  const isQuarterTurn = rotationDegrees % 180 !== 0;
  const frameWidth = isQuarterTurn ? item.height : item.width;
  const frameHeight = isQuarterTurn ? item.width : item.height;
  const thumbLongEdge = Math.max(frameWidth || 0, frameHeight || 0);
  const thumbScale = thumbLongEdge > 0 ? 252 / thumbLongEdge : 1;
  const thumbMaxWidth = Math.round(frameWidth * thumbScale);
  const innerStageWidth = isQuarterTurn && frameWidth > 0 ? `${(frameHeight / frameWidth) * 100}%` : "100%";
  const innerStageHeight = isQuarterTurn && frameHeight > 0 ? `${(frameWidth / frameHeight) * 100}%` : "100%";
  const thumbSrc = item.thumb || TRANSPARENT_PIXEL;
  const thumbVisible = Boolean(item.thumb);

  return (
    <li
      ref={(node) => {
        setNodeRef(node);
        registerThumbNode(item.id)(node);
      }}
      data-thumb-id={item.id}
      style={deferRender ? { ...style, contentVisibility: "auto", containIntrinsicSize: "320px" } : style}
      className="group relative flex w-full justify-center"
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
        className="relative shrink-0 cursor-pointer select-none"
        style={{ width: `${thumbMaxWidth}px`, maxWidth: "100%" }}
        {...listeners}
      >
        <div className="relative w-full" style={{ paddingBottom: getAspectPadding(frameWidth, frameHeight) }}>
          <div
            className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-none border bg-[#EEF2F7] transition-colors duration-100 ease-out dark:border-[#4A4A4A] dark:bg-[#222224] ${
              selected
                ? "border-2 border-[#6C47FF] dark:border-[#8B6CFF]"
                : "border-2 border-slate-300 hover:border-slate-400 group-hover:border-slate-400 dark:border-[#4A4A4A] dark:hover:border-[#5B5B65] dark:group-hover:border-[#5B5B65]"
            }`}
          >
            <span
              className={`absolute left-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-none text-xs font-semibold tabular-nums transition-colors duration-100 ease-out ${
                selected
                  ? "bg-[#6C47FF] text-white dark:bg-[#8B6CFF]"
                  : "bg-slate-200 text-slate-700 group-hover:bg-slate-400 group-hover:text-white dark:bg-[#4A4A4A] dark:text-zinc-200 dark:group-hover:bg-[#52525B]"
              }`}
            >
              {index + 1}
            </span>
            <div
              className="relative z-0 flex h-full w-full items-center justify-center"
              style={{
                width: innerStageWidth,
                height: innerStageHeight,
                transform: `rotate(${rotationDegrees}deg)`,
                transformOrigin: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc}
                alt={`Page ${index + 1}`}
                className={`relative z-10 block h-full w-full object-contain transition-opacity duration-200 ${
                  thumbVisible ? "opacity-100" : "opacity-0"
                }`}
                draggable={false}
                onLoad={() => {
                  if (item.thumb) onThumbLoad(item.id);
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="flex items-center justify-center gap-1 rounded-xl border-2 border-slate-300/90 bg-white/96 px-2 py-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-[#3F3F3F] dark:bg-[#323232]/96 dark:shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onMoveUp(); }}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#E5E5E5] dark:hover:bg-[#3A3A3A] dark:hover:text-white"
            aria-label="Move page up"
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
          <div className="h-5 w-0.5 bg-slate-200 dark:bg-[#3A3A3A]" aria-hidden />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onMoveDown(); }}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#E5E5E5] dark:hover:bg-[#3A3A3A] dark:hover:text-white"
            aria-label="Move page down"
            disabled={disableMoveDown}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          <div className="h-5 w-0.5 bg-slate-200 dark:bg-[#3A3A3A]" aria-hidden />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onRotate(); }}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-[#E5E5E5] dark:hover:bg-[#3A3A3A] dark:hover:text-white"
            aria-label="Rotate page"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
          </button>
          <div className="h-5 w-0.5 bg-slate-200 dark:bg-[#3A3A3A]" aria-hidden />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onDuplicate(); }}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-[#E5E5E5] dark:hover:bg-[#3A3A3A] dark:hover:text-white"
            aria-label="Duplicate page"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
          <div className="h-5 w-0.5 bg-slate-200 dark:bg-[#3A3A3A]" aria-hidden />
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onDelete(); }}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-100 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-200"
            aria-label="Delete page"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

export const MemoSortableThumb = memo(
  SortableThumb,
  (previous, next) =>
    previous.selected === next.selected &&
    previous.index === next.index &&
    previous.disableMoveDown === next.disableMoveDown &&
    previous.item.id === next.item.id &&
    previous.item.srcIdx === next.item.srcIdx &&
    previous.item.pageIdx === next.item.pageIdx &&
    previous.item.rotation === next.item.rotation &&
    previous.item.thumb === next.item.thumb &&
    previous.item.thumbWidth === next.item.thumbWidth &&
    previous.item.thumbHeight === next.item.thumbHeight &&
    previous.item.preview === next.item.preview &&
    previous.item.width === next.item.width &&
    previous.item.height === next.item.height &&
    previous.deferRender === next.deferRender,
);

export function SortableOrganizeTile({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, cursor: "grab" };
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
      <div className="relative h-[360px] w-full sm:h-[380px] lg:h-[420px]">
        <div className="group absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className={`h-full w-full transition-transform duration-200 ease-out ${
            isDragging ? "" : "group-hover:scale-[1.02] group-hover:-translate-y-1"
          }`}>
            <div
              className={`relative h-full w-full border border-[rgba(148,163,184,0.5)] bg-[#EEF2F7] dark:bg-[#222224] ${
                isDragging
                  ? "shadow-[0_8px_26px_rgba(15,23,42,0.24),_0_24px_60px_rgba(15,23,42,0.30)]"
                  : "shadow-[0_6px_20px_rgba(15,23,42,0.18),_0_18px_45px_rgba(15,23,42,0.22)] group-hover:outline group-hover:outline-1 group-hover:outline-offset-2 group-hover:outline-[rgba(37,99,235,0.35)] group-hover:shadow-[0_6px_20px_rgba(15,23,42,0.21),_0_18px_45px_rgba(15,23,42,0.25)]"
              } transition-shadow duration-200 ease-out`}
              style={{ transform: `rotate(${rotationDegrees}deg) scale(${scaleFix})`, transformOrigin: "center" }}
            >
              <div className="absolute inset-0 bg-[#EEF2F7] dark:bg-[#222224]" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview || TRANSPARENT_PIXEL}
                alt={`Page ${index + 1}`}
                className={`h-full w-full select-none object-contain transition-opacity duration-200 ${
                  item.preview ? "opacity-100" : "opacity-0"
                }`}
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-1">
        <div className="text-center text-sm font-semibold text-slate-800">Page {index + 1}</div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Rotate page"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onRotate(); }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Delete page"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onDelete(); }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-600 shadow-[0_4px_14px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
