import { AlertTriangle, Check, Copy, Download, RefreshCw } from "lucide-react";
import type { Advice } from "@/lib/qr/advice";
import type { PayloadResult } from "@/lib/qr/encode";
import { Button } from "./ui";

export function Preview({
  svg,
  payload,
  buildError,
  advice,
  bytes,
  transparent,
  busy,
  onDownload,
  onCopyImage,
  onCopyData,
  onRefresh,
}: {
  svg: string | null;
  payload: PayloadResult;
  buildError: string | null;
  advice: Advice[];
  bytes: number;
  transparent: boolean;
  busy: string | null;
  onDownload: (format: "png" | "svg" | "jpeg" | "hires") => void;
  onCopyImage: () => void;
  onCopyData: () => void;
  onRefresh: () => void;
}) {
  const message = buildError ?? (!payload.ok ? payload.message : null);
  const note = payload.ok ? payload.note : undefined;
  return (
    <div className="grid gap-4 rounded-3xl border border-border bg-bg p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight">Preview</h2>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm" onClick={onRefresh} title="Draw the code again from the current input">
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh
        </button>
      </div>
      <div className={`flex min-h-64 items-center justify-center rounded-xl p-3 ${transparent && svg ? "qr-checker" : "bg-surface"}`}>
        {svg ? (
          <div id="qr-preview" data-qr-ready="true" className="qr-output" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <p id="qr-preview" data-qr-ready="false" className="max-w-xs text-center text-sm leading-6 text-muted">
            {message ?? "Your QR code will appear here."}
          </p>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {busy ? `Preparing ${busy}` : svg ? "QR code ready" : message ?? "Waiting for input"}
      </p>
      {svg && message ? <p className="text-sm leading-6 text-danger">{message}</p> : null}
      {note ? <p className="text-sm leading-6 text-muted">{note}</p> : null}
      {svg ? (
        <p className="text-xs tabular-nums text-muted">
          {bytes} bytes · error correction shown in the style panel
        </p>
      ) : null}
      {svg ? (
        <ul className="grid gap-2" aria-label="Scan check">
          {advice.map((item) => (
            <li key={item.text} className={`flex gap-2 text-sm leading-5 ${item.tone === "bad" ? "text-danger" : item.tone === "warn" ? "text-warn" : "text-primary"}`}>
              {item.tone === "ok" ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button className="col-span-2" disabled={!svg || Boolean(busy)} onClick={() => onDownload("png")}>
          <Download className="size-4" aria-hidden="true" />
          {busy === "png" ? "Preparing PNG…" : "Download PNG"}
        </Button>
        <Button variant="secondary" disabled={!svg || Boolean(busy)} title="Vector file" onClick={() => onDownload("svg")}>
          {busy === "svg" ? "Preparing…" : "SVG"}
        </Button>
        <Button
          variant="secondary"
          disabled={!svg || Boolean(busy)}
          title={transparent ? "JPEG has no transparency. The background will be white." : "JPEG image"}
          onClick={() => onDownload("jpeg")}
        >
          {busy === "jpeg" ? "Preparing…" : "JPEG"}
        </Button>
        <Button variant="secondary" disabled={!svg || Boolean(busy)} title="2048 by 2048 PNG" onClick={() => onDownload("hires")}>
          {busy === "hires" ? "Preparing…" : "High-res PNG"}
        </Button>
        <Button variant="secondary" disabled={!svg || Boolean(busy)} onClick={onCopyImage}>
          <Copy className="size-4" aria-hidden="true" />
          {busy === "copy" ? "Copying…" : "Copy image"}
        </Button>
        <Button className="col-span-2" variant="secondary" disabled={!payload.ok || Boolean(busy)} onClick={onCopyData}>
          Copy encoded data
        </Button>
      </div>
      {payload.ok ? (
        <details className="group rounded-xl border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-medium">
            Show encoded data
          </summary>
          <pre id="encoded-data" className="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t border-border p-3 text-xs leading-5">{payload.data}</pre>
        </details>
      ) : null}
    </div>
  );
}
