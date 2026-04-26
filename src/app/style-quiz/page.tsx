import type { Metadata } from "next";
import { StyleQuiz } from "@/components/quiz/StyleQuiz";
import { getQuizOptions } from "@/lib/wix/style-quiz";

export const metadata: Metadata = {
  title: "Find Your Perfect Futon — Style Quiz | Carolina Futons",
  description:
    "Answer 5 quick questions about your space, style, and budget. We'll match you to the perfect American-made futon from our Hendersonville, NC collection.",
};

export default async function StyleQuizPage() {
  const options = await getQuizOptions();
  return (
    <main className="w-full min-h-screen bg-cf-cream/30">
      <StyleQuiz initialOptions={options} />
    </main>
  );
}
