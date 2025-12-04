import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LayoutDashboard } from "lucide-react";
import { authOptions } from "@/lib/authOptions";
import ProjectsWorkspaceShelf from "@/components/ProjectsWorkspaceShelf";
import ProjectsList from "@/components/ProjectsList";
import DashboardInsightsColumn from "@/components/DashboardInsightsColumn";
import StartProjectButton from "@/components/StartProjectButton";
import { curatedProjects } from "@/lib/sampleProjects";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFF] via-white to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 lg:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Projects
              </p>
              <h1 className="text-[24px] font-semibold text-[#111827] sm:text-[30px]">
                Your document library
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage uploads, drafts, and completed paperwork from one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <StartProjectButton />
            </div>
          </header>
        </section>

        <section className="grid gap-y-6 lg:grid-cols-[minmax(0,2.15fr)_minmax(0,1.5fr)] lg:gap-x-10">
          <div className="space-y-6">
            <ProjectsWorkspaceShelf />
            <ProjectsList initialProjects={curatedProjects} />
          </div>

          <DashboardInsightsColumn />
        </section>

        <section className="pb-10" />
      </div>
    </div>
  );
}
