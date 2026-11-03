# QRSazly

Make and scan QR codes in the browser. Developed by ABDUL-REHMAN AZIZ. Codes are generated on the device. Typed text, Wi-Fi passwords, chosen images, and photos you scan are not uploaded.

## Use it

1. Open the app and choose a content type in the generator.
2. Fill in the form. The preview updates as you type.
3. Adjust colors, module shape, eyes, quiet zone, error correction, and an optional center logo.
4. Read the scan check. Low contrast, a missing quiet zone, or a large logo is called out.
5. Download PNG, SVG, JPEG, or a 2048 px PNG. You can also copy the image or the exact encoded string.
6. Open Scanner to read a code with the camera, or upload a PNG, JPG, JPEG, or WEBP from your gallery. The camera stays off until you press Start Camera Scanner.

Nothing you type is saved. Refreshing the page clears the form. The theme choice is the only thing stored in the browser.

## Install and run

```bash
npm install
npm run dev
```

The dev server listens on port 8080. There is no account.

## Scanner notes

- Camera permission is requested only after Start Camera Scanner.
- If permission is denied, the camera is not opened again until you choose Try camera again.
- Gallery upload is decoded locally. It supports PNG, JPG, JPEG, and WEBP.
- Results show the original decoded text and a recognized type when one can be identified.
- Links open only if you choose Open link. Calls, messages, and Wi-Fi joins are never started automatically.

## Image codes

A QR symbol stores a short string, not a normal photograph.

- **Image URL** puts that web address in the code. The phone loads the picture from the host.
- **Upload** only previews a file on this device. It does not publish it. Paste a public URL if another phone should open the image.
- **Experimental embed** compresses a picture to a tiny JPEG data URL, capped at 900 bytes. Many cameras will not open it. The control says so, and it never runs unless you confirm the warning.

## Limits

- Capacity depends on error correction. Very long text, especially at High, will not fit.
- JPEG has no transparency. A transparent code is flattened to white for that format.
- Dot modules, circular eyes, light-on-dark colors, and large logos can fail in some cameras. Test with a phone before printing.
- SVG logos are not accepted as a center mark.
- Wi-Fi codes use the `WIFI:` format. The phone still asks before joining.
- Contact codes are vCard 3.0.
- Live camera scanning needs a browser that allows camera access on a secure page. This environment may not include a physical camera.
- The flashlight control uses the active camera's torch constraint. It is enabled only when that track reports torch support, which is typically the rear camera in Android Chrome. Other browsers and desktop cameras show that the flashlight is not supported. Stopping the scanner, switching cameras, or reading a code turns the light off and releases the camera.

QR Code is a registered trademark of DENSO WAVE INCORPORATED.
