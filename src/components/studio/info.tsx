import { Download, Eye, Image as ImageIcon, Lock, Palette, QrCode, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    title: "Real codes, not pictures of codes",
    text: "Text, links, email, phone, SMS, Wi-Fi, contacts, WhatsApp, maps, and image links are encoded in the formats phones expect.",
  },
  {
    icon: Palette,
    title: "Style with a scan check",
    text: "Colors, module shapes, eyes, size, quiet zone, and error correction update the preview. Low contrast is called out before you export.",
  },
  {
    icon: Download,
    title: "Files you can keep",
    text: "Download PNG, SVG, JPEG, or a 2048 px PNG. Copy the image or the exact string stored in the code.",
  },
  {
    icon: Eye,
    title: "Optional center logo",
    text: "A logo clears modules behind it. Error correction moves to High when you add one, and you can still change it.",
  },
  {
    icon: Lock,
    title: "Private by default",
    text: "Generation happens in the browser. Typed text, passwords, and chosen images are not uploaded.",
  },
  {
    icon: ImageIcon,
    title: "Honest image limits",
    text: "An image URL becomes a link. A local file stays a preview. Embedding a tiny image is labeled experimental because many cameras reject it.",
  },
  {
    icon: ShieldCheck,
    title: "Scan without uploading",
    text: "Read a code with the camera or a PNG, JPG, or WEBP from your gallery. The picture is decoded in the browser and is not sent to a server.",
  },
];

const FAQ = [
  {
    q: "Is my text or image uploaded?",
    a: "No. The code is built on your device. There is no account and no image host in this app. If you want a QR code to open a picture on someone else’s phone, that picture already needs a public URL.",
  },
  {
    q: "Why can’t a QR code contain a normal photo?",
    a: "A QR symbol stores a short piece of text — a few kilobytes at most, and less when error correction is high. A normal photo is far larger than that. The practical pattern is to host the image and encode its link.",
  },
  {
    q: "What is the difference between a link and an embedded image?",
    a: "A link is an address. The phone opens it and downloads the image from that server. An embed puts a tiny compressed image inside the code as a data URL. It never leaves this device until someone scans it, and many cameras will not open data URLs.",
  },
  {
    q: "Which error correction should I use?",
    a: "Medium is a sound default. Choose High when you cover the center with a logo or the code may be damaged. Low fits more text, but it is less forgiving.",
  },
  {
    q: "Will every phone scan a styled code?",
    a: "No style can promise that. Dark modules, a light background, a quiet zone of at least 4 modules, and square eyes are the safest combination. Test with a normal camera app before you print.",
  },
  {
    q: "Does scanning upload my photo?",
    a: "No. The camera frame and any image you choose are decoded on this device. QRSazly does not send them to a server, open links, place calls, or join a Wi-Fi network unless you choose an action yourself.",
  },
  {
    q: "Do I need an account?",
    a: "No. Nothing is saved to a server. Refreshing the page clears what you typed.",
  },
];

export function Info() {
  return (
    <>
      <section id="how" className="scroll-mt-36 mx-auto w-full max-w-6xl px-4 py-12 md:scroll-mt-24 md:px-6">
        <h2 className="font-display text-3xl leading-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Choose the payload", "Pick what the code should open and fill in only the fields that type needs."],
            ["02", "Check the preview", "Colors, shape, and a logo update immediately. Warnings appear when a choice may hurt scanning."],
            ["03", "Download the file", "PNG, SVG, JPEG, or a high-resolution PNG. The file is the code itself, not a capture of this page."],
          ].map(([step, title, text]) => (
            <li key={step} className="rounded-2xl border border-border bg-surface p-5">
              <p className="font-display text-2xl text-primary">{step}</p>
              <h3 className="mt-3 text-base font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="features" className="scroll-mt-36 mx-auto w-full max-w-6xl px-4 py-4 md:scroll-mt-24 md:px-6">
        <h2 className="font-display text-3xl leading-tight">Features</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-2xl border border-border bg-surface p-5">
              <feature.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-medium">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section id="faq" className="scroll-mt-20 mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <h2 className="font-display text-3xl leading-tight">Questions</h2>
        <div className="mt-6 border-t border-border">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-border">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-base font-medium">
                {item.q}
                <span className="text-muted transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="max-w-3xl pb-4 text-sm leading-6 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section id="about" className="scroll-mt-20 mx-auto w-full max-w-6xl px-4 pb-12 md:px-6">
        <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-3xl leading-tight">About</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            QRSazly is a browser tool from ABDUL-REHMAN AZIZ for people who want a readable code, a clear preview, and a file they can download — plus a scanner for codes they receive. It generates and reads symbols locally, warns when styling may hurt a scan, and never pretends a picture on your device has been published.
          </p>
        </div>
      </section>
    </>
  );
}
