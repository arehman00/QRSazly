import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio } from "./colors.ts";
import { buildQrSvg } from "./draw.ts";
import { applyExample, encodePayload, normalizeHttpUrl } from "./encode.ts";
import { buildMatrix, utf8Bytes } from "./matrix.ts";
import { defaultStyle, emptyFields } from "./types.ts";

describe("encoder", () => {
  it("encodes UTF-8 rather than a single truncated byte", () => {
    assert.deepEqual(utf8Bytes("你"), [0xe4, 0xbd, 0xa0]);
  });

  it("builds finder patterns for plain text", () => {
    const matrix = buildMatrix("Hello from AR QR Studio — مرحبا — 你好", "M");
    const n = matrix.length;
    assert.equal(matrix[0]?.[0], true);
    assert.equal(matrix[6]?.[0], true);
    assert.equal(matrix[0]?.[6], true);
    assert.equal(matrix[1]?.[1], false);
    assert.equal(matrix[3]?.[3], true);
    assert.equal(matrix[0]?.[n - 1], true);
    assert.equal(matrix[n - 1]?.[0], true);
  });

  it("normalizes web addresses and rejects other schemes", () => {
    assert.equal(normalizeHttpUrl("example.com/a?b=1"), "https://example.com/a?b=1");
    assert.equal(normalizeHttpUrl("http://example.com"), "http://example.com/");
    assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  });

  it("escapes Wi-Fi fields", () => {
    const fields = emptyFields();
    fields.wifiSsid = "net;work";
    fields.wifiPass = "a:b";
    fields.wifiSecurity = "WPA";
    const result = encodePayload({ kind: "wifi", fields, hasLocalImage: false, embedDataUrl: null });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data, "WIFI:T:WPA;S:net\\;work;P:a\\:b;H:false;;");
  });

  it("builds a vCard", () => {
    const fields = applyExample("contact", emptyFields());
    const result = encodePayload({ kind: "contact", fields, hasLocalImage: false, embedDataUrl: null });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.data, /^BEGIN:VCARD\r\nVERSION:3\.0/);
      assert.match(result.data, /FN:Ada Lovelace/);
      assert.match(result.data, /END:VCARD$/);
    }
  });

  it("rejects a local image that has no public address", () => {
    const fields = emptyFields();
    fields.imageMode = "upload";
    const result = encodePayload({ kind: "image", fields, hasLocalImage: true, embedDataUrl: null });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.message, /stays on your device/);
  });

  it("draws an SVG without injecting color text", () => {
    const svg = buildQrSvg("https://example.com", { ...defaultStyle, foreground: "#111111\"><script>" }, null);
    assert.match(svg.svg, /<svg/);
    assert.equal(svg.svg.includes("<script"), false);
    assert.match(svg.svg, /fill="#111111"/);
    assert.ok(svg.moduleCount >= 21);
  });

  it("keeps classic colors easy to scan", () => {
    assert.ok(contrastRatio("#111111", "#ffffff") > 7);
  });
});
