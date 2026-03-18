import Image from "next/image";
import TrashProjectsList from "@/components/TrashProjectsList";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";

export const dynamic = "force-dynamic";

export default async function TrashProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  const userId = session.user.id;
  if (!userId) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId, trashedAt: { not: null } },
    orderBy: { trashedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      trashedAt: true,
    },
  });

  const trashProjects = projects.map((project) => ({
    id: project.id,
    title: project.name?.trim() || "Untitled project",
    updatedLabel: formatProjectLastEdited(project.updatedAt),
    trashedAt: project.trashedAt?.toISOString() ?? new Date().toISOString(),
  }));

  return (
    <main
      className="box-border w-full bg-[#F1F4F9] pt-3 pb-0 sm:pt-6 sm:pb-0 transition-[height] duration-300 ease-out dark:bg-[#222224]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="flex h-full w-full min-h-0 flex-col md:pl-1 md:pr-0">
          {projects.length === 0 ? (
            <div className="mt-10 flex flex-1 flex-col items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
              <Image
                src="/nothingdeletedyet.svg"
                alt=""
                width={405}
                height={405}
                className="mt-[-100px] h-[318px] w-[318px] opacity-90 sm:h-[405px] sm:w-[405px]"
                priority
              />
              <p className="mt-0 text-lg font-semibold text-slate-900">Trash is currently empty.</p>
              <p className="mt-2 text-sm text-slate-500">Restore a project or keep things tidy here.</p>
            </div>
          ) : (
            <TrashProjectsList
              projects={trashProjects}
              accountName={session.user.name ?? "Account"}
              accountEmail={session.user.email ?? null}
            />
          )}
        </div>
      </div>
    </main>
  );
}
