export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">MergifyPDF</h1>
      <p className="text-gray-600 mt-2">Fast, simple PDF tools — all in your browser.</p>

      <div className="flex gap-3 mt-6">
        <a href="/workbench" className="rounded-xl bg-blue-600 px-5 py-2 text-white">
          Merge PDFs
        </a>
        <a href="/remove-pages" className="rounded-xl border px-5 py-2">
          Remove Pages
        </a>
      </div>
    </main>
  );
}
