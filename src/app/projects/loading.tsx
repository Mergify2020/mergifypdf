export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <div className="mx-auto max-w-[28rem]">
          <div className="mt-2 h-12 w-full rounded-full skeleton-shimmer sm:mt-4 sm:h-14" />
        </div>

        <div className="projects-grid mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-8 lg:gap-10">
          {Array.from({ length: 18 }).map((_, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="group flex flex-col text-left"
            >
              <div className="relative rounded-[10px] bg-[#F9FAFC]">
                <div className="relative m-[3px] w-[calc(100%-6px)] aspect-[1.23/1] overflow-hidden rounded-[10px] bg-[#EEF1F5] border border-[rgba(0,0,0,0.06)]">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
              <div className="mt-4 space-y-0.5">
                <div className="h-5 w-2/3 rounded-full skeleton-shimmer" />
                <div className="h-4 w-1/2 rounded-full skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

