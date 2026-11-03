import { emptyFields, type Fields, type Kind } from "./types.ts";

export type PayloadResult =
  | { ok: true; data: string; note?: string }
  | { ok: false; message: string; field?: keyof Fields };

export type EncodeInput = {
  kind: Kind;
  fields: Fields;
  hasLocalImage: boolean;
  embedDataUrl: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ok(data: string, note?: string): PayloadResult {
  return note ? { ok: true, data, note } : { ok: true, data };
}

function fail(message: string, field?: keyof Fields): PayloadResult {
  return { ok: false, message, field };
}

/** Accepts a bare host or an http(s) URL. Rejects other schemes, including javascript:. */
export function normalizeHttpUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  let candidate = trimmed;
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeTel(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 15) return null;
  return `tel:${hasPlus ? "+" : ""}${digits}`;
}

function escapeWifi(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:")
    .replace(/"/g, '\\"');
}

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function parseCoord(value: string, min: number, max: number): number | null {
  const number = Number(value.trim());
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function formatCoord(value: number): string {
  return String(Math.round(value * 1e6) / 1e6);
}

export function encodePayload(input: EncodeInput): PayloadResult {
  const { kind, fields } = input;

  switch (kind) {
    case "text": {
      const data = fields.text.trim();
      if (!data) return fail("Enter the text you want to store.", "text");
      return ok(data);
    }
    case "url": {
      const url = normalizeHttpUrl(fields.url);
      if (!url) {
        return fail("Enter a valid web address, such as example.com or https://example.com.", "url");
      }
      return ok(url);
    }
    case "email": {
      const email = fields.email.trim();
      if (!EMAIL.test(email)) return fail("Enter a valid email address.", "email");
      const parts = [
        fields.emailSubject.trim() ? `subject=${encodeURIComponent(fields.emailSubject.trim())}` : "",
        fields.emailBody.trim() ? `body=${encodeURIComponent(fields.emailBody.trim())}` : "",
      ].filter(Boolean);
      return ok(parts.length ? `mailto:${email}?${parts.join("&")}` : `mailto:${email}`);
    }
    case "phone": {
      const tel = normalizeTel(fields.phone);
      if (!tel) return fail("Enter a phone number with 3 to 15 digits.", "phone");
      return ok(tel);
    }
    case "sms": {
      const tel = normalizeTel(fields.smsPhone);
      if (!tel) return fail("Enter the recipient number with 3 to 15 digits.", "smsPhone");
      const body = fields.smsBody.trim();
      const number = tel.slice(4);
      return ok(body ? `sms:${number}?body=${encodeURIComponent(body)}` : `sms:${number}`);
    }
    case "wifi": {
      if (!fields.wifiSsid.trim()) return fail("Enter the network name.", "wifiSsid");
      if (fields.wifiSecurity !== "nopass" && !fields.wifiPass) {
        return fail("Enter the password, or set security to None.", "wifiPass");
      }
      const security = fields.wifiSecurity;
      const password = security === "nopass" ? "" : escapeWifi(fields.wifiPass);
      const data = `WIFI:T:${security};S:${escapeWifi(fields.wifiSsid)};P:${password};H:${fields.wifiHidden ? "true" : "false"};;`;
      return ok(data, "Phones that support Wi-Fi codes can join this network after you confirm.");
    }
    case "contact": {
      const first = fields.firstName.trim();
      const last = fields.lastName.trim();
      const org = fields.org.trim();
      const title = fields.jobTitle.trim();
      const phone = fields.contactPhone.trim();
      const email = fields.contactEmail.trim();
      const site = fields.contactUrl.trim();
      const address = fields.contactAddress.trim();
      if (!first && !last && !org && !phone && !email) {
        return fail("Add a name, organization, phone, or email.", "firstName");
      }
      if (email && !EMAIL.test(email)) return fail("The contact email does not look valid.", "contactEmail");
      const tel = phone ? normalizeTel(phone) : null;
      if (phone && !tel) return fail("The contact phone needs 3 to 15 digits.", "contactPhone");
      let website = "";
      if (site) {
        const normalized = normalizeHttpUrl(site);
        if (!normalized) return fail("The contact website is not a valid link.", "contactUrl");
        website = normalized;
      }
      const lines = ["BEGIN:VCARD", "VERSION:3.0"];
      lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`);
      lines.push(`FN:${escapeVCard([first, last].filter(Boolean).join(" ") || org)}`);
      if (org) lines.push(`ORG:${escapeVCard(org)}`);
      if (title) lines.push(`TITLE:${escapeVCard(title)}`);
      if (tel) lines.push(`TEL;TYPE=CELL:${tel.slice(4)}`);
      if (email) lines.push(`EMAIL:${escapeVCard(email)}`);
      if (website) lines.push(`URL:${website}`);
      if (address) lines.push(`ADR;TYPE=HOME:;;${escapeVCard(address)};;;;`);
      lines.push("END:VCARD");
      return ok(lines.join("\r\n"), "Scanning adds a contact card. The phone still asks before saving it.");
    }
    case "whatsapp": {
      const raw = fields.waPhone.trim();
      const digits = raw.replace(/\D/g, "");
      if (!digits) return fail("Enter a phone number with the country code.", "waPhone");
      if (raw.startsWith("0") || digits.startsWith("0")) {
        return fail("Drop the trunk zero and include the country code. Example: 14155550123.", "waPhone");
      }
      if (digits.length < 8 || digits.length > 15) {
        return fail("Use 8 to 15 digits, including the country code.", "waPhone");
      }
      const message = fields.waMessage.trim();
      const data = message
        ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${digits}`;
      return ok(data, "The code opens a WhatsApp chat. The message is not sent until someone taps send.");
    }
    case "location": {
      if (fields.locMode === "place") {
        const place = fields.place.trim();
        if (!place) return fail("Enter a place name or address.", "place");
        return ok(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`);
      }
      const lat = parseCoord(fields.lat, -90, 90);
      const lng = parseCoord(fields.lng, -180, 180);
      if (lat === null) return fail("Latitude must be a number from -90 to 90.", "lat");
      if (lng === null) return fail("Longitude must be a number from -180 to 180.", "lng");
      return ok(
        `https://www.google.com/maps/search/?api=1&query=${formatCoord(lat)},${formatCoord(lng)}`,
      );
    }
    case "image":
      return encodeImage(input);
    default:
      return fail("Choose a QR type.");
  }
}

function encodeImage(input: EncodeInput): PayloadResult {
  const { fields } = input;
  if (fields.imageMode === "url") {
    const url = normalizeHttpUrl(fields.imageUrl);
    if (!url) return fail("Enter the public URL of the image.", "imageUrl");
    return ok(
      url,
      "This code stores the link, not the picture. A phone loads whatever is hosted at that address.",
    );
  }
  if (fields.imageMode === "upload") {
    const hosted = fields.hostedUrl.trim();
    if (!hosted) {
      return fail(
        input.hasLocalImage
          ? "This file stays on your device. Paste the public URL where the same image is hosted if another phone should open it."
          : "Paste a public image URL. Choosing a file only previews it here — it is not uploaded.",
        "hostedUrl",
      );
    }
    const url = normalizeHttpUrl(hosted);
    if (!url) return fail("That hosted address is not a valid http(s) link.", "hostedUrl");
    return ok(
      url,
      input.hasLocalImage
        ? "The picture above is a local preview. The QR code contains only the hosted link."
        : "This code stores the link, not a file from this device.",
    );
  }
  if (!fields.embedAccepted) {
    return fail(
      "Confirm that you understand many scanners will not open an image embedded in a QR code.",
      "embedAccepted",
    );
  }
  if (!input.embedDataUrl) {
    return fail("Choose an image, then create the experimental code.", "embedAccepted");
  }
  return ok(
    input.embedDataUrl,
    "Experimental: this code contains a tiny JPEG as a data URL. Many cameras show an error or raw text instead of a picture.",
  );
}

export function applyExample(kind: Kind, fields: Fields): Fields {
  const next = { ...fields };
  const blank = emptyFields();
  switch (kind) {
    case "text":
      next.text = "Hello from QRSazly — مرحبا — 你好";
      break;
    case "url":
      next.url = "https://example.com";
      break;
    case "email":
      next.email = "hello@example.com";
      next.emailSubject = "Hello";
      next.emailBody = "Sent from a QR code.";
      break;
    case "phone":
      next.phone = "+12025550147";
      break;
    case "sms":
      next.smsPhone = "+12025550147";
      next.smsBody = "I am outside.";
      break;
    case "wifi":
      next.wifiSsid = "Studio-Guest";
      next.wifiPass = "paper-and-ink";
      next.wifiSecurity = "WPA";
      next.wifiHidden = false;
      break;
    case "contact":
      next.firstName = "Ada";
      next.lastName = "Lovelace";
      next.org = "Analytical Engines";
      next.jobTitle = "Mathematician";
      next.contactPhone = "+12025550147";
      next.contactEmail = "ada@example.com";
      next.contactUrl = "https://example.com";
      next.contactAddress = "1 Example Street";
      break;
    case "whatsapp":
      next.waPhone = "14155550123";
      next.waMessage = "Hello from QRSazly";
      break;
    case "location":
      next.locMode = "coords";
      next.lat = "40.689249";
      next.lng = "-74.0445";
      next.place = blank.place;
      break;
    case "image":
      next.imageMode = "url";
      next.imageUrl = "https://example.com/image.jpg";
      break;
    default:
      break;
  }
  return next;
}
