import type { Metadata } from "next";

import { SurveyForm } from "@/components/survey/SurveyForm";

export const metadata: Metadata = {
  title: "Share Your Feedback — Carolina Futons",
  description:
    "How did we do? Share your experience with Carolina Futons and help us improve.",
  robots: { index: false },
};

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const orderId =
    typeof params.orderId === "string" && params.orderId.trim()
      ? params.orderId.trim()
      : undefined;

  return (
    <main
      data-slot="survey-page"
      className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <header className="mb-10 space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-ink sm:text-4xl">
          How did we do?
        </h1>
        <p className="text-base leading-relaxed text-cf-ink/70">
          Your honest feedback helps us serve the next customer better. It takes
          less than a minute.
        </p>
        {orderId && (
          <p className="text-sm text-cf-charcoal/60">
            Order #{orderId}
          </p>
        )}
      </header>

      <SurveyForm orderId={orderId} />
    </main>
  );
}
