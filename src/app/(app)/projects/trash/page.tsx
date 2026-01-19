import Image from "next/image";
import TrashHeaderControls from "@/components/TrashHeaderControls";
import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { formatProjectLastEdited } from "@/lib/formatProjectLastEdited";
import TrashProjectActions from "@/components/TrashProjectActions";

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

  return (
    <div className="min-h-screen bg-transparent px-2 pb-10 pt-6 sm:px-4 sm:pt-6 lg:px-6 lg:pt-6 lg:pr-6">
      <div className="mx-auto w-full pb-16">
        <div className="grid h-full w-full min-h-0 gap-[24px] lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div>
          <div className="flex w-full items-start justify-between gap-3 lg:mr-[-304px] lg:w-[calc(100%+304px)]">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Trash</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Projects you move here can be restored or permanently deleted.
                </p>
              </div>
              <div className="lg:mr-[calc(var(--shell-left)-24px)]">
                <TrashHeaderControls
                  accountName={session.user.name ?? "Account"}
                  accountEmail={session.user.email ?? null}
                />
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
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
              <div className="mt-10 space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {project.name?.trim() || "Untitled project"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Last updated {formatProjectLastEdited(project.updatedAt)}
                      </p>
                    </div>
                    <TrashProjectActions projectId={project.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
