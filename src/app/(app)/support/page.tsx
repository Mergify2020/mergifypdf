import Image from "next/image";
import { CircleDollarSign, FileText, Rocket, Search, Settings, ShieldCheck } from "lucide-react";

const topics = [
  {
    title: "Getting Started",
    description: "Setup, onboarding, and first-time workflows.",
    icon: Rocket,
  },
  {
    title: "My Account",
    description: "Profile updates, login, and account settings.",
    icon: Settings,
  },
  {
    title: "Billing & Payments",
    description: "Plans, renewals, invoices, and payment details.",
    icon: CircleDollarSign,
  },
  {
    title: "Document Tools",
    description: "Merge, sign, annotate, and file management help.",
    icon: FileText,
  },
  {
    title: "Terms of Service",
    description: "Rules, usage terms, and account responsibilities.",
    icon: FileText,
  },
  {
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data.",
    icon: ShieldCheck,
  },
];

const popularArticles = [
  "How to create an account",
  "How the 3-day trial works",
  "How annual and monthly billing work",
  "How to cancel subscription",
  "How to download invoices",
];

export default function SupportPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F8FF] px-4 py-10 text-slate-900 lg:px-6">
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
        <section className="px-2 py-8 sm:px-4 sm:py-10">
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Help Topics</h2>
              <div className="mt-6 grid gap-2 border-t border-slate-200 sm:grid-cols-2">
                {topics.map(({ title, description, icon: Icon }) => (
                  <article
                    key={title}
                    className="flex gap-3 border-b border-slate-200 px-1 py-5 transition-colors hover:bg-slate-50/70 sm:px-2"
                  >
                    <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
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

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Popular Articles</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {popularArticles.map((item) => (
                    <li key={item}>
                      <a href="#" className="transition hover:text-slate-900 hover:underline">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Need Support?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Can&rsquo;t find what you need? Contact us and include your account email for faster help.
                </p>
                <details className="group mt-4 overflow-hidden rounded-2xl border border-transparent transition group-open:border-cyan-500 group-open:bg-white">
                  <summary className="flex w-full cursor-pointer list-none items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600 group-open:rounded-none group-open:rounded-t-2xl">
                    Contact Support
                  </summary>
                  <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out group-open:grid-rows-[1fr] group-open:opacity-100">
                    <div className="overflow-hidden">
                      <div className="border-t border-cyan-200 bg-white p-3 text-sm text-slate-700">
                        <p>
                          Email us at{" "}
                          <a className="font-semibold text-slate-900 underline" href="mailto:support@mergifypdf.com">
                            Support@mergifypdf.com
                          </a>
                          .
                        </p>
                        <p className="mt-1">We will get back to you within 24 hours.</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
