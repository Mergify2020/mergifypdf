import Link from "next/link";
import UploadCta from "@/components/UploadCta";
import { hasUsedToday } from "@/lib/quota";

export default async function Home() {
  const usedToday = await hasUsedToday();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-20 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Merge and edit your documents — all in one place.
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
    </div>
  );
}
