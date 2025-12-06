import AllProjectsClient from "./AllProjectsClient";

export default function AllProjectsPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFC] px-2 pb-0 pt-10 sm:px-4 sm:pt-12 lg:px-6 lg:pt-14">
      <div className="mx-auto w-full pb-16">
        <h1 className="mt-2 text-center text-4xl font-semibold text-slate-900 sm:mt-4 sm:text-5xl">
          All Projects
        </h1>
        <AllProjectsClient />
      </div>
    </div>
  );
}
