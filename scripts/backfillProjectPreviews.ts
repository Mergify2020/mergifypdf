import { prisma } from "../src/lib/prisma";
import { derivePreviewMeta } from "../src/lib/projectPreview";

type ProjectRecord = {
  id: string;
  previewUrl: string | null;
  pagesCount: number | null;
  data: unknown;
};

async function backfillProjectPreviews() {
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ previewUrl: null }, { previewUrl: "" }],
    },
    select: { id: true, previewUrl: true, pagesCount: true, data: true },
  });

  let updated = 0;
  for (const project of projects as ProjectRecord[]) {
    const meta = derivePreviewMeta(project.data);
    const nextPreviewUrl = meta.previewUrl ?? null;
    const nextPagesCount = meta.pagesCount > 0 ? meta.pagesCount : project.pagesCount ?? 0;
    if (!nextPreviewUrl) continue;
    await prisma.project.update({
      where: { id: project.id },
      data: {
        previewUrl: nextPreviewUrl,
        pagesCount: nextPagesCount > 0 ? nextPagesCount : project.pagesCount,
      },
    });
    updated += 1;
  }

  return updated;
}

backfillProjectPreviews()
  .then((count) => {
    console.log(`Backfilled previews for ${count} projects.`);
  })
  .catch((err) => {
    console.error("Preview backfill failed.", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
