import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Tries Prisma ORM first (3 common shapes), then falls back to dynamic SQL
 * that discovers the actual reset-token table/columns and inserts safely.
 */
export async function createResetTokenFlexible(
  userId: string,
  email: string,
  token: string
) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // --- ORM Attempt 1: { token, userId, expiresAt }
  try {
    await (prisma as any).resetToken.create({
      data: { token, userId, expiresAt },
    });
    return { ok: true, mode: "orm:userId" as const };
  } catch {}

  // --- ORM Attempt 2: { token, user: { connect: { id } }, expiresAt }
  try {
    await (prisma as any).resetToken.create({
      data: { token, user: { connect: { id: userId } }, expiresAt },
    });
    return { ok: true, mode: "orm:user.connect" as const };
  } catch {}

  // --- ORM Attempt 3: { token, email, expiresAt }
  try {
    await (prisma as any).resetToken.create({
      data: { token, email, expiresAt },
    });
    return { ok: true, mode: "orm:email" as const };
  } catch {}

  // ---------- Dynamic SQL fallback (parameterized) ----------
  // 1) Find a candidate table
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>(
    Prisma.sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name ilike '%reset%'
        and table_name ilike '%token%'
      order by table_name asc
    `
  );

  if (!tables?.length) {
    return { ok: false, error: "no reset-token-like table found in public schema" };
  }

  const table = tables[0].table_name;

  // 2) Get its columns
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>(
    Prisma.sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
    `
  );

  const names = new Set(cols.map((c) => c.column_name));

  // 3) Build a column/value list from what exists
  type Pair = { name: string; value: any };
  const pairs: Pair[] = [];
  const add = (name: string, value: any) => {
    if (names.has(name)) pairs.push({ name, value });
  };

  add("token", token);
  add("userId", userId);
  add("user_id", userId);
  add("email", email);
  add("expiresAt", expiresAt);
  add("expires_at", expiresAt);
  add("createdAt", new Date());
  add("created_at", new Date());
  add("used", false);

  if (!pairs.find((p) => p.name === "token")) {
    return { ok: false, error: `table "${table}" lacks a 'token' column` };
  }

  // 4) Parameterized insert using Prisma.sql + Prisma.join
  // identifiers: list of quoted column names
  const identifiers = Prisma.join(
    pairs.map((p) => Prisma.raw(`"${p.name}"`))
  );
  // placeholders: values bound safely
  const placeholders = Prisma.join(
    pairs.map((p) => Prisma.sql`${p.value}`)
  );

  try {
    // Note: quoting the table name with raw is safe since it comes from introspection,
    // not user input; values are fully parameterized.
    await prisma.$executeRaw(
      Prisma.sql`INSERT INTO ${Prisma.raw(`"${table}"`)} (${identifiers}) VALUES (${placeholders})`
    );

    return {
      ok: true,
      mode: `sql:${table}`,
      usedColumns: pairs.map((p) => p.name),
    };
  } catch (e: any) {
    return {
      ok: false,
      error: String(e?.message || e),
      table,
      availableColumns: [...names],
      attemptedColumns: pairs.map((p) => p.name),
    };
  }
}
