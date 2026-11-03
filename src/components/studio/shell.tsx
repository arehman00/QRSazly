import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, ScanLine, Sun, X } from "lucide-react";
import { Toaster } from "sonner";
import logo from "@/assets/qrsazly-logo.jpg";
import { cn } from "@/lib/cn";

const MORE = [
  { to: "/", hash: "how", label: "How it works" },
  { to: "/", hash: "features", label: "Features" },
] as const;

function ToolNav({ pathname, className, onNavigate }: { pathname: string; className?: string; onNavigate?: () => void }) {
  const scanner = pathname === "/scan";
  const tabClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium md:flex-none md:px-4",
      active ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
    );
  return (
    <nav
      aria-label="Generator and Scanner"
      className={cn("flex w-full min-w-0 rounded-2xl border border-border bg-surface-2 p-1 md:w-auto", className)}
    >
      <Link
        to="/"
        hash="generator"
        className={tabClass(!scanner)}
        aria-current={!scanner ? "page" : undefined}
        onClick={onNavigate}
      >
        Generator
      </Link>
      <Link
        to="/scan"
        className={tabClass(scanner)}
        aria-current={scanner ? "page" : undefined}
        onClick={onNavigate}
      >
        <ScanLine className="size-4" aria-hidden="true" />
        Scanner
      </Link>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("qrsazly-theme") || localStorage.getItem("ar-qr-theme");
    const dark = stored === "dark";
    document.documentElement.classList.toggle("dark", dark);
    setTheme(dark ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("qrsazly-theme", next);
    setTheme(next);
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="brand-line" />
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 md:h-16 md:gap-3 md:px-6 md:py-0">
          <Link to="/" className="inline-flex shrink-0 items-center rounded-xl bg-logo-plate px-2 py-1" aria-label="QRSazly home">
            <img src={logo} alt="QRSazly" className="h-9 w-auto sm:h-11" />
          </Link>
          <ToolNav pathname={pathname} className="hidden md:flex" />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {MORE.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-xl"
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-xl lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 md:hidden">
          <ToolNav pathname={pathname} onNavigate={() => setOpen(false)} />
        </div>
        {open ? (
          <nav id="mobile-nav" className="border-t border-border px-4 py-2 lg:hidden" aria-label="Mobile">
            <Link
              to="/"
              hash="generator"
              className={cn("flex min-h-11 items-center text-sm", pathname !== "/scan" && "font-medium text-primary")}
              onClick={() => setOpen(false)}
            >
              Generator
            </Link>
            <Link
              to="/scan"
              className={cn("flex min-h-11 items-center text-sm", pathname === "/scan" && "font-medium text-primary")}
              onClick={() => setOpen(false)}
            >
              Scanner
            </Link>
            {MORE.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
                className="flex min-h-11 items-center text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main id="content">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted md:px-6">
          <p>QRSazly · Developed by ABDUL-REHMAN AZIZ</p>
          <p>Contact Gmail: arnonlinework@gmail.com</p>
          <p>Copyright © 2026 QRSazly. Codes you create and images you scan stay on this device.</p>
          <p>QR Code is a registered trademark of DENSO WAVE INCORPORATED.</p>
        </div>
      </footer>
      {mounted ? <Toaster theme={theme} position="top-center" /> : null}
    </div>
  );
}
