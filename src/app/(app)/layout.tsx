import { cookies } from "next/headers";
import AppGuestShell from "@/components/AppGuestShell";
import AppMaintenanceScreen from "@/components/AppMaintenanceScreen";
import WorkspaceShell from "@/components/WorkspaceShell";
import { getServerSessionState } from "@/lib/serverSession";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [sessionState, cookieStore] = await Promise.all([
    getServerSessionState(),
    cookies(),
  ]);

  if (sessionState.status === "unavailable") {
    return (
      <AppMaintenanceScreen
        status={{
          ok: false,
          code: "DB_UNAVAILABLE",
          message: "Authentication is temporarily unavailable.",
          checkedAt: new Date().toISOString(),
          strict: true,
        }}
      />
    );
  }

  const session = sessionState.session;
  const sidebarExpandedCookie = cookieStore.get("mpdf_sidebar_expanded")?.value;
  const initialSidebarExpanded = sidebarExpandedCookie !== "0";
  const themeCookie = cookieStore.get("theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : "light";
  const googleManagedAccount =
    !!session?.user?.providers?.includes("google") && !session.user.providers.includes("credentials");
  const lockedByTwoFactor =
    !googleManagedAccount && !!session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true;
  const authedUser = session?.user && !lockedByTwoFactor ? session.user : null;

  return authedUser ? (
    <WorkspaceShell
      key={authedUser.id ?? "guest"}
      initialSidebarExpanded={initialSidebarExpanded}
      initialTheme={initialTheme}
      initialProfile={{
        id: authedUser.id ?? null,
        name: authedUser.name ?? null,
        email: authedUser.email ?? null,
      }}
    >
      {children}
    </WorkspaceShell>
  ) : (
    <AppGuestShell>{children}</AppGuestShell>
  );
}
