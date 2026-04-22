import AppGuestShell from "@/components/AppGuestShell";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getServerSessionSafe } from "@/lib/serverSession";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Shell selection must use an accurate auth result. A short timeout here can
  // intermittently return null and flash the public header/footer on protected pages.
  const session = await getServerSessionSafe(0);
  const cookieStore = await cookies();
  const sidebarExpandedCookie = cookieStore.get("mpdf_sidebar_expanded")?.value;
  const initialSidebarExpanded = sidebarExpandedCookie === "0" ? false : true;
  const googleManagedAccount =
    !!session?.user?.providers?.includes("google") && !session.user.providers.includes("credentials");
  const lockedByTwoFactor =
    !googleManagedAccount && !!session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true;
  const authedWorkspace = session?.user && !lockedByTwoFactor;

  return authedWorkspace ? (
    <WorkspaceShell
      initialSidebarExpanded={initialSidebarExpanded}
      initialProfile={{
        id: session?.user?.id ?? null,
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
      }}
    >
      {children}
    </WorkspaceShell>
  ) : (
    <AppGuestShell>{children}</AppGuestShell>
  );
}
