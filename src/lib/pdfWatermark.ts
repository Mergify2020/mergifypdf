import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

const WATERMARK_TEXT = "MergifyPDF";

export async function createWatermarkedPdf(source: Uint8Array | ArrayBuffer) {
  const doc = await PDFDocument.load(source);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(24, Math.min(width, height) * 0.06);
    const textWidth = font.widthOfTextAtSize(WATERMARK_TEXT, fontSize);
    const gapX = textWidth + fontSize * 1.8;
    const gapY = fontSize * 3.8;

    for (let y = -height * 0.25; y < height * 1.25; y += gapY) {
      for (let x = -width * 0.35; x < width * 1.35; x += gapX) {
        page.drawText(WATERMARK_TEXT, {
          x,
          y,
          size: fontSize,
          font,
          rotate: degrees(35),
          color: rgb(0.42, 0.28, 1),
          opacity: 0.14,
        });
      }
    }
  }

  return doc.save();
}
