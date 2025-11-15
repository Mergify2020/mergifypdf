import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Probe likely table names
    const names = ['resettoken','reset_token','passwordresettoken','password_reset_token'];

    const columns = await prisma.$queryRaw<
      Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: "YES" | "NO";
        column_default: string | null;
      }>
    >`
      SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ANY(${names})
      ORDER BY table_name, ordinal_position;
    `;

    const constraints = await prisma.$queryRaw<
      Array<{
        table_name: string;
        constraint_name: string;
        constraint_type: string;
        column_name: string | null;
      }>
    >`
      SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_name = kcu.table_name
      WHERE tc.table_name = ANY(${names})
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
    `;

    const indexes = await prisma.$queryRaw<
      Array<{ tablename: string; indexname: string; indexdef: string }>
    >`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename = ANY(${names});
    `;

    return NextResponse.json({ ok: true, columns, constraints, indexes });
  } catch (error) {
    const errInfo =
      typeof error === "object" && error !== null
        ? {
            name: "name" in error ? (error as { name?: string }).name : undefined,
            code: "code" in error ? (error as { code?: string }).code : undefined,
            message:
              "message" in error ? (error as { message?: string }).message : String(error),
          }
        : { message: String(error) };
    return NextResponse.json({
      ok: false,
      error: errInfo,
    });
  }
}
