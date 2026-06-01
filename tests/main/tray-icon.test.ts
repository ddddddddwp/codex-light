import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { createTrayIconPngBuffer, TRAY_ICON_SIZE } from '../../src/main/tray-icon';

describe('tray icon', () => {
  it('creates an opaque PNG icon with visible background and status dot pixels', () => {
    const png = createTrayIconPngBuffer();

    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.readUInt32BE(16)).toBe(TRAY_ICON_SIZE);
    expect(png.readUInt32BE(20)).toBe(TRAY_ICON_SIZE);
    expect(png[25]).toBe(6);
    const rows = inflateSync(readChunkData(png, 'IDAT'));

    expect(rows.includes(Buffer.from([0x31, 0xd2, 0x7c, 0xff]))).toBe(true);
    expect(rows.includes(Buffer.from([0x0d, 0x11, 0x17, 0xff]))).toBe(true);
  });
});

function readChunkData(png: Buffer, expectedType: string): Buffer {
  let offset = 8;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === expectedType) {
      return png.subarray(dataStart, dataEnd);
    }

    offset = dataEnd + 4;
  }

  throw new Error(`Missing PNG chunk: ${expectedType}`);
}
