import type { Metadata } from "next";

import { FutonSommelierQuiz } from "@/components/quiz/FutonSommelierQuiz";

export const metadata: Metadata = {
  title: "Futon Sommelier — Find Your Perfect Futon | Carolina Futons",
  description:
    "Answer 4 quick questions about how you'll use your futon. Our Futon Sommelier matches you to the right frame and mattress from our Hendersonville-made collection.",
};

export default function FutonSommelierPage() {
  return (
    <main
      data-slot="futon-sommelier-page"
      className="w-full min-h-screen bg-cf-cream/30"
    >
      <FutonSommelierQuiz />
    </main>
  );
}
