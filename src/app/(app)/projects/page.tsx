import { redirect } from "next/navigation";
import { getServerSessionSafe } from "@/lib/serverSession";


export default async function ProjectsPage() {
  const session = await getServerSessionSafe();

  if (!session?.user) {
    redirect("/login");
  }

  const googleManagedAccount =
    !!session.user.providers?.includes("google") && !session.user.providers.includes("credentials");
  if (!googleManagedAccount && session.user.twoFactorEnabled && !session.user.twoFactorPassed) {
    redirect("/2fa");
  }

  redirect("/projects/all");
}
