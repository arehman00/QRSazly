import { sanitizeColor } from "./colors.ts";
import { buildMatrix } from "./matrix.ts";
import type { CornerStyle, DotStyle, EyeStyle, QrStyle } from "./types.ts";

export type QrDrawing = {
  svg: string;
  moduleCount: number;
  logoFits: boolean;
};

type ClearZone = { start: number; span: number };

type Layout = {
  size: number;
  module: number;
  offset: number;
  n: number;
  matrix: boolean[][];
  clear: ClearZone | null;
  fg: string;
  bg: string;
  transparent: boolean;
  dot: DotStyle;
  corner: CornerStyle;
  eye: EyeStyle;
};

function fmt(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function tooLong(error: unknown): boolean {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  return /overflow|too big|code length/i.test(message);
}

function clearZone(count: number, scale: number, pad: number): ClearZone | null {
  let span = Math.round(count * scale) + pad * 2;
  if (span % 2 === 0) span += 1;
  const max = count - 16;
  if (max < 5) return null;
  if (span > max) span = max % 2 === 0 ? max - 1 : max;
  if (span < 5) return null;
  return { start: Math.floor((count - span) / 2), span };
}

function inFinder(row: number, col: number, count: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= count - 7) ||
    (row >= count - 7 && col < 7)
  );
}

function layoutOf(data: string, style: QrStyle, hasLogo: boolean): Layout {
  let matrix: boolean[][];
  try {
    matrix = buildMatrix(data, style.ecc);
  } catch (error) {
    if (tooLong(error)) {
      throw new Error(
        "This content is too long for a QR code at the selected error correction level. Shorten it, or choose Low.",
      );
    }
    throw new Error("Could not build a QR code from that content.");
  }
  const count = matrix.length;
  const size = Math.max(120, Math.round(style.size));
  const quiet = Math.max(0, Math.min(10, Math.round(style.quiet)));
  const span = count + quiet * 2;
  const module = size / span;
  const clear = hasLogo
    ? clearZone(count, Math.min(0.34, Math.max(0.12, style.logoScale)), Math.max(0, Math.min(4, Math.round(style.logoPad))))
    : null;
  return {
    size,
    module,
    offset: quiet * module,
    n: count,
    matrix,
    clear,
    fg: sanitizeColor(style.foreground, "#111111"),
    bg: sanitizeColor(style.background, "#ffffff"),
    transparent: style.transparent,
    dot: style.dot,
    corner: style.corner,
    eye: style.eye,
  };
}

function pathCircle(cx: number, cy: number, radius: number): string {
  return `M${fmt(cx - radius)} ${fmt(cy)}a${fmt(radius)} ${fmt(radius)} 0 1 0 ${fmt(radius * 2)} 0a${fmt(radius)} ${fmt(radius)} 0 1 0 -${fmt(radius * 2)} 0z`;
}

function pathRounded(x: number, y: number, size: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, size / 2));
  if (r === 0) return `M${fmt(x)} ${fmt(y)}h${fmt(size)}v${fmt(size)}h-${fmt(size)}z`;
  return [
    `M${fmt(x + r)} ${fmt(y)}`,
    `H${fmt(x + size - r)}`,
    `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + size)} ${fmt(y + r)}`,
    `V${fmt(y + size - r)}`,
    `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + size - r)} ${fmt(y + size)}`,
    `H${fmt(x + r)}`,
    `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y + size - r)}`,
    `V${fmt(y + r)}`,
    `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)}Z`,
  ].join("");
}

function dataRadius(dot: DotStyle, module: number): number | "gap" {
  if (dot === "dots") return "gap";
  if (dot === "extra-rounded") return module * 0.48;
  if (dot === "rounded") return module * 0.32;
  return 0;
}

function frameRadius(corner: CornerStyle, size: number): number | "circle" {
  if (corner === "dot") return "circle";
  if (corner === "extra-rounded") return size * 0.34;
  if (corner === "rounded") return size * 0.2;
  return 0;
}

function eyeRadius(eye: EyeStyle, size: number): number | "circle" {
  if (eye === "dot") return "circle";
  if (eye === "rounded") return size * 0.28;
  return 0;
}

function shapePath(x: number, y: number, size: number, radius: number | "circle" | "gap"): string {
  if (radius === "gap") return pathCircle(x + size / 2, y + size / 2, size * 0.34);
  if (radius === "circle") return pathCircle(x + size / 2, y + size / 2, size / 2);
  return pathRounded(x, y, size, radius);
}

function finderPaths(layout: Layout): string {
  const { module: mod, offset, n, corner, eye } = layout;
  const parts: string[] = [];
  const origins = [
    [offset, offset],
    [offset + (n - 7) * mod, offset],
    [offset, offset + (n - 7) * mod],
  ];
  for (const [x, y] of origins) {
    const outer = 7 * mod;
    const hole = 5 * mod;
    const pupil = 3 * mod;
    parts.push(shapePath(x, y, outer, frameRadius(corner, outer)));
    parts.push(shapePath(x + mod, y + mod, hole, frameRadius(corner, hole)));
    parts.push(shapePath(x + 2 * mod, y + 2 * mod, pupil, eyeRadius(eye, pupil)));
  }
  return parts.join("");
}

function dataPath(layout: Layout): string {
  const parts: string[] = [];
  const radius = dataRadius(layout.dot, layout.module);
  for (let row = 0; row < layout.n; row += 1) {
    for (let col = 0; col < layout.n; col += 1) {
      if (!layout.matrix[row]?.[col]) continue;
      if (inFinder(row, col, layout.n)) continue;
      if (
        layout.clear &&
        row >= layout.clear.start &&
        row < layout.clear.start + layout.clear.span &&
        col >= layout.clear.start &&
        col < layout.clear.start + layout.clear.span
      ) {
        continue;
      }
      parts.push(shapePath(layout.offset + col * layout.module, layout.offset + row * layout.module, layout.module, radius));
    }
  }
  return parts.join("");
}

export function logoBox(layout: Pick<Layout, "clear" | "offset" | "module">): { x: number; y: number; size: number } | null {
  if (!layout.clear) return null;
  const inset = layout.module * 0.45;
  const x = layout.offset + layout.clear.start * layout.module + inset;
  const size = layout.clear.span * layout.module - inset * 2;
  if (size < 8) return null;
  return { x, y: x, size };
}

function safeLogo(href: string | null): string | null {
  if (!href) return null;
  return /^data:image\/png;base64,[a-z0-9+/=\s]+$/i.test(href) ? href : null;
}

export function buildQrSvg(data: string, style: QrStyle, logoHref: string | null): QrDrawing {
  const logo = safeLogo(logoHref);
  const layout = layoutOf(data, style, Boolean(logo));
  const box = logo ? logoBox(layout) : null;
  const background = layout.transparent
    ? ""
    : `<rect width="${layout.size}" height="${layout.size}" fill="${layout.bg}"/>`;
  const image =
    logo && box
      ? `<image href="${logo}" x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.size)}" height="${fmt(box.size)}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.size}" height="${layout.size}" viewBox="0 0 ${layout.size} ${layout.size}" role="img" aria-label="QR code">${background}<path fill="${layout.fg}" d="${dataPath(layout)}"/><path fill="${layout.fg}" fill-rule="evenodd" d="${finderPaths(layout)}"/>${image}</svg>`;
  return { svg, moduleCount: layout.n, logoFits: !logo || Boolean(layout.clear && box) };
}

function traceShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number | "circle" | "gap",
) {
  if (radius === "gap" || radius === "circle") {
    const r = radius === "gap" ? size * 0.34 : size / 2;
    ctx.moveTo(x + size / 2 + r, y + size / 2);
    ctx.arc(x + size / 2, y + size / 2, r, 0, Math.PI * 2);
    return;
  }
  const r = Math.max(0, Math.min(radius, size / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + size, y, x + size, y + size, r);
  ctx.arcTo(x + size, y + size, x, y + size, r);
  ctx.arcTo(x, y + size, x, y, r);
  ctx.arcTo(x, y, x + size, y, r);
  ctx.closePath();
}

function paint(ctx: CanvasRenderingContext2D, layout: Layout, logo: CanvasImageSource | null) {
  ctx.clearRect(0, 0, layout.size, layout.size);
  if (!layout.transparent) {
    ctx.fillStyle = layout.bg;
    ctx.fillRect(0, 0, layout.size, layout.size);
  }
  ctx.fillStyle = layout.fg;
  ctx.beginPath();
  const radius = dataRadius(layout.dot, layout.module);
  for (let row = 0; row < layout.n; row += 1) {
    for (let col = 0; col < layout.n; col += 1) {
      if (!layout.matrix[row]?.[col]) continue;
      if (inFinder(row, col, layout.n)) continue;
      if (
        layout.clear &&
        row >= layout.clear.start &&
        row < layout.clear.start + layout.clear.span &&
        col >= layout.clear.start &&
        col < layout.clear.start + layout.clear.span
      ) {
        continue;
      }
      traceShape(ctx, layout.offset + col * layout.module, layout.offset + row * layout.module, layout.module, radius);
    }
  }
  ctx.fill();

  const { module: mod, offset, n } = layout;
  const origins = [
    [offset, offset],
    [offset + (n - 7) * mod, offset],
    [offset, offset + (n - 7) * mod],
  ];
  for (const [x, y] of origins) {
    ctx.beginPath();
    traceShape(ctx, x, y, 7 * mod, frameRadius(layout.corner, 7 * mod));
    traceShape(ctx, x + mod, y + mod, 5 * mod, frameRadius(layout.corner, 5 * mod));
    traceShape(ctx, x + 2 * mod, y + 2 * mod, 3 * mod, eyeRadius(layout.eye, 3 * mod));
    ctx.fill("evenodd");
  }

  const box = logo ? logoBox(layout) : null;
  if (logo && box) {
    const image = logo as HTMLImageElement;
    const width = "naturalWidth" in image && image.naturalWidth ? image.naturalWidth : box.size;
    const height = "naturalHeight" in image && image.naturalHeight ? image.naturalHeight : box.size;
    const aspect = width / height || 1;
    let dw = box.size;
    let dh = box.size;
    if (aspect > 1) dh = box.size / aspect;
    else dw = box.size * aspect;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, box.x + (box.size - dw) / 2, box.y + (box.size - dh) / 2, dw, dh);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not draw the center logo."));
    image.src = src;
  });
}

export async function renderRaster(options: {
  data: string;
  style: QrStyle;
  logoHref: string | null;
  size: number;
  format: "png" | "jpeg";
}): Promise<Blob> {
  const logo = safeLogo(options.logoHref);
  const flatten = options.format === "jpeg";
  const style = flatten && options.style.transparent
    ? { ...options.style, transparent: false, background: "#ffffff", size: options.size }
    : { ...options.style, size: options.size };
  const layout = layoutOf(options.data, style, Boolean(logo));
  const canvas = document.createElement("canvas");
  canvas.width = layout.size;
  canvas.height = layout.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");
  const image = logo ? await loadImage(logo) : null;
  paint(ctx, layout, image);
  const type = options.format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), type, 0.92);
  });
  if (!blob) throw new Error("Could not create the file.");
  return blob;
}
