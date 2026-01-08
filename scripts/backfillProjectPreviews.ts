/* One-off backfill for missing previews.
 *
 * Usage:
 *   pnpm ts-node scripts/backfillProjectPreviews.ts
 */
import { prisma } from "../src/lib/prisma";
import { generateProjectPreview } from "../src/lib/generateProjectPreview";

async function main() {
  const projects = await prisma.project.findMany({
    where: { previewUrl: null },
    select: { id: true, pdfUrl: true },
  });

  console.log(`Found ${projects.length} projects missing previews.`);

  for (const project of projects) {
    if (!project.pdfUrl) {
      console.warn(`Skipping ${project.id}: missing pdfUrl`);
      continue;
    }
    try {
      await generateProjectPreview(project.id);
      console.log(`Generated preview for ${project.id}`);
    } catch (err) {
      console.error(`Failed to generate preview for ${project.id}`, err);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
