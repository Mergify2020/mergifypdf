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

  redirect("/projects/all");
}
