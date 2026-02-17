"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LifeBuoy,
  ListFilter,
  Mail,
  PenSquare,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";

const topics = [
  {
    title: "Getting Started",
    description: "Setup, uploading files, and your first document workflow.",
    icon: Rocket,
  },
  {
    title: "Document Editing",
    description: "Merging, splitting, reordering, and organizing PDFs.",
    icon: FileText,
  },
  {
    title: "Signing Documents",
    description: "How to sign documents yourself and prepare them for others.",
    icon: PenSquare,
  },
  {
    title: "Sending for Signature",
    description: "Requesting signatures, adding multiple signers, and tracking status.",
    icon: Send,
  },
  {
    title: "Account & Login",
    description: "Profile updates, password resets, and account access.",
    icon: User,
  },
  {
    title: "Billing & Subscriptions",
    description: "Trial details, renewals, cancellations, and invoices.",
    icon: CircleDollarSign,
  },
  {
    title: "Security & Data",
    description: "How files are stored, protected, and deleted.",
    icon: ShieldCheck,
  },
  {
    title: "Troubleshooting",
    description: "Upload issues, file errors, or common technical problems.",
    icon: LifeBuoy,
  },
];

const issueTypeOptions = [
  { value: "account-login", label: "Account & Login" },
  { value: "billing-subscriptions", label: "Billing & Subscriptions" },
  { value: "editing-signing", label: "Editing & Signing" },
  { value: "bug-report", label: "Bug Report" },
  { value: "other", label: "Other" },
];

export default function SupportPage() {
  const [issueType, setIssueType] = useState("");
  const [issueTypeOpen, setIssueTypeOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({ issueType: false, name: false, email: false, message: false });
  const [activeTopic, setActiveTopic] = useState<(typeof topics)[number] | null>(null);
  const issueTypeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!issueTypeRef.current) return;
      if (!issueTypeRef.current.contains(event.target as Node)) {
        setIssueTypeOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIssueTypeOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      issueType: issueType.trim().length === 0,
      name: name.trim().length === 0,
      email: email.trim().length === 0,
      message: message.trim().length === 0,
    };

    setErrors(nextErrors);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F8FF] px-3 py-10 text-slate-900 sm:px-5 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]">
        <Image
          src="/backgrounds/login-page-background-v5.svg"
          alt=""
          fill
          className="object-cover object-[50%_10%] scale-[1.08]"
          priority={false}
        />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <section className="px-0 py-8 sm:py-10">
          <h1 className="mt-3 text-center text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Hi, how can we help?
          </h1>
          <div className="mx-auto mt-7 w-full max-w-3xl">
            <label className="group flex items-center gap-3 rounded-full border border-white/65 bg-white px-5 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.14)]">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search the knowledge base"
                className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-500 focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="relative">
              <div
                className={activeTopic ? "invisible pointer-events-none select-none" : ""}
                style={{ animation: "supportTopicListOpen 220ms ease-out" }}
              >
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Popular Help Topics</h2>
                <div className="mt-6 grid gap-2 border-t border-slate-200 sm:grid-cols-2">
                  {topics.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.title}
                        type="button"
                        onClick={() => setActiveTopic(topic)}
                        className="flex w-full gap-3 border-b border-slate-200 px-1 py-5 text-left transition-all duration-200 hover:bg-slate-50/80 hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.16)] sm:px-2"
                      >
                        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{topic.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">{topic.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTopic ? (
                <div className="absolute inset-0 bg-white" style={{ animation: "supportTopicOpen 260ms ease-out" }}>
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTopic(null)}
                    className="inline-flex h-8 w-8 items-center justify-center text-slate-700 transition-colors hover:text-slate-400"
                    aria-label="Back to help topics"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{activeTopic.title}</h2>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    <div className="h-4 w-40 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200/80" />
                    <div className="mt-2 h-3 w-5/6 rounded-full bg-slate-200/80" />
                    <div className="mt-2 h-3 w-4/6 rounded-full bg-slate-200/80" />
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    <div className="h-4 w-32 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200/80" />
                    <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-200/80" />
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    <div className="h-4 w-36 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-full rounded-full bg-slate-200/80" />
                    <div className="mt-2 h-3 w-2/3 rounded-full bg-slate-200/80" />
                  </div>
                </div>
              </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="order-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6 lg:order-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:flex-col">
              <div className="order-2 sm:order-2 sm:self-center lg:order-2 lg:w-full">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Contact Support</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Get help with your account, billing, or document workflows.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Email</p>
                      <a href="mailto:support@mergifypdf.com" className="text-sm text-slate-600 hover:text-violet-600">
                        support@mergifypdf.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 flex justify-center sm:order-1 sm:justify-start lg:order-1 lg:justify-center">
                <Image
                  src="/illustrations/support-type-illustration.svg"
                  alt="Support illustration"
                  width={242}
                  height={161}
                  className="h-auto w-[242px] -scale-x-100"
                />
              </div>
            </div>
          </aside>

          <div className="order-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7 lg:order-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Get help from our support team</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Share what you need, and we&apos;ll guide you to the fastest solution.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <div
                  ref={issueTypeRef}
                  className={`relative rounded-xl border-2 bg-white transition-colors ${
                    errors.issueType ? "border-rose-500 focus-within:border-rose-500" : "border-slate-400 focus-within:border-violet-500"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-y-0 left-3 z-10 inline-flex items-center text-slate-400">
                    <ListFilter className="h-4.5 w-4.5" />
                  </span>
                  <button
                    type="button"
                    aria-label="Issue Type"
                    aria-expanded={issueTypeOpen}
                    onClick={() => setIssueTypeOpen((current) => !current)}
                    className={`w-full bg-transparent py-3 pr-11 pl-10 text-left text-base outline-none ${
                      issueType ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {issueTypeOptions.find((option) => option.value === issueType)?.label ?? "Issue Type"}
                  </button>
                  <span className="pointer-events-none absolute inset-y-0 right-3 z-10 inline-flex items-center text-slate-500">
                    <ChevronDown className={`h-4.5 w-4.5 transition-transform ${issueTypeOpen ? "rotate-180" : ""}`} />
                  </span>
                  <div
                    className={`absolute inset-x-2 top-[calc(100%+8px)] z-20 origin-top overflow-hidden transition-all duration-200 ease-out ${
                      issueTypeOpen
                        ? "max-h-72 translate-y-0 opacity-100"
                        : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
                    }`}
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_32px_rgba(15,23,42,0.14)]">
                      {issueTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setIssueType(option.value);
                            setIssueTypeOpen(false);
                            if (errors.issueType) {
                              setErrors((current) => ({ ...current, issueType: false }));
                            }
                          }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            issueType === option.value
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <input
                    type="text"
                    aria-label="Name"
                    placeholder="Name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (errors.name && event.target.value.trim().length > 0) {
                        setErrors((current) => ({ ...current, name: false }));
                      }
                    }}
                    className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
                      errors.name ? "border-rose-500 focus:border-rose-500" : "border-slate-400 focus:border-violet-500"
                    }`}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    aria-label="Email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email && event.target.value.trim().length > 0) {
                        setErrors((current) => ({ ...current, email: false }));
                      }
                    }}
                    className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 ${
                      errors.email ? "border-rose-500 focus:border-rose-500" : "border-slate-400 focus:border-violet-500"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`overflow-hidden rounded-xl border-2 bg-white transition-colors ${
                    errors.message ? "border-rose-500 focus-within:border-rose-500" : "border-slate-400 focus-within:border-violet-500"
                  }`}
                >
                  <textarea
                    rows={6}
                    aria-label="Message"
                    placeholder="Message"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      if (errors.message && event.target.value.trim().length > 0) {
                        setErrors((current) => ({ ...current, message: false }));
                      }
                    }}
                    className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex min-w-44 items-center justify-center rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(109,89,255,0.32)] transition-colors hover:bg-violet-600"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>
      </div>
      <style jsx>{`
        @keyframes supportTopicListOpen {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes supportTopicOpen {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
