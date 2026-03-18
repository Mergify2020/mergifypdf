import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function expectedAppName() {
  return process.env.APP_RUNTIME_NAME?.trim() || "mergifypdf";
}

function expectedEnvironment() {
  return process.env.APP_RUNTIME_ENV?.trim() || process.env.NODE_ENV || "development";
}

function requireUsers() {
  return process.env.APP_RUNTIME_REQUIRE_USERS?.trim().toLowerCase() === "true";
}

async function main() {
  const row = await prisma.appRuntimeGuard.upsert({
    where: { id: "primary" },
    update: {
      appName: expectedAppName(),
      environment: expectedEnvironment(),
      databaseLabel: process.env.APP_RUNTIME_DB_LABEL?.trim() || null,
      requireUsers: requireUsers(),
    },
    create: {
      id: "primary",
      appName: expectedAppName(),
      environment: expectedEnvironment(),
      databaseLabel: process.env.APP_RUNTIME_DB_LABEL?.trim() || null,
      requireUsers: requireUsers(),
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: row.id,
        appName: row.appName,
        environment: row.environment,
        databaseLabel: row.databaseLabel,
        requireUsers: row.requireUsers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
