declare module "jsqr" {
  export type JsQrCode = { data: string };
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" },
  ): JsQrCode | null;
}
