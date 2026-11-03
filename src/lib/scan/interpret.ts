export type ScanKind =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "contact"
  | "whatsapp"
  | "location"
  | "text";

export type ScanField = { label: string; value: string };

export type ScanInfo = {
  kind: ScanKind;
  typeLabel: string;
  /** Exact decoded payload. */
  raw: string;
  fields: ScanField[];
  /** http(s) link the user may open explicitly. Never a script or device action. */
  openUrl: string | null;
  openLabel: string | null;
};

const TYPE_LABEL: Record<ScanKind, string> = {
  url: "Website URL",
  email: "Email",
  phone: "Phone number",
  sms: "SMS message",
  wifi: "Wi-Fi network",
  contact: "Contact",
  whatsapp: "WhatsApp",
  location: "Location",
  text: "Text",
};

export function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function field(label: string, value: string | undefined | null): ScanField | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  return { label, value: text };
}

function fieldsOf(rows: Array<ScanField | null>): ScanField[] {
  return rows.filter((row): row is ScanField => row !== null);
}

function info(kind: ScanKind, raw: string, rows: Array<ScanField | null>, openUrl: string | null, openLabel: string | null): ScanInfo {
  return {
    kind,
    typeLabel: TYPE_LABEL[kind],
    raw,
    fields: fieldsOf(rows),
    openUrl,
    openLabel: openUrl ? openLabel : null,
  };
}

function unescapeWifi(value: string): string {
  return value.replace(/\\([\\;,:"])/g, "$1");
}

function splitWifi(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\\" && index + 1 < body.length) {
      current += char + body[index + 1];
      index += 1;
      continue;
    }
    if (char === ";") {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function parseWifi(raw: string): ScanInfo {
  const body = raw.replace(/^WIFI:/i, "");
  const record: Record<string, string> = {};
  for (const part of splitWifi(body)) {
    if (!part) continue;
    const splitAt = part.indexOf(":");
    if (splitAt <= 0) continue;
    record[part.slice(0, splitAt).toUpperCase()] = unescapeWifi(part.slice(splitAt + 1));
  }
  const security = record.T || "nopass";
  const password = security.toLowerCase() === "nopass" ? "None" : record.P || "";
  return info(
    "wifi",
    raw,
    [
      field("Network", record.S || "Unnamed network"),
      field("Security", security),
      field("Password", password || "Not included"),
      field("Hidden", record.H?.toLowerCase() === "true" ? "Yes" : "No"),
    ],
    null,
    null,
  );
}

function unfold(value: string): string {
  return value.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function vcardValues(lines: string[], key: string): string[] {
  const prefix = key.toUpperCase();
  const values: string[] = [];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (!upper.startsWith(`${prefix}:`) && !upper.startsWith(`${prefix};`)) continue;
    const splitAt = line.indexOf(":");
    if (splitAt < 0) continue;
    values.push(line.slice(splitAt + 1).replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim());
  }
  return values.filter(Boolean);
}

function parseVcard(raw: string): ScanInfo {
  const lines = unfold(raw).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const name = vcardValues(lines, "FN")[0] || vcardValues(lines, "N")[0]?.replace(/;/g, " ");
  return info(
    "contact",
    raw,
    [
      field("Name", name),
      field("Organization", vcardValues(lines, "ORG")[0]),
      field("Title", vcardValues(lines, "TITLE")[0]),
      field("Phone", vcardValues(lines, "TEL").join(", ")),
      field("Email", vcardValues(lines, "EMAIL").join(", ")),
      field("Website", vcardValues(lines, "URL")[0]),
      field("Address", vcardValues(lines, "ADR")[0]?.replace(/;/g, " ")),
    ],
    safeHttpUrl(vcardValues(lines, "URL")[0] ?? ""),
    "Open website",
  );
}

function parseMecard(raw: string): ScanInfo {
  const body = raw.replace(/^MECARD:/i, "").replace(/;;\s*$/, "");
  const record: Record<string, string> = {};
  for (const part of splitWifi(body)) {
    const splitAt = part.indexOf(":");
    if (splitAt <= 0) continue;
    record[part.slice(0, splitAt).toUpperCase()] = unescapeWifi(part.slice(splitAt + 1));
  }
  return info(
    "contact",
    raw,
    [
      field("Name", record.N?.replace(/,/g, " ")),
      field("Phone", record.TEL),
      field("Email", record.EMAIL),
      field("Website", record.URL),
      field("Address", record.ADR),
      field("Note", record.NOTE),
    ],
    safeHttpUrl(record.URL ?? ""),
    "Open website",
  );
}

function queryParams(value: string): URLSearchParams {
  const query = value.includes("?") ? value.slice(value.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

function parseMailto(raw: string): ScanInfo {
  const withoutScheme = raw.replace(/^mailto:/i, "");
  const address = decodeURIComponent(withoutScheme.split("?")[0] ?? "");
  const params = queryParams(withoutScheme);
  return info(
    "email",
    raw,
    [
      field("Email", address),
      field("Subject", params.get("subject")),
      field("Message", params.get("body")),
    ],
    null,
    null,
  );
}

function parseTel(raw: string): ScanInfo {
  const number = raw.replace(/^tel:/i, "").trim();
  return info("phone", raw, [field("Number", number)], null, null);
}

function parseSms(raw: string): ScanInfo {
  const rest = raw.replace(/^sms(?:to)?:/i, "");
  const [target, inline] = rest.split(":");
  const number = decodeURIComponent((target ?? "").split("?")[0] ?? "");
  const params = queryParams(rest);
  const message = params.get("body") || (inline ? decodeURIComponent(inline) : "");
  return info("sms", raw, [field("Number", number), field("Message", message)], null, null);
}

function parseGeo(raw: string): ScanInfo {
  const rest = raw.replace(/^geo:/i, "");
  const [coords, query = ""] = rest.split("?");
  const [lat, lng] = (coords ?? "").split(",");
  const params = new URLSearchParams(query);
  const place = params.get("q");
  const open = place
    ? safeHttpUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`)
    : lat && lng
      ? safeHttpUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`)
      : null;
  return info(
    "location",
    raw,
    [field("Latitude", lat), field("Longitude", lng), field("Place", place)],
    open,
    "Open in Maps",
  );
}

function isWhatsApp(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "wa.me" || host === "api.whatsapp.com" || host === "chat.whatsapp.com" || host.endsWith(".whatsapp.com");
}

function isMapUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "maps.google.com" || host === "maps.apple.com" || host === "maps.app.goo.gl") return true;
  if ((host === "google.com" || host.endsWith(".google.com")) && url.pathname.startsWith("/maps")) return true;
  return false;
}

function parseWhatsApp(raw: string, url: URL | null): ScanInfo {
  const params = url ? url.searchParams : queryParams(raw);
  const pathPhone = url?.hostname.replace(/^www\./, "") === "wa.me" ? url.pathname.replace(/\//g, "") : "";
  const phone = params.get("phone") || pathPhone;
  return info(
    "whatsapp",
    raw,
    [field("Phone", phone), field("Message", params.get("text"))],
    url ? safeHttpUrl(url.toString()) : null,
    "Open WhatsApp link",
  );
}

function parseHttp(raw: string, url: URL): ScanInfo {
  if (isWhatsApp(url)) return parseWhatsApp(raw, url);
  if (isMapUrl(url)) {
    return info("location", raw, [field("Map link", url.toString())], safeHttpUrl(url.toString()), "Open in Maps");
  }
  return info("url", raw, [field("Link", url.toString())], safeHttpUrl(url.toString()), "Open link");
}

export function interpret(rawInput: string): ScanInfo {
  const raw = rawInput ?? "";
  const text = raw.trim();
  if (!text) return info("text", raw, [field("Content", "")], null, null);
  if (/^WIFI:/i.test(text)) return parseWifi(raw);
  if (/^BEGIN:VCARD/i.test(text)) return parseVcard(raw);
  if (/^MECARD:/i.test(text)) return parseMecard(raw);
  if (/^mailto:/i.test(text)) return parseMailto(raw);
  if (/^tel:/i.test(text)) return parseTel(raw);
  if (/^sms(?:to)?:/i.test(text)) return parseSms(raw);
  if (/^geo:/i.test(text)) return parseGeo(raw);
  if (/^whatsapp:/i.test(text)) return parseWhatsApp(raw, null);
  const http = safeHttpUrl(text);
  if (http) {
    try {
      return parseHttp(raw, new URL(http));
    } catch {
      return info("text", raw, [], null, null);
    }
  }
  return info("text", raw, [], null, null);
}
