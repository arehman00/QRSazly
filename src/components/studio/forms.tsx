import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { PayloadResult } from "@/lib/qr/encode";
import type { Fields, Kind } from "@/lib/qr/types";
import { AreaField, CheckField, Segmented, SelectField, TextField } from "./ui";

type Setter = <K extends keyof Fields>(key: K, value: Fields[K]) => void;

function errorFor(payload: PayloadResult, field: keyof Fields, raw?: string): string | undefined {
  if (payload.ok || payload.field !== field) return undefined;
  if (raw !== undefined && raw.trim() === "") return undefined;
  return payload.message;
}

export function KindForm({
  kind,
  fields,
  payload,
  set,
  uploadPreview,
  onUploadFile,
  onClearUpload,
  embedPreview,
  embedDataUrl,
  embedBytes,
  embedError,
  embedBusy,
  onEmbedFile,
  onCreateEmbed,
  onClearEmbed,
}: {
  kind: Kind;
  fields: Fields;
  payload: PayloadResult;
  set: Setter;
  uploadPreview: string | null;
  onUploadFile: (file: File) => void;
  onClearUpload: () => void;
  embedPreview: string | null;
  embedDataUrl: string | null;
  embedBytes: number | null;
  embedError: string | null;
  embedBusy: boolean;
  onEmbedFile: (file: File) => void;
  onCreateEmbed: () => void;
  onClearEmbed: () => void;
}) {
  if (kind === "text") {
    return (
      <AreaField
        label="Text"
        value={fields.text}
        error={errorFor(payload, "text", fields.text)}
        hint="Plain text, including accents and non-English characters."
        onChange={(event) => set("text", event.target.value)}
      />
    );
  }
  if (kind === "url") {
    return (
      <TextField
        label="Website"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="example.com"
        value={fields.url}
        error={errorFor(payload, "url", fields.url)}
        hint="https:// is added when you leave the protocol off."
        onChange={(event) => set("url", event.target.value)}
      />
    );
  }
  if (kind === "email") {
    return (
      <div className="grid gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="hello@example.com"
          value={fields.email}
          error={errorFor(payload, "email", fields.email)}
          onChange={(event) => set("email", event.target.value)}
        />
        <TextField
          label="Subject"
          value={fields.emailSubject}
          onChange={(event) => set("emailSubject", event.target.value)}
        />
        <AreaField
          label="Message"
          value={fields.emailBody}
          onChange={(event) => set("emailBody", event.target.value)}
        />
      </div>
    );
  }
  if (kind === "phone") {
    return (
      <TextField
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+1 202 555 0147"
        value={fields.phone}
        error={errorFor(payload, "phone", fields.phone)}
        hint="Stored as a tel: link."
        onChange={(event) => set("phone", event.target.value)}
      />
    );
  }
  if (kind === "sms") {
    return (
      <div className="grid gap-4">
        <TextField
          label="Recipient"
          type="tel"
          inputMode="tel"
          value={fields.smsPhone}
          error={errorFor(payload, "smsPhone", fields.smsPhone)}
          onChange={(event) => set("smsPhone", event.target.value)}
        />
        <AreaField
          label="Message"
          value={fields.smsBody}
          hint="Optional. The phone opens the draft; it does not send it."
          onChange={(event) => set("smsBody", event.target.value)}
        />
      </div>
    );
  }
  if (kind === "wifi") return <WifiFields fields={fields} payload={payload} set={set} />;
  if (kind === "contact") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={fields.firstName} error={errorFor(payload, "firstName", `${fields.firstName}${fields.lastName}${fields.org}${fields.contactPhone}${fields.contactEmail}`)} onChange={(event) => set("firstName", event.target.value)} />
        <TextField label="Last name" value={fields.lastName} onChange={(event) => set("lastName", event.target.value)} />
        <TextField label="Organization" value={fields.org} onChange={(event) => set("org", event.target.value)} />
        <TextField label="Title" value={fields.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} />
        <TextField label="Phone" type="tel" value={fields.contactPhone} error={errorFor(payload, "contactPhone")} onChange={(event) => set("contactPhone", event.target.value)} />
        <TextField label="Email" type="email" value={fields.contactEmail} error={errorFor(payload, "contactEmail")} onChange={(event) => set("contactEmail", event.target.value)} />
        <div className="sm:col-span-2">
          <TextField label="Website" inputMode="url" spellCheck={false} value={fields.contactUrl} error={errorFor(payload, "contactUrl")} onChange={(event) => set("contactUrl", event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <TextField label="Address" value={fields.contactAddress} onChange={(event) => set("contactAddress", event.target.value)} />
        </div>
      </div>
    );
  }
  if (kind === "whatsapp") {
    return (
      <div className="grid gap-4">
        <TextField
          label="WhatsApp number"
          type="tel"
          inputMode="tel"
          placeholder="14155550123"
          value={fields.waPhone}
          error={errorFor(payload, "waPhone", fields.waPhone)}
          hint="Country code plus number, with no plus sign and no leading zero."
          onChange={(event) => set("waPhone", event.target.value)}
        />
        <AreaField label="Message" value={fields.waMessage} onChange={(event) => set("waMessage", event.target.value)} />
      </div>
    );
  }
  if (kind === "location") {
    return (
      <div className="grid gap-4">
        <Segmented
          label="Location type"
          value={fields.locMode}
          onChange={(value) => set("locMode", value)}
          options={[
            { value: "coords", label: "Coordinates" },
            { value: "place", label: "Place name" },
          ]}
        />
        {fields.locMode === "coords" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Latitude" inputMode="decimal" value={fields.lat} error={errorFor(payload, "lat", fields.lat)} onChange={(event) => set("lat", event.target.value)} />
            <TextField label="Longitude" inputMode="decimal" value={fields.lng} error={errorFor(payload, "lng", fields.lng)} onChange={(event) => set("lng", event.target.value)} />
          </div>
        ) : (
          <TextField label="Place" placeholder="Statue of Liberty, New York" value={fields.place} error={errorFor(payload, "place", fields.place)} onChange={(event) => set("place", event.target.value)} />
        )}
      </div>
    );
  }
  return (
    <ImageFields
      fields={fields}
      payload={payload}
      set={set}
      uploadPreview={uploadPreview}
      onUploadFile={onUploadFile}
      onClearUpload={onClearUpload}
      embedPreview={embedPreview}
      embedDataUrl={embedDataUrl}
      embedBytes={embedBytes}
      embedError={embedError}
      embedBusy={embedBusy}
      onEmbedFile={onEmbedFile}
      onCreateEmbed={onCreateEmbed}
      onClearEmbed={onClearEmbed}
    />
  );
}

function WifiFields({ fields, payload, set }: { fields: Fields; payload: PayloadResult; set: Setter }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-4">
      <TextField
        label="Network name"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={fields.wifiSsid}
        error={errorFor(payload, "wifiSsid", fields.wifiSsid)}
        onChange={(event) => set("wifiSsid", event.target.value)}
      />
      <SelectField
        label="Security"
        value={fields.wifiSecurity}
        onChange={(event) => set("wifiSecurity", event.target.value as Fields["wifiSecurity"])}
      >
        <option value="WPA">WPA / WPA2 / WPA3</option>
        <option value="WEP">WEP</option>
        <option value="nopass">None</option>
      </SelectField>
      <div className="flex flex-col gap-1.5">
        <TextField
          label="Password"
          type={visible ? "text" : "password"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={fields.wifiSecurity === "nopass"}
          value={fields.wifiPass}
          error={errorFor(payload, "wifiPass")}
          onChange={(event) => set("wifiPass", event.target.value)}
        />
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted"
          onClick={() => setVisible((value) => !value)}
          disabled={fields.wifiSecurity === "nopass"}
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {visible ? "Hide password" : "Show password"}
        </button>
      </div>
      <CheckField label="Hidden network" checked={fields.wifiHidden} onChange={(checked) => set("wifiHidden", checked)} />
    </div>
  );
}

function FileButton({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-bg px-4 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
      {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function ImageFields(props: {
  fields: Fields;
  payload: PayloadResult;
  set: Setter;
  uploadPreview: string | null;
  onUploadFile: (file: File) => void;
  onClearUpload: () => void;
  embedPreview: string | null;
  embedDataUrl: string | null;
  embedBytes: number | null;
  embedError: string | null;
  embedBusy: boolean;
  onEmbedFile: (file: File) => void;
  onCreateEmbed: () => void;
  onClearEmbed: () => void;
}) {
  const { fields, payload, set } = props;
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-muted">
        A QR code holds text, usually only a few kilobytes. A link points a phone at an image that is already online. A normal photo does not fit inside the code, and a file that exists only on this device has no address for another phone to open. This app does not upload images.
      </p>
      <Segmented
        label="Image source"
        value={fields.imageMode}
        onChange={(value) => set("imageMode", value)}
        options={[
          { value: "url", label: "Image URL" },
          { value: "upload", label: "Upload" },
          { value: "embed", label: "Experimental embed" },
        ]}
      />
      {fields.imageMode === "url" ? (
        <TextField
          label="Image URL"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://example.com/image.jpg"
          value={fields.imageUrl}
          error={errorFor(payload, "imageUrl", fields.imageUrl)}
          hint="The code stores this address. It does not download or contain the picture."
          onChange={(event) => set("imageUrl", event.target.value)}
        />
      ) : null}
      {fields.imageMode === "upload" ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <FileButton label="Choose image" onFile={props.onUploadFile} />
            {props.uploadPreview ? (
              <button type="button" className="min-h-11 text-sm text-muted" onClick={props.onClearUpload}>
                Remove preview
              </button>
            ) : null}
          </div>
          {props.uploadPreview ? (
            <img src={props.uploadPreview} alt="Preview of the image on this device" className="max-h-48 rounded-xl border border-border object-contain" />
          ) : (
            <p className="text-sm text-muted">No file selected. The preview stays on this device.</p>
          )}
          <TextField
            label="Hosted image URL"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://example.com/image.jpg"
            value={fields.hostedUrl}
            error={errorFor(payload, "hostedUrl", fields.hostedUrl || (props.uploadPreview ? "local" : ""))}
            hint="Optional, and required if you want the code to open the picture elsewhere. Paste a link that already hosts the image."
            onChange={(event) => set("hostedUrl", event.target.value)}
          />
        </div>
      ) : null}
      {fields.imageMode === "embed" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-bg p-4">
          <p className="text-sm leading-6 text-danger">
            Experimental. The picture is compressed to a tiny JPEG and stored as a data URL. Most phone cameras will not open it. There is no upload.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <FileButton label="Choose image" onFile={props.onEmbedFile} />
            {props.embedPreview ? (
              <button type="button" className="min-h-11 text-sm text-muted" onClick={props.onClearEmbed}>
                Remove
              </button>
            ) : null}
          </div>
          {props.embedDataUrl ? (
            <img src={props.embedDataUrl} alt="Tiny compressed image that would be stored in the code" className="max-h-24 rounded-lg border border-border object-contain" />
          ) : props.embedPreview ? (
            <img src={props.embedPreview} alt="Selected image before compression" className="max-h-40 rounded-xl border border-border object-contain" />
          ) : null}
          <CheckField
            label="I understand many scanners will not open an embedded image."
            checked={fields.embedAccepted}
            error={
              props.embedError ??
              (!fields.embedAccepted && props.embedDataUrl ? errorFor(payload, "embedAccepted") : undefined)
            }
            onChange={(checked) => set("embedAccepted", checked)}
          />
          <button
            type="button"
            className="min-h-11 rounded-xl bg-fg px-4 text-sm font-medium text-bg disabled:opacity-50"
            disabled={props.embedBusy || !props.embedPreview}
            onClick={props.onCreateEmbed}
          >
            {props.embedBusy ? "Compressing…" : "Create experimental code"}
          </button>
          {props.embedBytes ? <p className="text-xs text-muted">Compressed payload: {props.embedBytes} bytes. Limit is 900.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
