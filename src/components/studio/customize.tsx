import { PRESETS } from "@/lib/qr/presets";
import type { CornerStyle, DotStyle, Ecc, EyeStyle, QrStyle } from "@/lib/qr/types";
import { ColorField, RangeField, Segmented } from "./ui";

export function Customize({
  style,
  logo,
  onChange,
  onReset,
  onLogo,
  onClearLogo,
}: {
  style: QrStyle;
  logo: string | null;
  onChange: (partial: Partial<QrStyle>) => void;
  onReset: () => void;
  onLogo: (file: File) => void;
  onClearLogo: () => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight">Customize</h2>
        <button type="button" className="min-h-11 text-sm text-muted" onClick={onReset}>
          Reset style
        </button>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Color themes</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={`${preset.name}: ${preset.fg} on ${preset.bg}`}
              onClick={() => onChange({ foreground: preset.fg, background: preset.bg, transparent: false })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg px-3 text-sm"
            >
              <span className="flex overflow-hidden rounded-md border border-border" aria-hidden="true">
                <span className="size-4" style={{ background: preset.fg }} />
                <span className="size-4" style={{ background: preset.bg }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField label="Foreground" value={style.foreground} onChange={(foreground) => onChange({ foreground })} />
        <ColorField
          label="Background"
          value={style.background}
          disabled={style.transparent}
          onChange={(background) => onChange({ background })}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={style.transparent}
          onChange={(event) => onChange({ transparent: event.target.checked })}
          className="size-4"
        />
        Transparent background
      </label>
      <p className="text-xs leading-5 text-muted">
        PNG and SVG keep transparency. JPEG cannot, so a transparent code is flattened to white when you download JPEG.
      </p>
      <Segmented
        label="Modules"
        value={style.dot}
        onChange={(dot: DotStyle) => onChange({ dot })}
        options={[
          { value: "square", label: "Square", title: "Most reliable" },
          { value: "rounded", label: "Rounded", title: "Soft corners, still solid" },
          { value: "extra-rounded", label: "Extra rounded", title: "Strongly rounded modules" },
          { value: "dots", label: "Dots", title: "Leaves gaps. Test with a camera." },
        ]}
      />
      <Segmented
        label="Eyes"
        value={style.corner}
        onChange={(corner: CornerStyle) => onChange({ corner })}
        options={[
          { value: "square", label: "Square", title: "Standard finder pattern" },
          { value: "rounded", label: "Rounded", title: "Rounded finder frame" },
          { value: "extra-rounded", label: "Extra rounded", title: "Very round finder frame" },
          { value: "dot", label: "Circle", title: "Less reliable. Test before printing." },
        ]}
      />
      <Segmented
        label="Eye centers"
        value={style.eye}
        onChange={(eye: EyeStyle) => onChange({ eye })}
        options={[
          { value: "square", label: "Square" },
          { value: "rounded", label: "Rounded" },
          { value: "dot", label: "Circle" },
        ]}
      />
      <Segmented
        label="Error correction"
        value={style.ecc}
        onChange={(ecc: Ecc) => onChange({ ecc })}
        options={[
          { value: "L", label: "Low", title: "About 7% recovery. Highest capacity." },
          { value: "M", label: "Medium", title: "About 15% recovery. Default." },
          { value: "Q", label: "Quartile", title: "About 25% recovery." },
          { value: "H", label: "High", title: "About 30% recovery. Use with a logo." },
        ]}
      />
      <RangeField
        label="Size"
        min={240}
        max={640}
        step={8}
        value={style.size}
        display={`${style.size} px`}
        hint="Downloads use this size. The preview shrinks to fit the screen. High-res PNG is always 2048 px."
        onChange={(size) => onChange({ size })}
      />
      <RangeField
        label="Quiet zone"
        min={0}
        max={8}
        step={1}
        value={style.quiet}
        display={`${style.quiet} modules`}
        hint="4 modules is the standard blank margin around the code."
        onChange={(quiet) => onChange({ quiet })}
      />
      <div className="grid gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Center logo</h3>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-border bg-bg px-3 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
            Choose logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onLogo(file);
              }}
            />
          </label>
        </div>
        <p className="text-xs leading-5 text-muted">
          The logo is drawn in the center and those modules are cleared. It stays on this device. SVG logos are not accepted.
        </p>
        {logo ? (
          <div className="flex items-center gap-3">
            <img src={logo} alt="Center logo preview" className="size-14 rounded-lg border border-border object-contain" />
            <button type="button" className="min-h-11 text-sm text-muted" onClick={onClearLogo}>
              Remove logo
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">No logo.</p>
        )}
        <RangeField
          label="Logo size"
          min={0.16}
          max={0.32}
          step={0.01}
          value={style.logoScale}
          display={`${Math.round(style.logoScale * 100)}%`}
          disabled={!logo}
          onChange={(logoScale) => onChange({ logoScale })}
        />
        <RangeField
          label="Logo padding"
          min={0}
          max={4}
          step={1}
          value={style.logoPad}
          display={`${style.logoPad} modules`}
          disabled={!logo}
          hint="Extra cleared modules around the logo."
          onChange={(logoPad) => onChange({ logoPad })}
        />
      </div>
    </div>
  );
}
