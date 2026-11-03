import { contrastRatio, luminance, sanitizeColor } from "./colors.ts";
import type { Ecc, QrStyle } from "./types.ts";

export type Advice = { tone: "ok" | "warn" | "bad"; text: string };

const ECC_LABEL: Record<Ecc, string> = {
  L: "Low",
  M: "Medium",
  Q: "Quartile",
  H: "High",
};

export function scanAdvice(options: {
  style: QrStyle;
  moduleCount: number | null;
  hasLogo: boolean;
  logoFits: boolean;
  bytes: number;
  experimental: boolean;
}): Advice[] {
  const notes: Advice[] = [];
  const foreground = sanitizeColor(options.style.foreground, "#111111");
  const background = options.style.transparent
    ? "#ffffff"
    : sanitizeColor(options.style.background, "#ffffff");

  if (options.experimental) {
    notes.push({
      tone: "bad",
      text: "Experimental embed. Many phone cameras will not open an image stored inside the code.",
    });
  }
  if (options.style.transparent) {
    notes.push({
      tone: "warn",
      text: "A transparent background is only safe on a plain light surface. Patterns behind the code can stop it scanning.",
    });
  }
  if (luminance(foreground) > luminance(background)) {
    notes.push({
      tone: "warn",
      text: "Modules are lighter than the background. Some cameras only read dark marks on a light field.",
    });
  }
  const ratio = contrastRatio(foreground, background);
  if (ratio < 3) {
    notes.push({
      tone: "bad",
      text: `Contrast is ${ratio.toFixed(1)}:1. This is very likely to fail. Choose a darker foreground or a lighter background.`,
    });
  } else if (ratio < 4.5) {
    notes.push({
      tone: "warn",
      text: `Contrast is ${ratio.toFixed(1)}:1. It may fail in poor light. Aim for at least 4.5:1.`,
    });
  }
  if (options.style.quiet <= 0) {
    notes.push({
      tone: "bad",
      text: "There is no quiet zone. Scanners need a blank margin around the code.",
    });
  } else if (options.style.quiet < 4) {
    notes.push({
      tone: "warn",
      text: "The quiet zone is under 4 modules, which is the usual minimum.",
    });
  }
  if (options.style.dot === "dots") {
    notes.push({
      tone: "warn",
      text: "Dot modules leave gaps. Prefer High error correction and test with a phone camera.",
    });
  }
  if (options.style.corner === "dot") {
    notes.push({
      tone: "warn",
      text: "Circular eyes are less reliable than square eyes. Test before you print.",
    });
  }
  if (options.hasLogo && !options.logoFits) {
    notes.push({
      tone: "bad",
      text: "This code is too small to reserve a safe gap for a logo. Remove the logo or add more content.",
    });
  } else if (options.hasLogo && (options.style.ecc === "L" || options.style.ecc === "M")) {
    notes.push({
      tone: "bad",
      text: `Error correction is ${ECC_LABEL[options.style.ecc]}. A center logo needs Quartile or High.`,
    });
  } else if (options.hasLogo && options.style.logoScale > 0.28) {
    notes.push({
      tone: "warn",
      text: "The logo is large. Shrink it if a phone cannot scan.",
    });
  }
  if (options.bytes > 1200) {
    notes.push({
      tone: "warn",
      text: "This code is dense. Print it larger, or shorten the content.",
    });
  }
  if (notes.length === 0) {
    notes.push({
      tone: "ok",
      text: "Contrast and quiet zone look scan-friendly. Still test with a phone camera before you print.",
    });
  }
  return notes;
}
