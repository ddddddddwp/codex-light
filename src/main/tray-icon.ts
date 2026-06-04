import { deflateSync } from 'node:zlib';

export const TRAY_ICON_SIZE = 32;

const CHANNELS_PER_PIXEL = 4;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DARK = { red: 0x0d, green: 0x11, blue: 0x17, alpha: 0xff };
const GREEN = { red: 0x31, green: 0xd2, blue: 0x7c, alpha: 0xff };
const TRANSPARENT = { red: 0, green: 0, blue: 0, alpha: 0 };

interface PngColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

interface NativeImageFactory {
  createFromBuffer(buffer: Buffer): Electron.NativeImage;
}

export function createTrayImage(nativeImage: NativeImageFactory): Electron.NativeImage {
  return nativeImage.createFromBuffer(createTrayIconPngBuffer());
}

export function createTrayIconPngBuffer(): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(TRAY_ICON_SIZE, 0);
  header.writeUInt32BE(TRAY_ICON_SIZE, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(createRawPngRows())),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function createRawPngRows(): Buffer {
  const rowByteLength = TRAY_ICON_SIZE * CHANNELS_PER_PIXEL;
  const rows = Buffer.alloc((rowByteLength + 1) * TRAY_ICON_SIZE);

  for (let y = 0; y < TRAY_ICON_SIZE; y += 1) {
    const rowStart = y * (rowByteLength + 1);
    rows[rowStart] = 0;

    for (let x = 0; x < TRAY_ICON_SIZE; x += 1) {
      const color = colorForPixel(x, y);
      const offset = rowStart + 1 + x * CHANNELS_PER_PIXEL;
      rows[offset] = color.red;
      rows[offset + 1] = color.green;
      rows[offset + 2] = color.blue;
      rows[offset + 3] = color.alpha;
    }
  }

  return rows;
}

function colorForPixel(x: number, y: number): PngColor {
  const center = TRAY_ICON_SIZE / 2 - 0.5;
  const dx = x - center;
  const dy = y - center;

  if (Math.sqrt(dx * dx + dy * dy) <= 7.25) {
    return GREEN;
  }

  return isInsideRoundedRect(x, y, 8) ? DARK : TRANSPARENT;
}

function isInsideRoundedRect(x: number, y: number, radius: number): boolean {
  const left = radius;
  const right = TRAY_ICON_SIZE - radius - 1;
  const top = radius;
  const bottom = TRAY_ICON_SIZE - radius - 1;

  if ((x >= left && x <= right) || (y >= top && y <= bottom)) {
    return true;
  }

  const cornerX = x < left ? left : right;
  const cornerY = y < top ? top : bottom;
  const dx = x - cornerX;
  const dy = y - cornerY;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
