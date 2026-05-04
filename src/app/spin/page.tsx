import type { Metadata } from "next";

import { SpinWheel } from "@/components/spin/SpinWheel";

export const metadata: Metadata = {
  title: "Spin to Win — Carolina Futons",
  description:
    "Spin the wheel for a chance to win a discount, free swatches, or free delivery on your next order. One spin per day.",
};

export default function SpinPage() {
  return (
    <main
      data-slot="spin-page"
      className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center px-4 py-16 sm:px-6"
    >
      <header className="mb-10 space-y-3 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-navy sm:text-4xl">
          Spin to win
        </h1>
        <p className="text-base text-cf-charcoal/70">
          One spin per day. Prizes include discounts, free swatches, and
          white-glove delivery.
        </p>
      </header>

      <SpinWheel />
    </main>
  );
}
