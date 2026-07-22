import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const runtime = process.env.APP_RUNTIME_ENV ?? "development";
const databaseLabel = (process.env.APP_RUNTIME_DB_LABEL ?? "").toLowerCase();
const allowedLabel = ["ci", "test", "nightly"].some((token) => databaseLabel.includes(token));

if (runtime === "production" || !allowedLabel) {
  console.error("Test seeding refused: use a non-production runtime and a database label containing ci, test, or nightly.");
  process.exit(1);
}

const email = process.env.E2E_USER_EMAIL ?? "developer.fixture@example.test";
const password = process.env.E2E_USER_PASSWORD ?? "Synthetic-Test-Password-123!";
const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Synthetic Developer",
      password: passwordHash,
      emailVerified: new Date("2024-01-01T00:00:00.000Z"),
      twoFactorEnabled: false,
      twoFactorMethod: null,
    },
    create: {
      name: "Synthetic Developer",
      email,
      password: passwordHash,
      emailVerified: new Date("2024-01-01T00:00:00.000Z"),
    },
  });

  await prisma.project.upsert({
    where: { id: "synthetic-project-fixture" },
    update: {
      userId: user.id,
      name: "Synthetic PDF Project",
      data: { version: 1, sources: [], pages: [] },
      trashedAt: null,
    },
    create: {
      id: "synthetic-project-fixture",
      userId: user.id,
      name: "Synthetic PDF Project",
      data: { version: 1, sources: [], pages: [] },
    },
  });

  console.info("Synthetic test fixtures are ready.");
} finally {
  await prisma.$disconnect();
}
