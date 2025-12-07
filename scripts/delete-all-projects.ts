/* Danger zone: one-off admin script to wipe all projects.
 *
 * Usage (from repo root):
 *   CONFIRM_DELETE_ALL_PROJECTS=true pnpm ts-node scripts/delete-all-projects.ts
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  if (process.env.CONFIRM_DELETE_ALL_PROJECTS !== "true") {
    console.error(
      'Refusing to run. Set CONFIRM_DELETE_ALL_PROJECTS=true in the environment to delete all projects.',
    );
    process.exit(1);
  }

  const result = await prisma.project.deleteMany({});
  console.log(`Deleted ${result.count} projects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

