"use client";

import { useEffect, useState } from "react";

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export default function HeroStats() {
  const [edited, setEdited] = useState(2_859_840);
  const [signed, setSigned] = useState(476_640);
  const [editedTick, setEditedTick] = useState(0);
  const [signedTick, setSignedTick] = useState(0);

  useEffect(() => {
    const editedInterval = setInterval(() => {
      setEdited((prev) => prev + 1);
      setEditedTick((tick) => tick + 1);
    }, 10_000);

    const signedInterval = setInterval(() => {
      setSigned((prev) => prev + 1);
      setSignedTick((tick) => tick + 1);
    }, 60_000);

    return () => {
      clearInterval(editedInterval);
      clearInterval(signedInterval);
    };
  }, []);

  return (
    <div className="mt-6 flex justify-center">
      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#6A4EE8] px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
            Documents edited
          </p>
          <div
            key={editedTick}
            className="mt-1 text-3xl font-semibold leading-tight animate-numberRoll"
          >
            {formatNumber(edited)}
          </div>
          <p className="mt-1 text-xs text-violet-100">
            Updating every 10 seconds
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-[#6A4EE8] px-6 py-4 text-white shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
            Documents signed
          </p>
          <div
            key={signedTick}
            className="mt-1 text-3xl font-semibold leading-tight animate-numberRoll"
          >
            {formatNumber(signed)}
          </div>
          <p className="mt-1 text-xs text-violet-100">
            Updating every minute
          </p>
        </div>
      </div>
    </div>
  );
}

