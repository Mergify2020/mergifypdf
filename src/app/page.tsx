import Link from "next/link";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";
import { FileOutput, FilePlus, Highlighter, Layers, ListOrdered, PenLine } from "lucide-react";

const features = [
  {
    title: "Merge Documents",
    description: "Combine multiple PDFs into one clean file.",
    icon: Layers,
  },
  {
    title: "Edit & Highlight",
    description: "Add highlights, notes, drawings, and text.",
    icon: Highlighter,
  },
  {
    title: "Sign Documents",
    description: "Draw, upload, or type your signature.",
    icon: PenLine,
  },
  {
    title: "Reorder Pages",
    description: "Drag and drop pages to arrange your document.",
    icon: ListOrdered,
  },
  {
    title: "Add or Remove Pages",
    description: "Insert new pages or delete pages instantly.",
    icon: FilePlus,
  },
  {
    title: "Extract Pages",
    description: "Select certain pages and export them into a new PDF.",
    icon: FileOutput,
  },
] as const;

export default async function Home() {
  const usedToday = await hasUsedToday();

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl leading-tight">
        <span className="block">Merge and edit your documents</span>
        <span className="block">all in one place</span>
      </h1>
      <p className="text-lg text-gray-700">Fast, secure, and works right in your browser.</p>
      <p className="text-lg text-gray-600">
        One free upload each day. Sign up for unlimited merges and faster processing.
      </p>
      <UploadCta usedToday={usedToday} />
      <p className="text-sm text-gray-500">
        Already have an account?{" "}
        <Link className="underline decoration-[#024d7c]" href="/login">
          Sign in
        </Link>
        .
      </p>
      <div className="mt-12 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-black/10 bg-white/40 p-6 text-left shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
          >
            <Icon className="h-8 w-8 text-[#024d7c]" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
