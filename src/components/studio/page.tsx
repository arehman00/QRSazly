import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import { Info } from "./info";
import { Shell } from "./shell";
import { Workspace } from "./workspace";

export function StudioPage() {
  return (
    <Shell>
      <section className="mx-auto w-full max-w-6xl px-4 pb-2 pt-8 md:px-6 md:pt-12">
        <p className="text-sm font-medium text-primary">Make & scan QR codes</p>
        <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight md:text-5xl">Create a code, or scan one you already have.</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          Build codes for links, Wi-Fi, contacts, and more. Style the preview, then download PNG, SVG, or JPEG. Scan with the camera or a photo. Your content stays on this device.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="#generator" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg">
            Open the generator
          </a>
          <Link
            to="/scan"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium"
          >
            <ScanLine className="size-4" aria-hidden="true" />
            Open the scanner
          </Link>
        </div>
      </section>
      <Workspace />
      <Info />
    </Shell>
  );
}
