import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { getMemberSession } from "@/lib/auth/member";
import { getMyRegistriesAction } from "@/app/actions/registry";
import { RegistryDashboard } from "@/components/registry/RegistryDashboard";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { getSiteContent } from "@/lib/cms/site-content";
import { logError } from "@/lib/observability/log";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gift Registry — Carolina Futons",
  description:
    "Create and share a gift registry for weddings, housewarmings, and other occasions. Friends and family can shop directly from your list.",
  openGraph: {
    title: "Gift Registry — Carolina Futons",
    description: "Create and share a gift registry for any occasion.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: false },
};

const REGISTRY_COPY_FALLBACKS = {
  heading: "Gift Registry",
  unauthenticatedBody: "Sign in to create and manage your gift registries.",
  introSubhead: "Create a shareable wish list for any occasion — weddings, housewarmings, and more.",
} as const;

export default async function RegistryPage() {
  const [session, heading, unauthenticatedBody, introSubhead] = await Promise.all([
    getMemberSession().catch((err: unknown) => { logError("registry/page", "getMemberSession failed", err); return null; }),
    getSiteContent("registry.heading", REGISTRY_COPY_FALLBACKS.heading),
    getSiteContent("registry.unauthenticated.body", REGISTRY_COPY_FALLBACKS.unauthenticatedBody),
    getSiteContent("registry.intro.subhead", REGISTRY_COPY_FALLBACKS.introSubhead),
  ]);

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cf-espresso text-white">
          <Gift className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-cf-espresso">
          {heading}
        </h1>
        <p className="mt-3 text-cf-charcoal/70">{unauthenticatedBody}</p>
        <Link
          href="/account"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-semibold text-white hover:bg-cf-cta/90"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const result = await getMyRegistriesAction();
  const registries = result.success ? result.registries : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cf-espresso text-white">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
            {heading}
          </h1>
          <p className="mt-2 text-cf-charcoal/70">{introSubhead}</p>
        </div>
      </div>

      <RegistryDashboard initialRegistries={registries} />
    </main>
  );
}
