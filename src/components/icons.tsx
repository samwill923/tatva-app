import Image from "next/image";
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** The Tatva emblem (leaf, capsule and ring), cropped from public/brand/tatva-logo.jpg. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <Image src="/brand/emblem.png" alt="" width={256} height={256} priority className={`rounded-xl ${className}`} />;
}

/** The full logo with the wordmark and "The essence of health". */
export function FullLogo({ className = "" }: { className?: string }) {
  return <Image src="/brand/tatva-logo.jpg" alt="Tatva · The essence of health" width={336} height={386} priority className={className} />;
}

export const Camera = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const ImageIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5-5-9 9" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Trash = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
  </svg>
);

export const Alert = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

export const Cross = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" fill="none" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// Tatva icons
export const Pulse = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

export const Pill = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
    <path d="m9.5 9.5 5 5" />
  </svg>
);

export const Bowl = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 11h18a9 9 0 0 1-18 0zM8 20h8" />
    <path d="M9 8c0-1.5 1-2 1-3.5M13 8c0-1.5 1-2 1-3.5" />
  </svg>
);

export const Sun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
