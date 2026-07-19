import AllProjectsSkeleton from "@/components/AllProjectsSkeleton";

export default function Loading() {
  return (
    <main
      className="box-border flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-white pb-0 pt-3 dark:bg-[#252525] md:pb-0 md:pt-6"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px))",
      }}
    >
      <div className="projects-content-grid flex h-full min-h-0 w-full flex-col">
        <div
          id="home-projects-container"
          className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 md:pl-1 md:pr-0"
        >
          <AllProjectsSkeleton viewMode="list" />
        </div>
      </div>
    </main>
  );
}
