"use client";

type Template = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

const templates: Template[] = [
  {
    id: "nda",
    name: "Mutual NDA",
    description: "Standard two-party NDA for vendor or client onboarding.",
    badge: "Popular",
  },
  {
    id: "msa",
    name: "Master Services Agreement",
    description: "Baseline terms you can reuse across projects and clients.",
  },
  {
    id: "sow",
    name: "Statement of Work",
    description: "Scope, timelines, and deliverables for a single engagement.",
  },
];

export default function SignatureTemplates() {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Templates
        </h2>
        <p className="text-xs text-slate-500">
          Start faster with reusable templates for common agreements.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.id}
            className="flex flex-col justify-between rounded-[8px] border border-slate-200 bg-white px-3 py-3 text-xs shadow-[0_2px_6px_rgba(15,23,42,0.03)]"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  {template.name}
                </h3>
                {template.badge ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                    {template.badge}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-3 text-[11px] text-slate-600">
                {template.description}
              </p>
            </div>
            <div className="mt-3 flex justify-between gap-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-[999px] border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                Use template
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

