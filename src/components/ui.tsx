import type { ReactNode } from "react";
import { Alert } from "./icons";

export function ErrorBanner({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-2xl border border-red-200/70 bg-red-50/85 px-4 py-3 text-sm text-red-800 ${className}`}>
      <Alert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function UnclearBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sunset-light px-2 py-0.5 text-[11px] font-semibold text-sunset-dark">
      <Alert className="h-3 w-3" />
      {label}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-strong rounded-3xl p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2.5 mt-7 px-1 font-display text-base font-extrabold text-sage-dark first:mt-0">{children}</h3>;
}
