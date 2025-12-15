/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const confirm = process.env.CONFIRM_PURGE_PROJECTS;
  if (confirm !== "YES") {
    console.error('Refusing to run. Set CONFIRM_PURGE_PROJECTS="YES" to delete all projects.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.project.deleteMany({});
    console.log(`Deleted ${result.count} projects.`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

