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
      <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:gap-3">
        <div className="press-bounce relative overflow-hidden rounded-full bg-[#6A4EE8] px-4 py-1.5 text-center text-white shadow-md sm:px-6 sm:py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100 sm:text-xs">
            Documents edited
          </p>
          <div
            key={editedTick}
            className="mt-0.5 text-base font-semibold leading-tight sm:text-lg md:text-xl animate-numberRoll"
          >
            {formatNumber(edited)}
          </div>
        </div>

        <div className="press-bounce relative overflow-hidden rounded-full bg-[#6A4EE8] px-4 py-1.5 text-center text-white shadow-md sm:px-6 sm:py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100 sm:text-xs">
            Documents signed
          </p>
          <div
            key={signedTick}
            className="mt-0.5 text-base font-semibold leading-tight sm:text-lg md:text-xl animate-numberRoll"
          >
            {formatNumber(signed)}
          </div>
        </div>
      </div>
    </div>
  );
}
