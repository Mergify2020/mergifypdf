import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import StudioClient from "./StudioClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  const resolved = ((await searchParams) ?? {}) as StudioSearchParams;
  const projectParam = resolved.project;
  const projectId =
    typeof projectParam === "string"
      ? projectParam
      : Array.isArray(projectParam)
        ? projectParam[0]
        : null;

  if (projectId) {
    const session = await getServerSessionSafe(250);
    if (session?.user) {
      const owned = await prisma.project.findFirst({
        where: { id: projectId, userId: session.user.id },
        select: { id: true },
      });
      if (!owned) {
        redirect("/projects");
      }
    }
  }

  return <StudioClient />;
}
