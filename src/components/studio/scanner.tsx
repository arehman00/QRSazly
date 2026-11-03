import { useEffect, useRef, useState } from "react";
import { Camera, Copy, Flashlight, FlashlightOff, ImageUp, RotateCcw, ShieldAlert, Square, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { listVideoDeviceIds, nextCameraId, openCamera, stopStream } from "@/lib/scan/camera";
import { createReader, decodeQrImage, imageFileError, sampleVideoQr } from "@/lib/scan/decode-image";
import { interpret, type ScanInfo } from "@/lib/scan/interpret";
import {
  TORCH_UNSUPPORTED_MESSAGE,
  TorchUnconfirmedError,
  TorchUnsupportedError,
  applyTorch,
  readTorchSupport,
  releaseTorch,
} from "@/lib/scan/torch";
import { cn } from "@/lib/cn";
import { Button } from "./ui";

type Phase = "idle" | "live" | "error" | "result";

type CameraNotice = { title: string; body: string; denied?: boolean };

function errorName(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return error.name;
  if (error instanceof Error) return error.name;
  return "";
}

function describeCameraError(error: unknown): CameraNotice {
  const name = errorName(error);
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      denied: true,
      title: "Camera access was denied",
      body: "QRSazly did not open the camera. Allow camera access in your browser settings, then use Try camera again. This page will not keep asking on its own.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      title: "No camera was found",
      body: "This device does not have a camera QRSazly can use. Upload a QR code image instead.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return {
      title: "Camera is unavailable",
      body: "Another app may be using the camera, or the device could not start it. Close other camera apps and try again, or upload an image.",
    };
  }
  if (name === "SecurityError") {
    return {
      title: "Camera is blocked on this connection",
      body: "Browsers only allow the camera on a secure HTTPS page, or on localhost. Open QRSazly over HTTPS, or upload a QR image.",
    };
  }
  if (name === "NotSupportedError") {
    return {
      title: "This browser cannot use the camera",
      body: "Camera scanning is not supported here. Upload a PNG, JPG, JPEG, or WEBP image instead.",
    };
  }
  return {
    title: "The camera could not start",
    body: "QRSazly could not open a camera preview. Check the permission and try again, or upload an image.",
  };
}

const INSECURE: CameraNotice = {
  title: "Camera needs a secure page",
  body: "This browser will not share the camera over an insecure HTTP connection. Open QRSazly with HTTPS, or upload a QR code image.",
};

const UNSUPPORTED: CameraNotice = {
  title: "This browser cannot use the camera",
  body: "Camera scanning is not available. You can still upload a PNG, JPG, JPEG, or WEBP image.",
};

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const locked = useRef(false);
  const acceptRef = useRef<(text: string) => void>(() => undefined);
  const releaseTail = useRef<Promise<void>>(Promise.resolve());
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState<CameraNotice | null>(null);
  const [denied, setDenied] = useState(false);
  const [result, setResult] = useState<ScanInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<string[]>([]);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState<boolean | null>(null);
  const [torchMessage, setTorchMessage] = useState<string | null>(null);
  const [torchBusy, setTorchBusy] = useState(false);

  acceptRef.current = (text: string) => {
    if (locked.current) return;
    locked.current = true;
    setResult(interpret(text));
    setCopied(false);
    setUploadError(null);
    setTorchOn(false);
    setPhase("result");
  };

  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    if (!video) return;
    const box: {
      stream: MediaStream | null;
      controls: { stop: () => void } | null;
      cancelled: boolean;
    } = { stream: null, controls: null, cancelled: false };
    let timer = 0;
    const sampleCanvas = document.createElement("canvas");
    const reader = createReader();

    const onFrame = (value: { getText: () => string } | undefined) => {
      const text = value?.getText();
      if (text) acceptRef.current(text);
    };

    function publishTorch(media: MediaStream) {
      const support = readTorchSupport(media.getVideoTracks()[0]);
      if (box.cancelled) return;
      setTorchSupported(support.supported);
      setTorchOn(support.supported && support.enabled);
      setTorchMessage(support.supported ? null : TORCH_UNSUPPORTED_MESSAGE);
    }

    async function shutdown(media: MediaStream | null, active: { stop: () => void } | null) {
      const track = media?.getVideoTracks()[0];
      if (track && track.readyState !== "ended" && readTorchSupport(track).supported) {
        await releaseTorch(track);
      }
      try {
        active?.stop();
      } catch {
        // The decoder may already have released the stream.
      }
      stopStream(media);
      if (video && video.srcObject === media) video.srcObject = null;
      if (streamRef.current === media) streamRef.current = null;
    }

    function enqueue(task: () => Promise<void>) {
      const run = releaseTail.current.then(task, task);
      releaseTail.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    }

    function failCamera(error: unknown) {
      const next = describeCameraError(error);
      if (next.denied) setDenied(true);
      setNotice(next);
      setPhase("error");
    }

    void enqueue(async () => {
      if (box.cancelled) return;
      try {
        box.stream = await openCamera(cameraId);
      } catch (error) {
        if (!box.cancelled) failCamera(error);
        return;
      }
      if (box.cancelled) {
        await shutdown(box.stream, null);
        return;
      }
      streamRef.current = box.stream;
      publishTorch(box.stream);
      try {
        box.controls = await reader.decodeFromStream(box.stream, video, onFrame);
      } catch (error) {
        await shutdown(box.stream, null);
        if (!box.cancelled) failCamera(error);
        return;
      }
      if (box.cancelled) {
        await shutdown(box.stream, box.controls);
        return;
      }
      publishTorch(box.stream);
      const ids = await listVideoDeviceIds();
      if (!box.cancelled) setCameras(ids);
      timer = window.setInterval(() => {
        if (locked.current) return;
        const text = sampleVideoQr(video, sampleCanvas);
        if (text) acceptRef.current(text);
      }, 220);
      if (box.cancelled) window.clearInterval(timer);
    });

    return () => {
      box.cancelled = true;
      window.clearInterval(timer);
      void enqueue(() => shutdown(box.stream, box.controls));
    };
  }, [phase, cameraId]);

  function startCamera() {
    if (denied) return;
    if (!window.isSecureContext) {
      setNotice(INSECURE);
      setPhase("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice(UNSUPPORTED);
      setPhase("error");
      return;
    }
    locked.current = false;
    setResult(null);
    setNotice(null);
    setUploadError(null);
    setTorchOn(false);
    setTorchSupported(null);
    setTorchMessage(null);
    setPhase("live");
  }

  function stopCamera() {
    locked.current = true;
    setTorchOn(false);
    setTorchSupported(null);
    setTorchMessage(null);
    setPhase("idle");
  }

  function scanAgain() {
    locked.current = false;
    setResult(null);
    setCopied(false);
    setUploadError(null);
    setNotice(null);
    setTorchOn(false);
    setTorchSupported(null);
    setTorchMessage(null);
    setPhase("idle");
    setFileKey((value) => value + 1);
  }

  function switchCamera() {
    const current = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
    const next = nextCameraId(cameras, current);
    if (!next || torchBusy) return;
    setTorchOn(false);
    setTorchSupported(null);
    setTorchMessage(null);
    setCameraId(next);
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || torchBusy || track.readyState === "ended") return;
    const support = readTorchSupport(track);
    if (!support.supported) {
      setTorchSupported(false);
      setTorchOn(false);
      setTorchMessage(TORCH_UNSUPPORTED_MESSAGE);
      return;
    }
    const next = !support.enabled;
    setTorchBusy(true);
    try {
      const enabled = await applyTorch(track, next);
      if (streamRef.current?.getVideoTracks()[0] !== track) return;
      setTorchSupported(true);
      setTorchOn(enabled);
      setTorchMessage(
        enabled === next ? null : "The camera did not change the flashlight. Scanning is still running.",
      );
    } catch (error) {
      if (streamRef.current?.getVideoTracks()[0] !== track) return;
      if (error instanceof TorchUnsupportedError) {
        setTorchSupported(false);
        setTorchOn(false);
        setTorchMessage(TORCH_UNSUPPORTED_MESSAGE);
      } else if (error instanceof TorchUnconfirmedError) {
        setTorchOn(false);
        setTorchMessage("The camera did not confirm the flashlight state. Scanning is still running.");
      } else {
        const name = errorName(error);
        setTorchOn(readTorchSupport(track).enabled);
        setTorchMessage(
          name === "NotAllowedError" || name === "SecurityError"
            ? "The browser blocked flashlight control. Scanning is still running."
            : "The flashlight could not be changed. Scanning is still running.",
        );
      }
    } finally {
      setTorchBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const invalid = imageFileError(file);
    if (invalid) {
      setUploadError(invalid);
      setFileKey((value) => value + 1);
      return;
    }
    if (phase === "live") stopCamera();
    setUploadBusy(true);
    setUploadError(null);
    try {
      const text = await decodeQrImage(file);
      locked.current = false;
      acceptRef.current(text);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not read that image.");
    } finally {
      setUploadBusy(false);
      setFileKey((value) => value + 1);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.raw);
      setCopied(true);
      toast.success("Decoded result copied");
    } catch {
      toast.error("Could not copy the result.");
    }
  }

  const torchReady = torchSupported === true;
  const canSwitch = cameras.length > 1;

  return (
    <section id="scanner" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Scanner</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Scan a QR code</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Use the camera or choose a picture from your gallery. Decoding stays in this browser. Photos are not uploaded.
        </p>
      </div>

      {result && phase === "result" ? (
        <ResultCard result={result} copied={copied} onCopy={() => void copyResult()} onAgain={scanAgain} />
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-border bg-surface p-4 shadow-panel md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-primary">
                <Camera className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl leading-tight">Camera</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  The camera stays off until you press start. On a phone, the rear camera is preferred.
                </p>
              </div>
            </div>

            {phase === "live" ? (
              <div className="mt-5">
                <div className="relative overflow-hidden rounded-2xl bg-fg">
                  <video
                    ref={videoRef}
                    className="aspect-[3/4] w-full object-cover sm:aspect-video"
                    autoPlay
                    muted
                    playsInline
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="scan-frame" aria-hidden="true">
                      <span className="scan-corner scan-corner-tl" />
                      <span className="scan-corner scan-corner-tr" />
                      <span className="scan-corner scan-corner-bl" />
                      <span className="scan-corner scan-corner-br" />
                      <span className="scan-line" />
                    </div>
                  </div>
                  <div className="absolute left-3 top-3 z-10 flex gap-2">
                    {canSwitch ? (
                      <button
                        type="button"
                        className="inline-flex size-11 items-center justify-center rounded-full border border-bg/30 bg-fg/80 text-bg shadow-panel backdrop-blur-sm"
                        aria-label="Switch camera"
                        onClick={switchCamera}
                      >
                        <SwitchCamera className="size-5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="absolute right-3 top-3 z-10">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex size-11 items-center justify-center rounded-full border shadow-panel backdrop-blur-sm disabled:opacity-60",
                        torchOn ? "border-warn bg-warn text-bg" : "border-bg/30 bg-fg/80 text-bg",
                      )}
                      aria-pressed={torchOn}
                      aria-disabled={!torchReady || torchBusy}
                      disabled={!torchReady || torchBusy}
                      aria-label={
                        torchSupported === null
                          ? "Checking flashlight support"
                          : torchReady
                            ? torchOn
                              ? "Turn flashlight off"
                              : "Turn flashlight on"
                            : TORCH_UNSUPPORTED_MESSAGE
                      }
                      onClick={() => void toggleTorch()}
                    >
                      {torchOn ? (
                        <Flashlight className="size-5" aria-hidden="true" />
                      ) : (
                        <FlashlightOff className="size-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">Hold the code inside the frame. Scanning stops after one result.</p>
                {torchMessage ? (
                  <p className="mt-2 text-sm leading-6 text-muted" role="status">
                    {torchMessage}
                  </p>
                ) : null}
                <Button className="mt-4 w-full" variant="secondary" onClick={stopCamera}>
                  <Square className="size-4" aria-hidden="true" />
                  Stop Scanner
                </Button>
              </div>
            ) : (
              <div className="mt-5">
                {notice ? (
                  <div className="rounded-2xl border border-border bg-bg p-4" role="alert">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium">{notice.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{notice.body}</p>
                      </div>
                    </div>
                    {notice.denied || denied ? (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted">
                        <li>Open the lock or site controls in the address bar.</li>
                        <li>Set Camera to Allow for this site.</li>
                        <li>Return here and press Try camera again, then Start Camera Scanner.</li>
                      </ol>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-center text-sm leading-6 text-muted">
                    Point the rear camera at a QR code after you start. Nothing is requested before that.
                  </p>
                )}
                {denied ? (
                  <Button
                    className="mt-4 w-full"
                    variant="secondary"
                    onClick={() => {
                      setDenied(false);
                      setNotice(null);
                      setPhase("idle");
                    }}
                  >
                    Try camera again
                  </Button>
                ) : (
                  <Button className="mt-4 w-full" onClick={startCamera}>
                    <Camera className="size-4" aria-hidden="true" />
                    Start Camera Scanner
                  </Button>
                )}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-border bg-surface p-4 shadow-panel md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-primary">
                <ImageUp className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl leading-tight">Gallery</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Upload a QR code image from your phone gallery, computer, or file manager.
                </p>
              </div>
            </div>
            <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-bg px-4 py-8 text-center">
              <ImageUp className="size-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">{uploadBusy ? "Reading image…" : "Upload QR Code Image"}</span>
              <span className="text-xs leading-5 text-muted">PNG, JPG, JPEG, or WEBP. The file stays on this device.</span>
              <input
                key={fileKey}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                disabled={uploadBusy}
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </label>
            {uploadError ? (
              <p className="mt-3 text-sm leading-6 text-danger" role="alert">
                {uploadError}
              </p>
            ) : null}
          </article>
        </div>
      )}
    </section>
  );
}

function ResultCard({
  result,
  copied,
  onCopy,
  onAgain,
}: {
  result: ScanInfo;
  copied: boolean;
  onCopy: () => void;
  onAgain: () => void;
}) {
  return (
    <article className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-panel md:p-6" aria-live="polite">
      <p className="text-sm font-medium text-primary">Scan successful</p>
      <h2 className="mt-2 font-display text-3xl leading-tight">Decoded QR content</h2>
      <p className="mt-3 inline-flex min-h-8 items-center rounded-full bg-surface-2 px-3 text-sm font-medium">{result.typeLabel}</p>
      <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-border bg-bg p-4 text-sm leading-6">
        {result.raw}
      </pre>
      {result.fields.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.fields.map((item) => (
            <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-border bg-bg px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</dt>
              <dd className="mt-1 break-all text-sm leading-6">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {result.kind === "wifi" ? (
        <p className="mt-4 text-sm leading-6 text-muted">Network details are shown only. QRSazly will not join the Wi-Fi network.</p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onCopy}>
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "Copied" : "Copy Result"}
        </Button>
        <Button variant="secondary" onClick={onAgain}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Scan Again
        </Button>
        {result.openUrl ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium"
            href={result.openUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {result.openLabel}
          </a>
        ) : null}
      </div>
    </article>
  );
}
