import logo from "@/assets/qrsazly-logo.jpg";
import { cn } from "@/lib/cn";

export function Mark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-xl bg-logo-plate px-2 py-1", className)}>
      <img src={logo} alt="QRSazly" className="h-10 w-auto" />
    </span>
  );
}
