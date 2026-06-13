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
    <div className="relative -mt-[calc(56px+env(safe-area-inset-top)+10px)] min-h-screen overflow-hidden bg-[#050816] px-3 pb-16 pt-[calc(76px+env(safe-area-inset-top)+18px)] text-white sm:px-5 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(139,124,255,0.28),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(109,94,243,0.24),transparent_26%),radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#050816_0%,#070b16_48%,#090b16_100%)]" />
        <Image
          src="/backgrounds/login-page-background-v5.svg"
          alt=""
          fill
          className="object-cover object-[50%_10%] scale-[1.08] opacity-20 mix-blend-screen"
          priority={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,22,0.08)_0%,rgba(5,8,22,0.32)_34%,rgba(5,8,22,0.86)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(139,124,255,0.24)_0%,rgba(139,124,255,0)_100%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="px-0 pb-4 pt-4 sm:pt-6">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Hi, how can we help?
          </h1>
          <div className="mx-auto mt-7 w-full max-w-3xl">
            <label className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-5 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              <Search className="h-5 w-5 text-white/55" />
              <input
                type="text"
                placeholder="Search the knowledge base"
                className="w-full bg-transparent text-base text-white placeholder:text-white/45 focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="relative">
          <div className="rounded-[28px] border border-white/10 bg-[#0b1020]/96 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="relative">
              <div
                className={activeTopic ? "invisible pointer-events-none select-none" : ""}
                style={{ animation: "supportTopicListOpen 220ms ease-out" }}
              >
                <h2 className="text-3xl font-semibold tracking-tight text-white">Popular Help Topics</h2>
                <div className="mt-6 grid gap-2 border-t border-white/10 sm:grid-cols-2">
                  {topics.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.title}
                        type="button"
                        onClick={() => setActiveTopic(topic)}
                        className="flex w-full gap-3 border-b border-white/10 px-1 py-5 text-left transition-all duration-200 hover:bg-white/6 hover:shadow-[inset_0_0_0_1px_rgba(139,124,255,0.16)] sm:px-2"
                      >
                        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B7CFF]/12 text-[#CBBEFF]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{topic.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-white/68">{topic.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTopic ? (
                <div className="absolute inset-0 rounded-[28px] border border-white/10 bg-[#080B16] shadow-[0_24px_60px_rgba(0,0,0,0.3)]" style={{ animation: "supportTopicOpen 260ms ease-out" }}>
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <button
                      type="button"
                      onClick={() => setActiveTopic(null)}
                      className="inline-flex h-8 w-8 items-center justify-center text-white/80 transition-colors hover:text-white"
                      aria-label="Back to help topics"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">{activeTopic.title}</h2>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                      <div className="h-4 w-40 rounded-full bg-white/15" />
                      <div className="mt-3 h-3 w-full rounded-full bg-white/12" />
                      <div className="mt-2 h-3 w-5/6 rounded-full bg-white/12" />
                      <div className="mt-2 h-3 w-4/6 rounded-full bg-white/12" />
                    </div>
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                      <div className="h-4 w-32 rounded-full bg-white/15" />
                      <div className="mt-3 h-3 w-full rounded-full bg-white/12" />
                      <div className="mt-2 h-3 w-3/4 rounded-full bg-white/12" />
                    </div>
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5">
                      <div className="h-4 w-36 rounded-full bg-white/15" />
                      <div className="mt-3 h-3 w-full rounded-full bg-white/12" />
                      <div className="mt-2 h-3 w-2/3 rounded-full bg-white/12" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="order-2 rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6 lg:order-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:flex-col">
              <div className="order-2 sm:order-2 sm:self-center lg:order-2 lg:w-full">
                <h2 className="text-2xl font-semibold tracking-tight text-white">Contact Support</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/68">
                  Get help with your account, billing, or document workflows.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B7CFF]/12 text-[#CBBEFF]">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Email</p>
                      <a href="mailto:support@mergifypdf.com" className="text-sm text-white/72 transition hover:text-white">
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
                  className="h-auto w-[242px] -scale-x-100 drop-shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
                />
              </div>
            </div>
          </aside>

          <div className="order-1 rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-7 lg:order-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Get help from our support team</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/68">
              Share what you need, and we&apos;ll guide you to the fastest solution.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <div
                  ref={issueTypeRef}
                  className={`relative rounded-xl border-2 bg-[#0B1020] transition-colors ${
                    errors.issueType ? "border-rose-500 focus-within:border-rose-500" : "border-white/15 focus-within:border-[#8B7CFF]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-y-0 left-3 z-10 inline-flex items-center text-white/35">
                    <ListFilter className="h-4.5 w-4.5" />
                  </span>
                  <button
                    type="button"
                    aria-label="Issue Type"
                    aria-expanded={issueTypeOpen}
                    onClick={() => setIssueTypeOpen((current) => !current)}
                    className={`w-full bg-transparent py-3 pr-11 pl-10 text-left text-base outline-none ${
                      issueType ? "text-white" : "text-white/40"
                    }`}
                  >
                    {issueTypeOptions.find((option) => option.value === issueType)?.label ?? "Issue Type"}
                  </button>
                  <span className="pointer-events-none absolute inset-y-0 right-3 z-10 inline-flex items-center text-white/45">
                    <ChevronDown className={`h-4.5 w-4.5 transition-transform ${issueTypeOpen ? "rotate-180" : ""}`} />
                  </span>
                  <div
                    className={`absolute inset-x-2 top-[calc(100%+8px)] z-20 origin-top overflow-hidden transition-all duration-200 ease-out ${
                      issueTypeOpen
                        ? "max-h-72 translate-y-0 opacity-100"
                        : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
                    }`}
                  >
                    <div className="rounded-xl border border-white/10 bg-[#090B16] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
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
                              ? "bg-[#8B7CFF]/15 text-white"
                              : "text-white/78 hover:bg-white/6"
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
                    className={`w-full rounded-xl border-2 bg-[#0B1020] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/35 ${
                      errors.name ? "border-rose-500 focus:border-rose-500" : "border-white/15 focus:border-[#8B7CFF]"
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
                    className={`w-full rounded-xl border-2 bg-[#0B1020] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/35 ${
                      errors.email ? "border-rose-500 focus:border-rose-500" : "border-white/15 focus:border-[#8B7CFF]"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`overflow-hidden rounded-xl border-2 bg-[#0B1020] transition-colors ${
                    errors.message ? "border-rose-500 focus-within:border-rose-500" : "border-white/15 focus-within:border-[#8B7CFF]"
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
                    className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex min-w-44 items-center justify-center rounded-xl bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(109,89,255,0.28)] transition-colors hover:from-[#7567F5] hover:to-[#9486FF]"
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
