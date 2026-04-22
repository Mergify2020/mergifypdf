import Link from "next/link";
import { ArrowRight, Send } from "lucide-react";
import { getServerSessionSafe } from "@/lib/serverSession";
import SignedHistoryList from "./SignedHistoryList";
import SignatureRequestsTable from "./SignatureRequestsTable";
import TasksList from "./TasksList";

export const dynamic = "force-dynamic";

export default async function SignatureCenterPage() {
  const session = await getServerSessionSafe();
  void session;
  const nowMs = new Date().getTime();
  const tasks = [
    {
      id: "t1",
      documentName: "Vendor Renewal Agreement",
      projectName: "Pinnacol Renewal 2025",
      status: "Ready to sign",
      dueAt: "2026-04-20T21:44:00Z",
    },
    {
      id: "t2",
      documentName: "Client Audit Packet",
      projectName: "Golden Rain FY25",
      status: "Voided by sender",
      dueAt: "2026-04-19T15:00:00Z",
    },
    {
      id: "t3",
      documentName: "Compliance Addendum",
      projectName: "MergifyPDF Studio",
      status: "Ready to sign",
      dueAt: "2026-04-24T19:30:00Z",
    },
    {
      id: "t4",
      documentName: "Partnership Exhibit",
      projectName: "Northbridge Projects",
      status: "Ready to sign",
      dueAt: "2026-04-22T18:15:00Z",
    },
  ];

    return (
    <main
      className="signature-center-layout box-border w-full bg-[#F1F4F9] pt-2 pb-0 md:pt-6 md:pb-0 dark:bg-[#252525]"
      style={{
        height:
          "calc(var(--workspace-vh, 100dvh) - var(--home-banner-offset, 0px) - var(--home-topbar-offset, 0px) - var(--workspace-content-bottom-subtract, var(--workspace-frame-gutter, 48px)))",
      }}
    >
      <div className="h-full min-h-0 w-full">
        <div className="h-full w-full">
          <div
            id="home-projects-container"
            className="relative z-40 flex h-full min-h-0 w-full flex-col px-0 pt-0 data-[shadow-overlay=true]:border-transparent data-[shadow-overlay=true]:shadow-none md:pl-1 md:pr-0"
          >
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="mt-0 flex w-full min-h-0 flex-1 flex-col">
                <div className="box-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-[1.5px] border-gray-200 bg-white p-3 shadow-sm md:p-5">
                  <div className="page-fade-in flex items-center justify-between gap-3 md:pl-[21px]">
                    <h2 className="min-w-0 shrink-0 text-lg font-semibold text-[#1F2A37] min-[560px]:text-xl md:text-2xl">
                      Signature Dashboard
                    </h2>
                    <div className="flex w-auto shrink-0 items-center gap-2">
                      <Link
                        href="#sent-requests"
                        className="inline-flex h-9 min-w-[130px] items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-[#6652E6] bg-[#6652E6] px-3 text-[11px] font-semibold leading-none text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[#5A45DB] md:h-11 md:px-4 md:text-sm xl:min-w-[200px] xl:gap-2 xl:px-5 xl:text-sm"
                      >
                        <Send className="h-[13px] w-[13px] shrink-0 md:h-[14px] md:w-[14px]" aria-hidden />
                        Get Signatures
                      </Link>
                      <Link
                        href="/templates"
                        className="hidden h-9 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-semibold leading-none text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:bg-slate-50 sm:inline-flex md:h-11 md:px-4 md:text-sm xl:min-w-[200px] xl:gap-2 xl:px-5 xl:text-sm"
                      >
                        View Templates
                        <ArrowRight className="h-[13px] w-[13px] shrink-0 md:h-[14px] md:w-[14px]" aria-hidden />
                      </Link>
                    </div>
                  </div>

                  <main className="flex min-h-0 flex-1 flex-col gap-6 pt-6">
                    <section
                      className="page-fade-in flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain px-1 py-1 pb-16 md:gap-6 md:pb-1"
                      style={{ animationDelay: "40ms" }}
                    >
                      <div className="md:hidden flex flex-col gap-4">
                        <TasksList tasks={tasks} nowMs={nowMs} />
                        <SignatureRequestsTable />
                        <SignedHistoryList />
                      </div>

                      <div className="hidden md:block">
                        <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,0.68fr)] xl:items-start xl:gap-6">
                          <div className="flex min-h-0 flex-col gap-4">
                            <TasksList tasks={tasks} nowMs={nowMs} />

                            <section
                              id="sent-requests"
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xl font-semibold tracking-tight text-slate-900">
                                  Sent Requests
                                </p>
                                <Link
                                  href="#sent-requests"
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                  <span>View all requests</span>
                                  <ArrowRight
                                    className="h-4 w-4 shrink-0"
                                    strokeWidth={2.5}
                                    aria-hidden
                                  />
                                </Link>
                              </div>

                              <div className="mt-4 md:mt-5">
                                <SignatureRequestsTable />
                              </div>
                            </section>

                            <div aria-hidden className="h-4 md:h-4" />
                          </div>

                          <div className="xl:self-start">
                            <SignedHistoryList />
                          </div>
                        </div>
                      </div>
                    </section>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
