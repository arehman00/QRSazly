import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { NotFoundPage } from "@/components/studio/not-found";
import appCss from "../styles.css?url";

const SHORT_NAME = "QRSazly";
const TITLE = "QRSazly — Make & Scan QR Codes";
const DESCRIPTION =
  "Create QR codes for links, Wi-Fi, contacts, and more, then scan codes with your camera or a photo. Style the preview and download PNG, SVG, or JPEG. Your content stays on your device.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#f3f6fb", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#07111e", media: "(prefers-color-scheme: dark)" },
      { name: "apple-mobile-web-app-title", content: SHORT_NAME },
      {
        name: "google-site-verification",
        content: "sQNfIfJkvaeGhEWrXE0a9rWMJrIgJ6J4VoDAsQ-mG6I",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__qrsazly/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__qrsazly/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('qrsazly-theme')||localStorage.getItem('ar-qr-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
