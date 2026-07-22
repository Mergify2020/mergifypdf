export type SourceRef = {
  storageId: string;
  url: string;
  name: string;
  size: number;
  updatedAt: number;
  secureRead?: {
    projectId: string;
    assetId: string;
  };
};

export type PageItem = {
  id: string;
  srcIdx: number;
  pageIdx: number;
  thumb: string;
  thumbWidth?: number;
  thumbHeight?: number;
  preview: string;
  rotation: number;
  width: number;
  height: number;
  isPlaceholder?: boolean;
};

export type Point = { x: number; y: number; move?: boolean };
export type DrawingTool = "highlight" | "pen" | "pencil" | "text";
export type HeaderMode = "default" | "pen" | "highlight" | "shapes";
export type ShapeType = "line" | "arrow" | "check" | "x" | "rect" | "ellipse" | "triangle";
export type LineStyle = "solid" | "dashed" | "dotted";

export type ShapeAnnotation = {
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

export type HighlightStroke = {
  id: string;
  tool: DrawingTool;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
  lineStyle?: LineStyle;
};

export type DraftHighlight = {
  tool: Exclude<DrawingTool, "text">;
  pageId: string;
  points: Point[];
  color: string;
  opacity?: number;
  seed?: number;
  thickness: number;
  lineStyle?: LineStyle;
};

export type TextAnnotation = {
  id: string;
  pageId: string;
  pageIndex: number;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  textSizePt?: number;
  richTextHtml?: string;
  lineSpacing?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  sourceType?: "manual";
};

export type HighlightHistoryEntry =
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

export type Project = {
  id: string;
  name: string;
  // Legacy API shape; narrowed at each use while the Studio is modularized.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  createdAt: string;
  updatedAt: string;
};

export type TextFont =
  | "Inter"
  | "Arial"
  | "Roboto"
  | "Times New Roman"
  | "Courier New"
  | "Georgia"
  | "Poppins";
export type TextFontVariant = "normal" | "bold" | "italic" | "boldItalic";

export type SearchablePdfPage = {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
};
export type SearchablePdfDocument = {
  getPage: (pageNumber: number) => Promise<SearchablePdfPage>;
};

export type SignaturePanelMode = "none" | "draw" | "upload" | "saved";
export type SavedSignature = {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
};
export type SignaturePlacement = {
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

export type CloudProject = {
  id: string;
  name: string;
  data: unknown;
  createdAt?: string | number;
  updatedAt?: string | number;
  previewUrl?: string | null;
  hasPreview?: boolean;
  hasPdf?: boolean;
  pagesCount?: number | null;
};
