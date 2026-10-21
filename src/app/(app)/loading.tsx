import Image from "next/image";

export default function AppLoading() {
  return (
    <main className="flex min-h-[calc(100dvh-1px)] flex-1 items-center justify-center bg-[#f7f8fc] dark:bg-[#252525]">
      <div className="flex flex-col items-center gap-3" aria-label="Loading workspace" role="status">
        <Image
          src="/logos/logo-icontext-dark-v4.svg"
          alt="MergifyPDF"
          width={180}
          height={36}
          priority
          className="h-9 w-auto dark:hidden"
        />
        <Image
          src="/logos/logo-icontext-v4-dark.svg"
          alt="MergifyPDF"
          width={180}
          height={36}
          priority
          className="hidden h-9 w-auto dark:block"
        />
        <span className="sr-only">Loading workspace</span>
      </div>
    </main>
  );
}
