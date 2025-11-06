import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    // 1) list all non-system tables
    const tables = await prisma.$queryRaw<
      Array<{ schemaname: string; tablename: string }>
    >`
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog','information_schema')
      ORDER BY schemaname, tablename;
    `;

    // 2) narrow to anything that smells like reset/token
    const candidates = tables.filter(t =>
      /reset|token|password/i.test(t.tablename)
    );

    // 3) fetch columns + a few sample rows for each candidate
    const details: Record<string, any> = {};
    for (const t of candidates) {
      const fq = `"${t.schemaname}"."${t.tablename}"`;

      const columns = await prisma.$queryRaw<
        Array<{
          column_name: string;
          data_type: string;
          is_nullable: "YES" | "NO";
          column_default: string | null;
        }>
      >`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ${t.schemaname} AND table_name = ${t.tablename}
        ORDER BY ordinal_position;
      `;

      // NOTE: identifier (table name) can’t be parameterized safely; this is dev-only
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${fq} ORDER BY 1 DESC LIMIT 3`
      );

      details[`${t.schemaname}.${t.tablename}`] = { columns, rowsCount: Array.isArray(rows) ? rows.length : 0, rows };
    }

    return NextResponse.json({
      ok: true,
      allTables: tables,
      candidates: Object.keys(details),
      details,
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: { name: e?.name, code: e?.code, message: e?.message },
    });
  }
}
