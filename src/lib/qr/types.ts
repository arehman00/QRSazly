export type Kind =
  | "text"
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "contact"
  | "whatsapp"
  | "location"
  | "image";

export type ImageMode = "url" | "upload" | "embed";
export type WifiSecurity = "WPA" | "WEP" | "nopass";
export type LocMode = "coords" | "place";
export type Ecc = "L" | "M" | "Q" | "H";
export type DotStyle = "square" | "rounded" | "extra-rounded" | "dots";
export type CornerStyle = "square" | "rounded" | "extra-rounded" | "dot";
export type EyeStyle = "square" | "rounded" | "dot";

export type Fields = {
  text: string;
  url: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
  smsPhone: string;
  smsBody: string;
  wifiSsid: string;
  wifiPass: string;
  wifiSecurity: WifiSecurity;
  wifiHidden: boolean;
  firstName: string;
  lastName: string;
  org: string;
  jobTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactUrl: string;
  contactAddress: string;
  waPhone: string;
  waMessage: string;
  locMode: LocMode;
  lat: string;
  lng: string;
  place: string;
  imageMode: ImageMode;
  imageUrl: string;
  hostedUrl: string;
  embedAccepted: boolean;
};

export type QrStyle = {
  size: number;
  quiet: number;
  ecc: Ecc;
  foreground: string;
  background: string;
  transparent: boolean;
  dot: DotStyle;
  corner: CornerStyle;
  eye: EyeStyle;
  logoScale: number;
  logoPad: number;
};

export const defaultStyle: QrStyle = {
  size: 320,
  quiet: 4,
  ecc: "M",
  foreground: "#111111",
  background: "#ffffff",
  transparent: false,
  dot: "square",
  corner: "square",
  eye: "square",
  logoScale: 0.22,
  logoPad: 1,
};

export function emptyFields(): Fields {
  return {
    text: "",
    url: "",
    email: "",
    emailSubject: "",
    emailBody: "",
    phone: "",
    smsPhone: "",
    smsBody: "",
    wifiSsid: "",
    wifiPass: "",
    wifiSecurity: "WPA",
    wifiHidden: false,
    firstName: "",
    lastName: "",
    org: "",
    jobTitle: "",
    contactPhone: "",
    contactEmail: "",
    contactUrl: "",
    contactAddress: "",
    waPhone: "",
    waMessage: "",
    locMode: "coords",
    lat: "",
    lng: "",
    place: "",
    imageMode: "url",
    imageUrl: "",
    hostedUrl: "",
    embedAccepted: false,
  };
}

export const KIND_FIELDS: Record<Kind, (keyof Fields)[]> = {
  text: ["text"],
  url: ["url"],
  email: ["email", "emailSubject", "emailBody"],
  phone: ["phone"],
  sms: ["smsPhone", "smsBody"],
  wifi: ["wifiSsid", "wifiPass", "wifiSecurity", "wifiHidden"],
  contact: [
    "firstName",
    "lastName",
    "org",
    "jobTitle",
    "contactPhone",
    "contactEmail",
    "contactUrl",
    "contactAddress",
  ],
  whatsapp: ["waPhone", "waMessage"],
  location: ["locMode", "lat", "lng", "place"],
  image: ["imageMode", "imageUrl", "hostedUrl", "embedAccepted"],
};
