// cfw-avc: PDP warranty info section. Surfaces the 15-year frame
// warranty per cfw's /warranty policy with a one-click registration
// CTA pre-filled with product context. Closes the cf-9k5 P2 gap where
// Wix Studio's WarrantyInfoWidget read per-product `warrantyYears` /
// `warrantyType` custom fields on PDP — cfw's policy is uniform across
// the catalog (every frame is 15 years; mattresses and covers carry
// separate manufacturer terms documented on /warranty), so this widget
// uses the BUSINESS.warrantyYears constant rather than provisioning
// new Wix Stores custom fields.
//
// WHY a server component: no interactivity (just two links and static
// copy). Server render avoids hydration cost on the PDP, which already
// has heavy client islands (gallery, variant picker, reviews).

import Link from "next/link";

import { BUSINESS } from "@/lib/business/contact-info";

const REGISTER_PATH = "/warranty/register";
const POLICY_PATH = "/warranty";
const CLAIM_PATH = "/warranty/claim";

export type PdpWarrantyInfoProps = {
  /** Wix Stores product id — drives the ?productId pre-fill. */
  productId: string;
  /** Display product name — drives the ?productName pre-fill. */
  productName: string;
  /**
   * cf-g640 hot-patch: when true, suppress this section. Standalone
   * mattresses carry separate manufacturer warranty terms, NOT the
   * 15-year frame warranty advertised below — surfacing the frame
   * warranty on a mattress PDP is an express-warranty
   * misrepresentation under NC GS 25-2-313 (UCC § 2-313 adoption).
   *
   * Callers should drive this prop from collection membership via
   * `isStandaloneMattress(product, mattressesCollection)` in
   * @/lib/product/warranty-gate, never a product-name regex —
   * frame-with-mattress bundle SKUs (a futon whose SKU bundles a
   * mattress) live in the futon-frames collection and must keep the
   * frame-warranty section; a name regex would mis-classify them.
   *
   * The helper fail-closes on indeterminate state (Wix outage, slug
   * rename, orphan product) — see warranty-gate.ts module docstring.
   *
   * Default `false` preserves existing render behavior for frames.
   */
  isMattress?: boolean;
};

/**
 * Build the /warranty/register pre-fill URL.
 *
 * @param productId Wix Stores product id.
 * @param productName Display name (encoded for safe query transport).
 * @returns `/warranty/register?productId=…&productName=…`.
 *
 * WHY URLSearchParams: encodes `&` / spaces / em-dashes so a product
 * name with embedded reserved-or-display chars (e.g. ampersand + em-
 * dash + spaces in a futon-loveseat-bundle SKU display name) survives
 * the round-trip into the form's `?productName` slot without breaking
 * param parsing.
 */
function buildRegisterHref(productId: string, productName: string): string {
  const params = new URLSearchParams();
  params.set("productId", productId.trim());
  params.set("productName", productName.trim());
  return `${REGISTER_PATH}?${params.toString()}`;
}

/**
 * Build the /warranty/claim pre-fill URL.
 *
 * @param productName Display name for the user-facing "Claim for:"
 *   label rendered above the form.
 * @returns `/warranty/claim?productName=…`.
 *
 * WHY only productName (not productId): the claim form keys claims to
 * `warrantyId` (a WarrantyRegistrations row id), not productId. At PDP
 * time we don't know which of the user's registrations this claim
 * would attach to — they might have registered the product against a
 * different order, or not registered at all. The form lets the user
 * pick / type the warranty reference; we just hand off the product
 * name for visual context.
 */
function buildClaimHref(productName: string): string {
  const params = new URLSearchParams();
  params.set("productName", productName.trim());
  return `${CLAIM_PATH}?${params.toString()}`;
}

/**
 * PDP warranty info section.
 *
 * @param props {@link PdpWarrantyInfoProps}.
 * @returns A `<section>` block with the warranty duration, coverage
 *   copy, a 'Register warranty' CTA pre-filled with product context,
 *   and a secondary link to the full /warranty policy page. Returns
 *   `null` when either productId or productName is empty (defensive —
 *   avoids broken pre-fill URLs).
 */
export function PdpWarrantyInfo(props: PdpWarrantyInfoProps) {
  const productId = props.productId.trim();
  const productName = props.productName.trim();
  if (!productId || !productName) return null;
  // cf-g640: mattress PDPs render no warranty section (separate
  // manufacturer terms apply — see prop doc).
  if (props.isMattress) return null;

  const registerHref = buildRegisterHref(productId, productName);
  const claimHref = buildClaimHref(productName);

  return (
    <section
      data-slot="pdp-warranty-info"
      aria-labelledby="pdp-warranty-heading"
      className="mt-12 rounded-md border border-cf-divider bg-cf-cream p-6 text-cf-ink"
    >
      <h2
        id="pdp-warranty-heading"
        className="font-playfair text-2xl font-semibold tracking-tight"
      >
        {BUSINESS.warrantyYears}-year warranty
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-cf-charcoal/85">
        Every Carolina Futons frame is backed by our{" "}
        {BUSINESS.warrantyYears}-year manufacturer warranty against
        defects in materials and workmanship under normal residential
        use. Register your purchase so a future warranty claim moves
        faster.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link
          href={registerHref}
          className="inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Register warranty
        </Link>
        <Link
          href={POLICY_PATH}
          className="text-sm font-medium text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
        >
          Full warranty details
        </Link>
        <Link
          href={claimHref}
          className="text-sm font-medium text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
        >
          File a warranty claim
        </Link>
      </div>
    </section>
  );
}
