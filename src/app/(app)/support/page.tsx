import Image from "next/image";
import {
  CircleDollarSign,
  FileText,
  LifeBuoy,
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

export default function SupportPage() {
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
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Popular Help Topics</h2>
            <div className="mt-6 grid gap-2 border-t border-slate-200 sm:grid-cols-2">
              {topics.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="flex gap-3 border-b border-slate-200 px-1 py-5 transition-colors hover:bg-slate-50/70 sm:px-2"
                >
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
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

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Get help from our support team</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Share what you need, and we&apos;ll guide you to the fastest solution.
            </p>

            <form className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Name</span>
                  <input
                    type="text"
                    placeholder="Name"
                    className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Email <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500"
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Message <span className="text-rose-500">*</span>
                </span>
                <div className="overflow-hidden rounded-xl border-2 border-slate-400 bg-white transition-colors focus-within:border-violet-500">
                  <textarea
                    rows={6}
                    placeholder="Message"
                    className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <button
                type="button"
                className="mt-2 inline-flex min-w-44 items-center justify-center rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(109,89,255,0.32)] transition-colors hover:bg-violet-600"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
