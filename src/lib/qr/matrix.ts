import qrcode from "qrcode-generator";
import type { Ecc } from "./types.ts";

type QRCode = {
  addData(data: string, mode?: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
};

type Factory = {
  (typeNumber: number, errorCorrectionLevel: Ecc): QRCode;
  stringToBytes: (value: string) => number[];
  stringToBytesFuncs: Record<string, (value: string) => number[]>;
};

// qrcode-generator's default encoder keeps only the low byte of each character.
// Point it at the UTF-8 encoder before any matrix is built.
const factory = qrcode as unknown as Factory;
const utf8 = factory.stringToBytesFuncs["UTF-8"];
if (!utf8) throw new Error("QR encoder is missing UTF-8 support.");
factory.stringToBytes = utf8;

export function utf8Bytes(value: string): number[] {
  return factory.stringToBytes(value);
}

export function buildMatrix(data: string, ecc: Ecc): boolean[][] {
  const qr = factory(0, ecc);
  qr.addData(data, "Byte");
  qr.make();
  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];
  for (let row = 0; row < count; row += 1) {
    const line: boolean[] = new Array(count);
    for (let col = 0; col < count; col += 1) line[col] = qr.isDark(row, col);
    matrix.push(line);
  }
  return matrix;
}
