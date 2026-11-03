import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVideoConstraints, nextCameraId } from "./camera.ts";

describe("camera selection", () => {
  it("prefers the rear camera until a device id is chosen", () => {
    assert.deepEqual(buildVideoConstraints(null), {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: { ideal: "environment" },
    });
    assert.deepEqual(buildVideoConstraints("rear"), {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      deviceId: { exact: "rear" },
    });
  });

  it("cycles cameras and resets by choosing a different id", () => {
    assert.equal(nextCameraId([], "a"), null);
    assert.equal(nextCameraId(["only"], "only"), null);
    assert.equal(nextCameraId(["rear", "front"], "rear"), "front");
    assert.equal(nextCameraId(["rear", "front"], "front"), "rear");
    assert.equal(nextCameraId(["rear", "front", "rear"], undefined), "rear");
    assert.equal(nextCameraId(["rear", "wide", "front"], "missing"), "rear");
  });
});
