export type ResolvedByteRange = {
  start: number;
  end: number;
  length: number;
  contentRange: string;
  requestHeader: string;
};

export class InvalidByteRangeError extends Error {
  readonly status = 416;
  constructor(readonly totalBytes: number) {
    super("Requested byte range is not satisfiable.");
    this.name = "InvalidByteRangeError";
  }
}

export function parseSingleByteRange(
  header: string | null,
  totalBytes: number,
): ResolvedByteRange | null {
  if (!header) return null;
  if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0) {
    throw new InvalidByteRangeError(Math.max(0, totalBytes));
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) throw new InvalidByteRangeError(totalBytes);

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new InvalidByteRangeError(totalBytes);
    }
    start = Math.max(0, totalBytes - suffixLength);
    end = totalBytes - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalBytes - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= totalBytes ||
      end < start
    ) {
      throw new InvalidByteRangeError(totalBytes);
    }
    end = Math.min(end, totalBytes - 1);
  }
  const length = end - start + 1;
  return {
    start,
    end,
    length,
    contentRange: `bytes ${start}-${end}/${totalBytes}`,
    requestHeader: `bytes=${start}-${end}`,
  };
}

export function strongPdfEtag(sha256: string) {
  if (!/^[a-f0-9]{64}$/i.test(sha256)) throw new Error("A valid PDF checksum is required.");
  return `"sha256-${sha256.toLowerCase()}"`;
}

export function ifRangeAllowsRange(ifRange: string | null, etag: string) {
  if (!ifRange) return true;
  return ifRange.trim() === etag;
}
