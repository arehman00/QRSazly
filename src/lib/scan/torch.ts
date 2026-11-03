export const TORCH_UNSUPPORTED_MESSAGE = "Flashlight is not supported on this device/browser.";

export class TorchUnsupportedError extends Error {
  constructor() {
    super(TORCH_UNSUPPORTED_MESSAGE);
    this.name = "TorchUnsupportedError";
  }
}

export class TorchUnconfirmedError extends Error {
  constructor() {
    super("The camera did not confirm the flashlight state.");
    this.name = "TorchUnconfirmedError";
  }
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchSettings = MediaTrackSettings & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean };

export interface TorchCapableTrack {
  kind?: string;
  readyState?: string;
  getCapabilities?: () => MediaTrackCapabilities;
  getSettings?: () => MediaTrackSettings;
  applyConstraints: (constraints: MediaTrackConstraints) => Promise<void>;
}

const UNSUPPORTED_CONSTRAINT = new Set([
  "OverconstrainedError",
  "ConstraintNotSatisfiedError",
  "NotSupportedError",
  "TypeError",
  "NotFoundError",
]);

function errorName(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return error.name;
  if (error instanceof Error) return error.name;
  return "";
}

export function readTorchSupport(track: TorchCapableTrack | null | undefined): {
  supported: boolean;
  enabled: boolean;
} {
  if (!track || track.kind === "audio" || track.readyState === "ended") {
    return { supported: false, enabled: false };
  }
  let capabilities: TorchCapabilities | undefined;
  try {
    capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
  } catch {
    return { supported: false, enabled: false };
  }
  if (capabilities?.torch !== true) return { supported: false, enabled: false };
  try {
    const settings = track.getSettings?.() as TorchSettings | undefined;
    return { supported: true, enabled: settings?.torch === true };
  } catch {
    return { supported: true, enabled: false };
  }
}

export async function applyTorch(track: TorchCapableTrack, enabled: boolean): Promise<boolean> {
  if (!readTorchSupport(track).supported) throw new TorchUnsupportedError();
  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as TorchConstraintSet],
    });
  } catch (error) {
    if (UNSUPPORTED_CONSTRAINT.has(errorName(error))) throw new TorchUnsupportedError();
    throw error;
  }
  let reported: boolean | undefined;
  try {
    reported = (track.getSettings?.() as TorchSettings | undefined)?.torch;
  } catch {
    reported = undefined;
  }
  if (typeof reported !== "boolean") throw new TorchUnconfirmedError();
  if (!readTorchSupport(track).supported) throw new TorchUnsupportedError();
  return reported;
}

export async function releaseTorch(track: TorchCapableTrack | null | undefined): Promise<void> {
  if (!track || track.readyState === "ended") return;
  if (!readTorchSupport(track).supported) return;
  try {
    await track.applyConstraints({
      advanced: [{ torch: false } as TorchConstraintSet],
    });
  } catch {
    // Stopping the track turns the LED off on devices that expose torch.
  }
}
