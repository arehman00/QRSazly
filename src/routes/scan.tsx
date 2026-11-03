import { createFileRoute } from "@tanstack/react-router";
import { Scanner } from "@/components/studio/scanner";
import { Shell } from "@/components/studio/shell";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

function ScanPage() {
  return (
    <Shell>
      <Scanner />
    </Shell>
  );
}
