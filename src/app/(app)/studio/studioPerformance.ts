export type BoundedRenderDimensions = {
  scale: number;
  width: number;
  height: number;
  pixels: number;
};

export function calculateBoundedRenderDimensions(input: {
  pageWidth: number;
  pageHeight: number;
  desiredScale: number;
  maximumPixels: number;
  maximumDimension: number;
  minimumScale?: number;
}): BoundedRenderDimensions {
  const pageWidth = Number.isFinite(input.pageWidth) && input.pageWidth > 0 ? input.pageWidth : 612;
  const pageHeight = Number.isFinite(input.pageHeight) && input.pageHeight > 0 ? input.pageHeight : 792;
  const desiredScale = Number.isFinite(input.desiredScale) && input.desiredScale > 0
    ? input.desiredScale
    : 1;
  const maximumPixels = Number.isFinite(input.maximumPixels) && input.maximumPixels > 0
    ? input.maximumPixels
    : 4_000_000;
  const maximumDimension = Number.isFinite(input.maximumDimension) && input.maximumDimension > 0
    ? input.maximumDimension
    : 4096;
  const minimumScale = Math.max(0.01, input.minimumScale ?? 0.1);
  const pixelScale = Math.sqrt(maximumPixels / (pageWidth * pageHeight));
  const dimensionScale = Math.min(
    maximumDimension / pageWidth,
    maximumDimension / pageHeight,
  );
  // Pixel and dimension limits are hard safety ceilings. A minimum scale is only
  // honored when it fits below both ceilings (large architectural sheets may not).
  const safeCeiling = Math.min(desiredScale, pixelScale, dimensionScale);
  const scale = Math.min(safeCeiling, Math.max(minimumScale, safeCeiling));
  const width = Math.max(1, Math.floor(pageWidth * scale));
  const height = Math.max(1, Math.floor(pageHeight * scale));
  return { scale, width, height, pixels: width * height };
}

export function selectPageWorkingSet(input: {
  pageIds: string[];
  activeIndex: number;
  visiblePageIds: Iterable<string>;
  nearPageIds: Iterable<string>;
  activeRadius?: number;
}) {
  const keep = new Set<string>();
  for (const id of input.visiblePageIds) keep.add(id);
  for (const id of input.nearPageIds) keep.add(id);
  const radius = Math.max(0, input.activeRadius ?? 3);
  const activeIndex = Math.min(
    Math.max(0, input.activeIndex),
    Math.max(0, input.pageIds.length - 1),
  );
  for (let offset = -radius; offset <= radius; offset += 1) {
    const id = input.pageIds[activeIndex + offset];
    if (id) keep.add(id);
  }
  return keep;
}
