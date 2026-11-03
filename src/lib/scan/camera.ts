export function buildVideoConstraints(deviceId: string | null): MediaTrackConstraints {
  const size: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
  if (deviceId) return { ...size, deviceId: { exact: deviceId } };
  return { ...size, facingMode: { ideal: "environment" } };
}

export function nextCameraId(ids: readonly string[], currentId: string | undefined): string | null {
  const unique: string[] = [];
  for (const id of ids) {
    if (id && !unique.includes(id)) unique.push(id);
  }
  if (unique.length < 2) return null;
  const index = currentId ? unique.indexOf(currentId) : -1;
  return unique[(index + 1) % unique.length] ?? null;
}

function errorName(error: unknown): string {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return error.name;
  if (error instanceof Error) return error.name;
  return "";
}

function isConstraintMiss(error: unknown): boolean {
  const name = errorName(error);
  return name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError" || name === "NotFoundError";
}

export async function openCamera(deviceId: string | null): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildVideoConstraints(deviceId),
    });
  } catch (error) {
    if (!isConstraintMiss(error)) throw error;
    if (deviceId) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: buildVideoConstraints(null),
        });
      } catch (fallback) {
        if (!isConstraintMiss(fallback)) throw fallback;
      }
    }
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

export async function listVideoDeviceIds(): Promise<string[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const ids: string[] = [];
    for (const device of devices) {
      if (device.kind === "videoinput" && device.deviceId && !ids.includes(device.deviceId)) {
        ids.push(device.deviceId);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // The track may already be ended.
    }
  });
}
