const MAX_BYTES = 8 * 1024 * 1024;
const EMBED_LIMIT = 900;

function rejectFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF.");
  }
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 8 MB.");
}

async function bitmapOf(file: File): Promise<ImageBitmap> {
  rejectFile(file);
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that image. Use a PNG, JPEG, or WebP.");
  }
}

export async function fileToPngDataUrl(file: File, maxEdge: number): Promise<string> {
  const bitmap = await bitmapOf(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read that image.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

/**
 * Shrink a local image until its data URL can fit in a QR symbol.
 * This does not upload the file. Scanner support is intentionally not promised.
 */
export async function compressForEmbed(file: File): Promise<{ dataUrl: string; bytes: number }> {
  const bitmap = await bitmapOf(file);
  try {
    const steps = [
      { edge: 48, quality: 0.55 },
      { edge: 40, quality: 0.45 },
      { edge: 32, quality: 0.4 },
      { edge: 24, quality: 0.35 },
      { edge: 16, quality: 0.3 },
    ];
    let lastBytes = 0;
    for (const step of steps) {
      const scale = Math.min(1, step.edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not read that image.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", step.quality);
      lastBytes = new TextEncoder().encode(dataUrl).length;
      if (lastBytes <= EMBED_LIMIT) return { dataUrl, bytes: lastBytes };
    }
    throw new Error(
      `Even a tiny version is ${lastBytes} bytes, which is too large to embed. Host the image online and use its URL instead.`,
    );
  } finally {
    bitmap.close();
  }
}
