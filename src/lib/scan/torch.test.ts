import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TORCH_UNSUPPORTED_MESSAGE,
  TorchUnconfirmedError,
  TorchUnsupportedError,
  applyTorch,
  readTorchSupport,
  releaseTorch,
  type TorchCapableTrack,
} from "./torch.ts";

function track(partial: Partial<TorchCapableTrack> & Pick<TorchCapableTrack, "applyConstraints">): TorchCapableTrack {
  return { kind: "video", readyState: "live", ...partial };
}

describe("torch support", () => {
  it("treats a missing track as unsupported", () => {
    assert.deepEqual(readTorchSupport(null), { supported: false, enabled: false });
    assert.deepEqual(readTorchSupport(undefined), { supported: false, enabled: false });
  });

  it("requires capabilities.torch to be true", () => {
    const plain = track({
      applyConstraints: async () => undefined,
      getCapabilities: () => ({}) as MediaTrackCapabilities,
      getSettings: () => ({}) as MediaTrackSettings,
    });
    assert.equal(readTorchSupport(plain).supported, false);

    const listedFalse = track({
      applyConstraints: async () => undefined,
      getCapabilities: () => ({ torch: false }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: true }) as MediaTrackSettings,
    });
    assert.equal(readTorchSupport(listedFalse).supported, false);
  });

  it("reads the current LED state from getSettings", () => {
    const on = track({
      applyConstraints: async () => undefined,
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: true }) as MediaTrackSettings,
    });
    assert.deepEqual(readTorchSupport(on), { supported: true, enabled: true });
  });

  it("ignores ended tracks and capability failures", () => {
    const ended = track({
      readyState: "ended",
      applyConstraints: async () => undefined,
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
    });
    assert.equal(readTorchSupport(ended).supported, false);

    const broken = track({
      applyConstraints: async () => undefined,
      getCapabilities: () => {
        throw new Error("blocked");
      },
    });
    assert.equal(readTorchSupport(broken).supported, false);
  });

  it("toggles torch with the advanced constraint and trusts getSettings", async () => {
    let enabled = false;
    const calls: MediaTrackConstraints[] = [];
    const live = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: enabled }) as MediaTrackSettings,
      applyConstraints: async (constraints) => {
        calls.push(constraints);
        enabled = Boolean((constraints.advanced?.[0] as { torch?: boolean } | undefined)?.torch);
      },
    });

    assert.equal(await applyTorch(live, true), true);
    assert.deepEqual(calls[0], { advanced: [{ torch: true }] });
    assert.equal(await applyTorch(live, false), false);
    assert.deepEqual(calls[1], { advanced: [{ torch: false }] });
  });

  it("does not report the light as on when settings disagree or are missing", async () => {
    const disagreed = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: false }) as MediaTrackSettings,
      applyConstraints: async () => undefined,
    });
    assert.equal(await applyTorch(disagreed, true), false);

    const silent = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({}) as MediaTrackSettings,
      applyConstraints: async () => undefined,
    });
    await assert.rejects(() => applyTorch(silent, true), TorchUnconfirmedError);
  });

  it("maps unsupported constraint failures and leaves other errors alone", async () => {
    const unsupported = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: false }) as MediaTrackSettings,
      applyConstraints: async () => {
        const error = new Error("no torch");
        error.name = "OverconstrainedError";
        throw error;
      },
    });
    await assert.rejects(() => applyTorch(unsupported, true), (error: unknown) => {
      assert.ok(error instanceof TorchUnsupportedError);
      assert.equal(error.message, TORCH_UNSUPPORTED_MESSAGE);
      return true;
    });

    const denied = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: false }) as MediaTrackSettings,
      applyConstraints: async () => {
        const error = new Error("denied");
        error.name = "NotAllowedError";
        throw error;
      },
    });
    await assert.rejects(() => applyTorch(denied, true), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, "NotAllowedError");
      return true;
    });
  });

  it("turns a supported torch off and ignores unsupported tracks", async () => {
    const calls: boolean[] = [];
    const live = track({
      getCapabilities: () => ({ torch: true }) as MediaTrackCapabilities,
      getSettings: () => ({ torch: true }) as MediaTrackSettings,
      applyConstraints: async (constraints) => {
        calls.push(Boolean((constraints.advanced?.[0] as { torch?: boolean } | undefined)?.torch));
      },
    });
    await releaseTorch(live);
    assert.deepEqual(calls, [false]);

    let called = false;
    const plain = track({
      getCapabilities: () => ({}) as MediaTrackCapabilities,
      applyConstraints: async () => {
        called = true;
      },
    });
    await releaseTorch(plain);
    await releaseTorch(null);
    assert.equal(called, false);
  });
});
