import { useEffect, useMemo, useRef, useState } from "react";
import {
  Contact,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Type,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { scanAdvice } from "@/lib/qr/advice";
import { buildQrSvg, renderRaster } from "@/lib/qr/draw";
import { applyExample, encodePayload } from "@/lib/qr/encode";
import { compressForEmbed, fileToPngDataUrl } from "@/lib/qr/images";
import { KIND_FIELDS, defaultStyle, emptyFields, type Fields, type Kind, type QrStyle } from "@/lib/qr/types";
import { cn } from "@/lib/cn";
import { Customize } from "./customize";
import { KindForm } from "./forms";
import { Preview } from "./preview";

const KINDS: { id: Kind; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "url", label: "URL", icon: Link2 },
  { id: "email", label: "Email", icon: Mail },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
  { id: "contact", label: "Contact", icon: Contact },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "location", label: "Location", icon: MapPin },
  { id: "image", label: "Image", icon: ImageIcon },
];

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFile(file: File): string | null {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    toast.error("Choose a PNG, JPEG, WebP, or GIF.");
    return null;
  }
  if (file.size > 8 * 1024 * 1024) {
    toast.error("That image is larger than 8 MB.");
    return null;
  }
  return URL.createObjectURL(file);
}

export function Workspace() {
  const [kind, setKind] = useState<Kind>("url");
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [style, setStyle] = useState<QrStyle>(defaultStyle);
  const [logo, setLogo] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [embedPreview, setEmbedPreview] = useState<string | null>(null);
  const [embedFile, setEmbedFile] = useState<File | null>(null);
  const [embedDataUrl, setEmbedDataUrl] = useState<string | null>(null);
  const [embedBytes, setEmbedBytes] = useState<number | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [embedBusy, setEmbedBusy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const previews = useRef<{ upload: string | null; embed: string | null }>({ upload: null, embed: null });

  useEffect(() => {
    const current = previews.current;
    return () => {
      if (current.upload) URL.revokeObjectURL(current.upload);
      if (current.embed) URL.revokeObjectURL(current.embed);
    };
  }, []);

  function replacePreview(slot: "upload" | "embed", next: string | null) {
    const previous = previews.current[slot];
    if (previous) URL.revokeObjectURL(previous);
    previews.current[slot] = next;
    if (slot === "upload") setUploadPreview(next);
    else setEmbedPreview(next);
  }

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  const payload = useMemo(
    () =>
      encodePayload({
        kind,
        fields,
        hasLocalImage: Boolean(uploadPreview),
        embedDataUrl,
      }),
    [kind, fields, uploadPreview, embedDataUrl],
  );

  const drawing = useMemo(() => {
    if (!payload.ok) return null;
    try {
      return { ok: true as const, ...buildQrSvg(payload.data, style, logo) };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Could not build a QR code.",
      };
    }
  }, [payload, style, logo]);

  const bytes = payload.ok ? new TextEncoder().encode(payload.data).length : 0;
  const svg = drawing?.ok ? drawing.svg : null;
  const advice = useMemo(() => {
    if (!drawing?.ok) return [];
    return scanAdvice({
      style,
      moduleCount: drawing.moduleCount,
      hasLogo: Boolean(logo),
      logoFits: drawing.logoFits,
      bytes,
      experimental: kind === "image" && fields.imageMode === "embed",
    });
  }, [drawing, style, logo, bytes, kind, fields.imageMode]);

  function clearInput() {
    const blank = emptyFields();
    setFields((current) => {
      const next: Fields = { ...current };
      for (const key of KIND_FIELDS[kind]) Object.assign(next, { [key]: blank[key] });
      return next;
    });
    if (kind === "image") {
      replacePreview("upload", null);
      replacePreview("embed", null);
      setEmbedFile(null);
      setEmbedDataUrl(null);
      setEmbedBytes(null);
      setEmbedError(null);
    }
    toast.success("Input cleared");
  }

  async function onLogo(file: File) {
    try {
      const dataUrl = await fileToPngDataUrl(file, 256);
      setLogo(dataUrl);
      setStyle((current) => {
        if (current.ecc === "L" || current.ecc === "M") {
          toast.success("Error correction set to High so the logo is less likely to block the code.");
          return { ...current, ecc: "H" };
        }
        return current;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not use that logo.");
    }
  }

  async function download(format: "png" | "svg" | "jpeg" | "hires") {
    if (!payload.ok) {
      toast.error("Fix the input before downloading.");
      return;
    }
    setBusy(format);
    try {
      if (format === "svg") {
        const drawn = buildQrSvg(payload.data, style, logo);
        saveBlob(new Blob([drawn.svg], { type: "image/svg+xml;charset=utf-8" }), "qrsazly.svg");
        toast.success("SVG downloaded");
        return;
      }
      const size = format === "hires" ? 2048 : style.size;
      const raster = format === "jpeg" ? "jpeg" : "png";
      const blob = await renderRaster({ data: payload.data, style, logoHref: logo, size, format: raster });
      const filename = format === "jpeg" ? "qrsazly.jpg" : format === "hires" ? "qrsazly-2048.png" : "qrsazly.png";
      saveBlob(blob, filename);
      if (format === "jpeg" && style.transparent) toast.success("JPEG downloaded. Transparency was flattened to white.");
      else if (format === "hires") toast.success("High-resolution PNG downloaded");
      else toast.success(format === "jpeg" ? "JPEG downloaded" : "PNG downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the file.");
    } finally {
      setBusy(null);
    }
  }

  async function copyImage() {
    if (!payload.ok) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      toast.error("This browser cannot copy images. Download the PNG instead.");
      return;
    }
    setBusy("copy");
    try {
      const blob = await renderRaster({
        data: payload.data,
        style,
        logoHref: logo,
        size: Math.max(style.size, 768),
        format: "png",
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("QR image copied");
    } catch {
      toast.error("Could not copy the image. Download the PNG instead.");
    } finally {
      setBusy(null);
    }
  }

  async function copyData() {
    if (!payload.ok) return;
    try {
      await navigator.clipboard.writeText(payload.data);
      toast.success("Encoded data copied");
    } catch {
      toast.error("Could not copy the encoded data.");
    }
  }

  async function createEmbed() {
    if (!embedFile) {
      toast.error("Choose an image first.");
      return;
    }
    if (!fields.embedAccepted) {
      toast.error("Confirm the scanner warning before embedding.");
      return;
    }
    setEmbedBusy(true);
    setEmbedError(null);
    try {
      const result = await compressForEmbed(embedFile);
      setEmbedDataUrl(result.dataUrl);
      setEmbedBytes(result.bytes);
      toast.success(`Experimental code uses ${result.bytes} bytes. Test it — many cameras will reject it.`);
    } catch (error) {
      setEmbedDataUrl(null);
      setEmbedBytes(null);
      const message = error instanceof Error ? error.message : "Could not embed that image.";
      setEmbedError(message);
      toast.error(message);
    } finally {
      setEmbedBusy(false);
    }
  }

  return (
    <section id="generator" className="scroll-mt-36 mx-auto w-full max-w-6xl px-4 py-6 md:scroll-mt-24 md:px-6">
      <div className="rounded-3xl border border-border bg-surface p-4 shadow-panel md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl leading-tight">Generator</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              Pick a type and fill in the details. The code updates on this device. Nothing you enter is sent to a server.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl border border-border bg-bg px-3 text-sm"
              onClick={() => {
                setFields((current) => applyExample(kind, current));
                toast.success("Example added. Replace it with your own details.");
              }}
            >
              Use example
            </button>
            <button type="button" className="min-h-11 rounded-xl px-3 text-sm text-muted" onClick={clearInput}>
              Clear input
            </button>
          </div>
        </div>
        <div className="studio-grid">
          <div className="studio-form min-w-0">
            <div role="tablist" aria-label="QR content type" className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {KINDS.map((item) => {
                const Icon = item.icon;
                const selected = kind === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={selected}
                    aria-controls="qr-panel"
                    onClick={() => setKind(item.id)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm",
                      selected ? "bg-primary text-primary-fg" : "border border-border bg-bg text-fg",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <form
              id="qr-panel"
              role="tabpanel"
              aria-labelledby={`tab-${kind}`}
              className="min-w-0"
              onSubmit={(event) => event.preventDefault()}
            >
              <KindForm
                kind={kind}
                fields={fields}
                payload={payload}
                set={set}
                uploadPreview={uploadPreview}
                onUploadFile={(file) => {
                  const url = readFile(file);
                  if (!url) return;
                  replacePreview("upload", url);
                }}
                onClearUpload={() => replacePreview("upload", null)}
                embedPreview={embedPreview}
                embedDataUrl={embedDataUrl}
                embedBytes={embedBytes}
                embedError={embedError}
                embedBusy={embedBusy}
                onEmbedFile={(file) => {
                  const url = readFile(file);
                  if (!url) return;
                  setEmbedFile(file);
                  setEmbedDataUrl(null);
                  setEmbedBytes(null);
                  setEmbedError(null);
                  replacePreview("embed", url);
                }}
                onCreateEmbed={() => void createEmbed()}
                onClearEmbed={() => {
                  setEmbedFile(null);
                  setEmbedDataUrl(null);
                  setEmbedBytes(null);
                  setEmbedError(null);
                  replacePreview("embed", null);
                }}
              />
            </form>
          </div>
          <div className="studio-preview" key={refreshKey}>
            <Preview
              svg={svg}
              payload={payload}
              buildError={drawing && !drawing.ok ? drawing.message : null}
              advice={advice}
              bytes={bytes}
              transparent={style.transparent}
              busy={busy}
              onDownload={(format) => void download(format)}
              onCopyImage={() => void copyImage()}
              onCopyData={() => void copyData()}
              onRefresh={() => {
                if (!payload.ok) {
                  toast.error("Add valid content before refreshing.");
                  return;
                }
                setRefreshKey((value) => value + 1);
                toast.success("Preview refreshed");
              }}
            />
          </div>
          <div className="studio-style">
            <Customize
              style={style}
              logo={logo}
              onChange={(partial) => setStyle((current) => ({ ...current, ...partial }))}
              onReset={() => {
                setStyle(defaultStyle);
                setLogo(null);
                toast.success("Style reset");
              }}
              onLogo={(file) => void onLogo(file)}
              onClearLogo={() => setLogo(null)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
