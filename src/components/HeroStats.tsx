"use client";

import { useEffect, useState } from "react";

const EDIT_BASE = 2_859_840;
const SIGN_BASE = 476_640;
const EDIT_INTERVAL_MS = 10_000; // 10 seconds
const SIGN_INTERVAL_MS = 60_000; // 60 seconds
const STATS_START_TIMESTAMP = Date.UTC(2025, 0, 1, 0, 0, 0); // Jan 1, 2025 UTC

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function computeCurrentCounts() {
  const now = Date.now();
  const elapsed = Math.max(0, now - STATS_START_TIMESTAMP);
  const editedExtra = Math.floor(elapsed / EDIT_INTERVAL_MS);
  const signedExtra = Math.floor(elapsed / SIGN_INTERVAL_MS);
  return {
    edited: EDIT_BASE + editedExtra,
    signed: SIGN_BASE + signedExtra,
  };
}

export default function HeroStats() {
  const [edited, setEdited] = useState(EDIT_BASE);
  const [signed, setSigned] = useState(SIGN_BASE);
  const [editedTick, setEditedTick] = useState(0);
  const [signedTick, setSignedTick] = useState(0);

  useEffect(() => {
    const initial = computeCurrentCounts();
    setEdited(initial.edited);
    setSigned(initial.signed);

    const editedInterval = setInterval(() => {
      const { edited: nextEdited } = computeCurrentCounts();
      setEdited(nextEdited);
      setEditedTick((tick) => tick + 1);
    }, EDIT_INTERVAL_MS);

    const signedInterval = setInterval(() => {
      const { signed: nextSigned } = computeCurrentCounts();
      setSigned(nextSigned);
      setSignedTick((tick) => tick + 1);
    }, SIGN_INTERVAL_MS);

    return () => {
      clearInterval(editedInterval);
      clearInterval(signedInterval);
    };
  }, []);

  return (
    <div className="mt-6 flex justify-center lg:justify-start">
      <div className="flex w-full max-w-2xl items-start justify-center gap-6 lg:justify-start">
        <div className="text-center">
          <div
            key={editedTick}
            className="text-lg font-semibold leading-none text-slate-900 sm:text-xl md:text-2xl animate-numberRoll"
          >
            {formatNumber(edited)}
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
            Documents edited
          </p>
        </div>

        <div className="text-center border-l-2 border-slate-400/80 pl-6">
          <div
            key={signedTick}
            className="text-lg font-semibold leading-none text-slate-900 sm:text-xl md:text-2xl animate-numberRoll"
          >
            {formatNumber(signed)}
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
            Documents signed
          </p>
        </div>

        <div className="text-center border-l-2 border-slate-400/80 pl-6">
          <div className="text-lg font-semibold leading-none text-slate-900 sm:text-xl md:text-2xl">
            16,000+
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
            Monthly users
          </p>
        </div>
      </div>
    </div>
  );
}
