import Link from "next/link";

import { cn } from "@/lib/utils";

const BASE =
  "text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta";

// Caller-supplied className is merged last — twMerge resolves conflicts in
// favour of the last class, so e.g. className="text-sm" layers on top of BASE.
type CfLinkProps = {
  href: string;
  breakAll?: boolean;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
};

function isAbsolute(href: string) {
  return /^(mailto:|tel:|https?:\/\/)/.test(href);
}

export function CfLink({
  href,
  breakAll,
  className,
  children,
  ...rest
}: CfLinkProps) {
  const classes = cn(BASE, breakAll && "break-all", className);

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
