"use client";

import Link from "next/link";
import { ArrowRight, Ban, PenLine } from "lucide-react";
import { useVisibleSignatureRows } from "./useVisibleSignatureRows";

type Task = {
  id: string;
  documentName: string;
  projectName: string;
  status: string;
  dueAt: string;
};

type TasksListProps = {
  tasks: Task[];
  nowMs: number;
};

function formatTaskDueLabel(dueAt: string, overdue = false) {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";

  const datePart = new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();

  return `${overdue ? "Past due" : "Due on"} ${datePart} | ${timePart}`;
}

function formatTaskVoidedLabel(dueAt: string) {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "Voided by sender";

  const datePart = new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();

  return `Voided on ${datePart} | ${timePart}`;
}

function isTaskOverdue(dueAt: string, nowMs: number) {
  const date = new Date(dueAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < nowMs;
}

export default function TasksList({ tasks, nowMs }: TasksListProps) {
  const visibleRowCount = useVisibleSignatureRows();
  const visibleTasks = tasks.slice(0, Math.min(visibleRowCount, tasks.length));

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            Tasks
          </p>
          <Link
            href="#sent-requests"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span>View all tasks</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>

        <div className="mt-4 flex flex-col md:mt-5">
          {visibleTasks.map((task, index) => {
            const isVoidedBySender = task.status === "Voided by sender";
            const showReviewAction = !isVoidedBySender && task.status !== "Completed";
            const statusLabel = task.status;
            const overdue = isTaskOverdue(task.dueAt, nowMs) && task.status !== "Completed" && !isVoidedBySender;
            const statusClassName = overdue
              ? "text-rose-600"
              : task.status === "Completed"
                ? "text-emerald-600"
                : isVoidedBySender
                  ? "text-slate-600"
                  : "text-amber-600";

            return (
              <div key={task.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className={`truncate text-sm font-semibold leading-tight ${isVoidedBySender ? "text-slate-800" : "text-slate-900"}`}>
                      {task.documentName}
                    </p>
                    <p className="truncate text-xs leading-tight text-slate-500">{task.projectName}</p>
                    <p className={`truncate text-xs leading-tight text-slate-500`}>
                      {isVoidedBySender
                        ? formatTaskVoidedLabel(task.dueAt)
                        : formatTaskDueLabel(task.dueAt, overdue)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium leading-none ${statusClassName}`}>
                      {isVoidedBySender ? (
                        <Ban className="h-4 w-4 shrink-0" aria-hidden />
                      ) : task.status === "Ready to sign" ? (
                        <PenLine className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                      {statusLabel}
                    </span>
                    {showReviewAction ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-[140px] items-center justify-center gap-1.5 rounded-xl border border-[#6652E6] bg-[#6652E6] px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[#5A45DB]"
                      >
                        Review and Sign
                        <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </button>
                    ) : (
                      <span className="inline-flex h-9 w-[140px] items-center justify-center rounded-xl px-3 text-xs font-medium text-slate-700">
                        No action required
                      </span>
                    )}
                  </div>
                </div>
                {index !== visibleTasks.length - 1 ? <div className="h-px bg-slate-200/80" /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:block md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            Tasks
          </p>
          <Link
            href="#sent-requests"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <span>View all tasks</span>
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>

        <div className="mt-4 flex flex-col md:mt-5">
          {visibleTasks.map((task, index) => {
            const isVoidedBySender = task.status === "Voided by sender";
            const showReviewAction = !isVoidedBySender && task.status !== "Completed";
            const statusLabel = task.status;
            const overdue = isTaskOverdue(task.dueAt, nowMs) && task.status !== "Completed" && !isVoidedBySender;
            const statusClassName = overdue
              ? "text-rose-600"
              : task.status === "Completed"
                ? "text-emerald-600"
                : isVoidedBySender
                  ? "text-slate-600"
                  : "text-amber-600";

            return (
              <div key={task.id}>
                <div
                  className="flex flex-col gap-3 py-3 md:grid md:grid-cols-[minmax(0,1.28fr)_minmax(0,1fr)_auto] md:items-center md:gap-8 xl:gap-6"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold leading-tight ${isVoidedBySender ? "text-slate-800" : "text-slate-900"}`}>
                      {task.documentName}
                    </p>
                    <p className="truncate text-xs leading-tight text-slate-500">{task.projectName}</p>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium leading-none ${statusClassName}`}>
                      {isVoidedBySender ? (
                        <Ban className="h-4 w-4 shrink-0" aria-hidden />
                      ) : task.status === "Ready to sign" ? (
                        <PenLine className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                      {statusLabel}
                    </span>
                    <p className="mt-1 text-xs leading-tight text-slate-500">
                      {isVoidedBySender
                        ? formatTaskVoidedLabel(task.dueAt)
                        : formatTaskDueLabel(task.dueAt, overdue)}
                    </p>
                  </div>
                  <div className="flex items-center justify-start md:justify-end">
                    {showReviewAction ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-[140px] items-center justify-center gap-1.5 rounded-xl border border-[#6652E6] bg-[#6652E6] px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[#5A45DB]"
                      >
                        Review and Sign
                        <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </button>
                    ) : (
                      <span className="inline-flex h-9 w-[140px] items-center justify-center rounded-xl px-3 text-xs font-medium text-slate-700">
                        No action required
                      </span>
                    )}
                  </div>
                </div>
                {index !== visibleTasks.length - 1 ? <div className="h-px bg-slate-200/80" /> : null}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
