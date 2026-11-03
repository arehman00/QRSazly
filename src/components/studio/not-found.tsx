import { Link } from "@tanstack/react-router";
import { Mark } from "./mark";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-4 px-6">
      <Mark />
      <h1 className="font-display text-4xl leading-tight">Page not found</h1>
      <p className="text-sm leading-6 text-muted">That address is not part of QRSazly.</p>
      <Link to="/" className="inline-flex min-h-11 items-center self-start rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg">
        Back to the generator
      </Link>
    </main>
  );
}
