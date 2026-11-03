import { BrowserQRCodeReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import jsQR from "jsqr";

const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export function imageFileError(file: File): string | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const extensionOk = /\.(png|jpe?g|webp)$/.test(name);
  if (type && !ACCEPTED.has(type)) return "Use a PNG, JPG, JPEG, or WEBP image.";
  if (!type && !extensionOk) return "Use a PNG, JPG, JPEG, or WEBP image.";
  if (file.size > 25 * 1024 * 1024) return "That image is larger than 25 MB. Choose a smaller photo of the QR code.";
  return null;
}

function createReader() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserQRCodeReader(hints, { delayBetweenScanAttempts: 200 });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = url;
  });
}

function readJsQr(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
  return code?.data || null;
}

function drawRegion(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxSide: number,
): HTMLCanvasElement | null {
  if (sw < 8 || sh < 8) return null;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const width = Math.max(32, Math.round(sw * scale));
  const height = Math.max(32, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

function regions(width: number, height: number) {
  return [
    { sx: 0, sy: 0, sw: width, sh: height },
    { sx: width * 0.15, sy: height * 0.15, sw: width * 0.7, sh: height * 0.7 },
    { sx: width * 0.28, sy: height * 0.28, sw: width * 0.44, sh: height * 0.44 },
  ];
}

export function sampleVideoQr(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  for (const region of regions(width, height).slice(0, 2)) {
    const scale = Math.min(1, 720 / Math.max(region.sw, region.sh));
    const targetW = Math.max(32, Math.round(region.sw * scale));
    const targetH = Math.max(32, Math.round(region.sh * scale));
    canvas.width = targetW;
    canvas.height = targetH;
    context.drawImage(video, region.sx, region.sy, region.sw, region.sh, 0, 0, targetW, targetH);
    const text = readJsQr(context.getImageData(0, 0, targetW, targetH));
    if (text) return text;
  }
  return null;
}

async function decodeElement(image: HTMLImageElement): Promise<string | null> {
  const reader = createReader();
  try {
    const result = await reader.decodeFromImageElement(image);
    const text = result.getText();
    if (text) return text;
  } catch {
    // Try scaled canvases and a second decoder below.
  }
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  for (const maxSide of [1800, 1200, 800, 480]) {
    for (const region of regions(width, height)) {
      const canvas = drawRegion(image, region.sx, region.sy, region.sw, region.sh, maxSide);
      if (!canvas) continue;
      try {
        const text = reader.decodeFromCanvas(canvas).getText();
        if (text) return text;
      } catch {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) continue;
        const fallback = readJsQr(context.getImageData(0, 0, canvas.width, canvas.height));
        if (fallback) return fallback;
      }
    }
  }
  return null;
}

export async function decodeQrImage(file: File): Promise<string> {
  const invalid = imageFileError(file);
  if (invalid) throw new Error(invalid);
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const text = await decodeElement(image);
    if (!text) {
      throw new Error("No QR code was found in this image. Use a clearer picture that includes the whole code and the quiet space around it.");
    }
    return text;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { createReader };
