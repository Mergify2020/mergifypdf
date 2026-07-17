import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import StudioClientLoader from "./StudioClientLoader";
import { getStudioProjectIdFromSearchParams } from "@/lib/studioRoute";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  const resolved = ((await searchParams) ?? {}) as StudioSearchParams;
  const projectId = getStudioProjectIdFromSearchParams(resolved);

  if (projectId) {
    const session = await getServerSessionSafe(250);
    if (session?.user) {
      try {
        const owned = await prisma.project.findFirst({
          where: { id: projectId, userId: session.user.id },
          select: { id: true },
        });
        if (!owned) {
          redirect("/projects");
        }
      } catch (error) {
        if (process.env.NODE_ENV === "production") {
          console.error("[studio] Failed to verify project ownership; redirecting to projects.", error);
        } else {
          console.warn("[studio] Failed to verify project ownership; redirecting to projects.", error);
        }
        redirect("/projects");
      }
    }
  }

  return <StudioClientLoader />;
}
