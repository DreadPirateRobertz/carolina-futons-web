"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Props = {
  registryId: string;
};

export function RegistryShareButton({ registryId }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/gift-registry/${registryId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard denied — fall back to selecting the URL for manual copy.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Link copied" : "Copy registry link"}
      data-slot="registry-share-button"
      className="inline-flex items-center gap-1.5 rounded-md border border-cf-divider bg-white px-3 py-1.5 text-xs font-medium text-cf-charcoal transition-colors hover:bg-cf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-green-600" aria-hidden="true" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden="true" />
          Share link
        </>
      )}
    </button>
  );
}
