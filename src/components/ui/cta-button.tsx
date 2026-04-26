import Link from "next/link";

import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const VARIANTS = {
  primary: "bg-cf-cta text-white shadow-sm hover:bg-cf-cta/90",
  outline: "border border-cf-navy text-cf-navy hover:bg-cf-navy hover:text-cf-cream",
} as const;

const SIZES = {
  default: "h-12 px-6",
  sm: "h-10 px-5",
} as const;

// Caller-supplied className is merged last — twMerge resolves conflicts in
// favour of the last class, so e.g. className="px-8" overrides SIZES.default px-6.
type CtaButtonProps = {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  "data-testid"?: string;
  onClick?: React.MouseEventHandler;
};

function isAbsolute(href: string) {
  return /^(mailto:|tel:|https?:\/\/)/.test(href);
}

export function CtaButton({
  href,
  variant = "primary",
  size = "default",
  className,
  children,
  ...rest
}: CtaButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (isAbsolute(href)) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
