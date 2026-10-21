export type ZipEntry = {
  name: string;
  bytes: Uint8Array;
};

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  new DataView(target.buffer).setUint16(offset, value, true);
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  new DataView(target.buffer).setUint32(offset, value, true);
}

/**
 * Creates a standards-compliant, uncompressed ZIP entirely in the browser.
 * Image exports are already encoded, so avoiding a second compression pass is
 * both faster and less memory-hungry for large PDF jobs.
 */
export function createStoredZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const files = entries.map((entry) => ({ ...entry, nameBytes: encoder.encode(entry.name), crc: crc32(entry.bytes) }));
  const localSize = files.reduce((total, file) => total + 30 + file.nameBytes.length + file.bytes.length, 0);
  const centralSize = files.reduce((total, file) => total + 46 + file.nameBytes.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  let offset = 0;
  const centralOffsets: number[] = [];

  for (const file of files) {
    centralOffsets.push(offset);
    writeUint32(output, offset, 0x04034b50);
    writeUint16(output, offset + 4, 20);
    writeUint16(output, offset + 6, 0x0800);
    writeUint16(output, offset + 8, 0);
    writeUint16(output, offset + 10, 0);
    writeUint16(output, offset + 12, 0);
    writeUint32(output, offset + 14, file.crc);
    writeUint32(output, offset + 18, file.bytes.length);
    writeUint32(output, offset + 22, file.bytes.length);
    writeUint16(output, offset + 26, file.nameBytes.length);
    writeUint16(output, offset + 28, 0);
    output.set(file.nameBytes, offset + 30);
    output.set(file.bytes, offset + 30 + file.nameBytes.length);
    offset += 30 + file.nameBytes.length + file.bytes.length;
  }

  const centralStart = offset;
  files.forEach((file, index) => {
    writeUint32(output, offset, 0x02014b50);
    writeUint16(output, offset + 4, 20);
    writeUint16(output, offset + 6, 20);
    writeUint16(output, offset + 8, 0x0800);
    writeUint16(output, offset + 10, 0);
    writeUint16(output, offset + 12, 0);
    writeUint16(output, offset + 14, 0);
    writeUint32(output, offset + 16, file.crc);
    writeUint32(output, offset + 20, file.bytes.length);
    writeUint32(output, offset + 24, file.bytes.length);
    writeUint16(output, offset + 28, file.nameBytes.length);
    writeUint16(output, offset + 30, 0);
    writeUint16(output, offset + 32, 0);
    writeUint16(output, offset + 34, 0);
    writeUint16(output, offset + 36, 0);
    writeUint32(output, offset + 38, 0);
    writeUint32(output, offset + 42, centralOffsets[index]);
    output.set(file.nameBytes, offset + 46);
    offset += 46 + file.nameBytes.length;
  });

  const centralLength = offset - centralStart;
  writeUint32(output, offset, 0x06054b50);
  writeUint16(output, offset + 4, 0);
  writeUint16(output, offset + 6, 0);
  writeUint16(output, offset + 8, files.length);
  writeUint16(output, offset + 10, files.length);
  writeUint32(output, offset + 12, centralLength);
  writeUint32(output, offset + 16, centralStart);
  writeUint16(output, offset + 20, 0);

  return new Blob([output.buffer], { type: "application/zip" });
}
