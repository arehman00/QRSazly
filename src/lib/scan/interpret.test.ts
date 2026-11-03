import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyExample, encodePayload } from "../qr/encode.ts";
import { emptyFields, type Kind } from "../qr/types.ts";
import { interpret, safeHttpUrl } from "./interpret.ts";

function encoded(kind: Kind): string {
  const result = encodePayload({
    kind,
    fields: applyExample(kind, emptyFields()),
    hasLocalImage: false,
    embedDataUrl: null,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("example payload did not encode");
  return result.data;
}

describe("scanner interpretation", () => {
  it("rejects unsafe links", () => {
    assert.equal(safeHttpUrl("javascript:alert(1)"), null);
    assert.equal(safeHttpUrl("data:text/html,hi"), null);
    assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
  });

  it("reads generator payloads back as their original type", () => {
    assert.equal(interpret(encoded("text")).kind, "text");
    assert.equal(interpret(encoded("url")).kind, "url");
    assert.equal(interpret(encoded("email")).kind, "email");
    assert.equal(interpret(encoded("phone")).kind, "phone");
    assert.equal(interpret(encoded("sms")).kind, "sms");
    assert.equal(interpret(encoded("wifi")).kind, "wifi");
    assert.equal(interpret(encoded("contact")).kind, "contact");
    assert.equal(interpret(encoded("whatsapp")).kind, "whatsapp");
    assert.equal(interpret(encoded("location")).kind, "location");
    assert.equal(interpret(encoded("image")).kind, "url");
  });

  it("keeps the original payload and does not invent a connection", () => {
    const raw = "WIFI:T:WPA;S:net\\;work;P:a\\:b;H:true;;";
    const info = interpret(raw);
    assert.equal(info.raw, raw);
    assert.equal(info.openUrl, null);
    assert.equal(info.fields.find((item) => item.label === "Network")?.value, "net;work");
    assert.equal(info.fields.find((item) => item.label === "Password")?.value, "a:b");
    assert.equal(info.fields.find((item) => item.label === "Hidden")?.value, "Yes");
  });

  it("shows contact and message details without turning them into actions", () => {
    const contact = interpret("BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ada Lovelace\r\nTEL:+12025550147\r\nEND:VCARD");
    assert.equal(contact.kind, "contact");
    assert.match(contact.raw, /BEGIN:VCARD/);
    assert.equal(contact.fields.find((item) => item.label === "Phone")?.value, "+12025550147");

    const sms = interpret("sms:+12025550147?body=I%20am%20outside.");
    assert.equal(sms.kind, "sms");
    assert.equal(sms.openUrl, null);
    assert.equal(sms.fields.find((item) => item.label === "Message")?.value, "I am outside.");

    const phone = interpret("tel:+12025550147");
    assert.equal(phone.kind, "phone");
    assert.equal(phone.openUrl, null);
  });

  it("offers an explicit maps link for coordinates and keeps plain text whole", () => {
    const geo = interpret("geo:40.689249,-74.0445");
    assert.equal(geo.kind, "location");
    assert.match(geo.openUrl ?? "", /^https:\/\/www\.google\.com\/maps\//);
    const text = interpret("Hello from QRSazly — مرحبا — 你好");
    assert.equal(text.kind, "text");
    assert.equal(text.raw, "Hello from QRSazly — مرحبا — 你好");
    assert.equal(text.openUrl, null);
  });
});
