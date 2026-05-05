import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QuizResult } from "@/components/quiz/QuizResult";
import { decodeResultToken } from "@/lib/quiz/result-token";
import {
  getQuizRecommendations,
  getPersonalizedCopy,
} from "@/lib/wix/style-quiz";

export const metadata: Metadata = {
  title: "Your Futon Matches — Style Quiz Results | Carolina Futons",
  description:
    "Your personalized futon recommendations from the Carolina Futons style quiz.",
};

type Props = { params: Promise<{ token: string }> };

export default async function QuizResultPage({ params }: Props) {
  const { token } = await params;
  const answers = decodeResultToken(token);
  if (!answers) notFound();

  const [results, personalizedCopy] = await Promise.all([
    getQuizRecommendations(answers),
    getPersonalizedCopy(answers),
  ]);

  return (
    <main className="w-full min-h-screen bg-cf-cream/30">
      <QuizResult
        results={results}
        copy={personalizedCopy.copy}
        shareHref={`/style-quiz/result/${token}`}
      />
    </main>
  );
}
