"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Create object URLs so we can load in /studio without re-uploading
    const payload = Array.from(files)
      .filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .map(f => ({
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
      }));

    if (payload.length === 0) return;
    sessionStorage.setItem("mpdf:files", JSON.stringify(payload));
    router.push("/studio");
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">MergifyPDF</h1>
        <p className="mt-2 text-gray-600">Upload PDFs, preview pages, remove/add, and download — all in your browser.</p>

        <div className="mt-10 rounded-2xl border-2 border-dashed p-12">
          <button
            className="rounded-xl bg-blue-600 px-6 py-3 text-white text-base hover:opacity-95"
            onClick={() => inputRef.current?.click()}
          >
            Upload PDF(s)
          </button>
          <p className="mt-2 text-xs text-gray-500">You can add more inside the editor.</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.currentTarget.files)}
          />
        </div>
      </div>
    </main>
  );
}
