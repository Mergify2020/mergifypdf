import { createCanvas } from "canvas";
import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
import { prisma } from "@/lib/prisma";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

const PREVIEW_DIR = path.join(process.cwd(), "public", "previews");
const PDF_PUBLIC_ROOT = path.join(process.cwd(), "public");
const PREVIEW_SCALE = 1.0;
type PdfDocumentParams = { data: Uint8Array; disableWorker?: boolean };
const require = createRequire(import.meta.url);
const workerSrc =
  (pdfjsLib as { GlobalWorkerOptions?: { workerSrc?: string } }).GlobalWorkerOptions
    ?.workerSrc ?? null;
if (!workerSrc && (pdfjsLib as { GlobalWorkerOptions?: { workerSrc?: string } }).GlobalWorkerOptions) {
  (pdfjsLib as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.js");
}

async function loadPdfBytes(pdfUrl: string): Promise<Uint8Array> {
  if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch PDF (${res.status})`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  const trimmed = pdfUrl.startsWith("/") ? pdfUrl.slice(1) : pdfUrl;
  const diskPath = path.join(PDF_PUBLIC_ROOT, trimmed);
  const buffer = await fs.readFile(diskPath);
  return new Uint8Array(buffer);
}

type PreviewOptions = {
  force?: boolean;
};

export async function generateProjectPreview(projectId: string, options: PreviewOptions = {}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, pdfUrl: true, previewUrl: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (!options.force && project.previewUrl) {
    return project.previewUrl;
  }

  if (!project.pdfUrl) {
    throw new Error("Project PDF is missing");
  }

  const pdfBytes = await loadPdfBytes(project.pdfUrl);
  const pdf = await pdfjsLib.getDocument({
    data: pdfBytes,
    disableWorker: true,
  } as PdfDocumentParams).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: PREVIEW_SCALE });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;

  const toBuffer = (mimeType: string) =>
    new Promise<Buffer>((resolve, reject) => {
      (canvas as unknown as { toBuffer: Function }).toBuffer(
        (err: Error | null, result: Buffer) => {
          if (err) reject(err);
          else resolve(result);
        },
        mimeType
      );
    });

  let previewBuffer: Buffer;
  let previewFilename = `${project.id}.webp`;
  try {
    previewBuffer = await toBuffer("image/webp");
  } catch {
    previewBuffer = await toBuffer("image/png");
    previewFilename = `${project.id}.png`;
  }

  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  const previewPath = path.join(PREVIEW_DIR, previewFilename);
  await fs.writeFile(previewPath, previewBuffer);

  const cacheBust = Date.now();
  const previewUrl = `/previews/${previewFilename}?v=${cacheBust}`;
  await prisma.project.update({
    where: { id: project.id },
    data: { previewUrl },
  });

  return previewUrl;
}
