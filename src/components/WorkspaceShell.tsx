"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSignature,
  FileText,
  FolderKanban,
  HelpCircle,
  Menu,
  PenSquare,
  type LucideIcon,
} from "lucide-react";
import AppHeaderBrand from "./AppHeaderBrand";
import WorkspaceSettingsMenu from "./WorkspaceSettingsMenu";
import Footer from "./Footer";

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
  disabled?: boolean;
};

const navigationItems: SidebarItem[] = [
  { label: "Projects Dashboard", icon: FolderKanban, href: "/" },
  { label: "Signature Dashboard", icon: PenSquare, href: "/signature-center" },
  { label: "Templates", icon: FileText, href: "/signature-center" },
];

const createItems: SidebarItem[] = [
  { label: "New Editing Project", icon: FileText, href: "/studio", primary: true },
  { label: "New Signature Request", icon: FileSignature, href: "/signature-center" },
];

const otherItems: SidebarItem[] = [
  { label: "Help & Support", icon: HelpCircle, href: "#", disabled: true },
  { label: "Terms & Conditions", icon: FileText, href: "#", disabled: true },
];

interface WorkspaceShellProps {
  children: React.ReactNode;
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sectionLabelClasses = expanded
    ? "opacity-100 translate-x-0"
    : "opacity-0 translate-x-2 pointer-events-none";
  const itemLabelClasses = expanded
    ? "opacity-100 translate-x-0 max-w-full"
    : "opacity-0 translate-x-2 max-w-0";

  const renderItems = (
    items: SidebarItem[],
    {
      highlightPrimary,
      labelClassName,
    }: { highlightPrimary?: boolean; labelClassName?: string } = {},
  ) =>
    items.map(({ label, icon: Icon, href, primary, disabled }) => (
      <button
        key={label}
        type="button"
        onClick={() => {
          if (disabled) return;
          router.push(href);
          setMobileOpen(false);
        }}
        aria-label={label}
        disabled={disabled}
        className={`group flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
          disabled ? "text-slate-400" : "text-slate-800 hover:bg-slate-100"
        } ${primary && highlightPrimary ? "bg-slate-900 text-white hover:bg-slate-800" : ""} ${
          expanded ? "justify-start" : "justify-center px-0 gap-0"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${primary && highlightPrimary ? "text-white" : "text-slate-600"}`}
          aria-hidden
        />
        <span
          className={`inline-flex flex-1 overflow-hidden whitespace-nowrap text-sm transition-all duration-200 ease-in-out ${
            expanded ? "ml-2" : "ml-0"
          } ${labelClassName ?? ""}`}
        >
          {label}
        </span>
      </button>
    ));

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 z-30 h-screen flex-col border-r border-slate-200 bg-white text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-r-2xl overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "w-64" : "w-16"
        }`}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 py-6">
          <div className="relative flex items-center px-2">
            <p
              className={`flex-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition-all duration-300 ${
                expanded ? "opacity-100" : "opacity-0 w-0"
              }`}
            >
              Workspace
            </p>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          <div className="px-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-transform duration-200 ${sectionLabelClasses}`}
            >
              Navigation
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {renderItems(navigationItems, {
              labelClassName: itemLabelClasses,
            })}
          </nav>

          <div className="my-3 border-t border-slate-200" />

          <div className="px-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-transform duration-200 ${sectionLabelClasses}`}
            >
              Create
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {renderItems(createItems, {
              highlightPrimary: true,
              labelClassName: itemLabelClasses,
            })}
          </div>

          <div className="my-3 border-t border-slate-200" />

          <div className="px-3">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-transform duration-200 ${sectionLabelClasses}`}
            >
              Other
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {renderItems(otherItems, { labelClassName: itemLabelClasses })}
          </div>
        </div>

        <div className="border-t border-slate-200 px-3 py-4" />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 md:hidden">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
                <nav className="flex flex-col gap-1">
                  {renderItems(navigationItems, { labelClassName: "opacity-100 translate-x-0" })}
                </nav>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Create</p>
                <div className="flex flex-col gap-1">
                  {renderItems(createItems, {
                    highlightPrimary: true,
                    labelClassName: "opacity-100 translate-x-0",
                  })}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other</p>
                <div className="flex flex-col gap-1">
                  {renderItems(otherItems, { labelClassName: "opacity-100 translate-x-0" })}
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <div className={`flex min-h-screen w-full flex-col bg-white transition-all duration-300 ease-in-out ${expanded ? "md:ml-64" : "md:ml-16"}`}>
        <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-md transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open workspace menu</span>
              </button>
              <AppHeaderBrand />
            </div>
            <WorkspaceSettingsMenu />
          </div>
        </header>

        <main className="page-fade-in flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
