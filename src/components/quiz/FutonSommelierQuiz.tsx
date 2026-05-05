"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import {
  SOMMELIER_QUESTIONS,
  getRecommendation,
  type SommelierAnswers,
  type SommelierRecommendation,
} from "@/lib/quiz/futon-sommelier-data";

type Phase = "quiz" | "results";

export function FutonSommelierQuiz() {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SommelierAnswers>({});
  const [recommendation, setRecommendation] =
    useState<SommelierRecommendation | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase, step]);

  function handleSelect(value: string) {
    const question = SOMMELIER_QUESTIONS[step];
    const next = { ...answers, [question.key]: value } as SommelierAnswers;
    setAnswers(next);

    if (step < SOMMELIER_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setRecommendation(getRecommendation(next));
      setPhase("results");
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleRestart() {
    setStep(0);
    setAnswers({});
    setRecommendation(null);
    setPhase("quiz");
  }

  if (phase === "results" && recommendation) {
    return (
      <ResultsView
        recommendation={recommendation}
        onRestart={handleRestart}
        headingRef={headingRef}
      />
    );
  }

  const question = SOMMELIER_QUESTIONS[step];
  const selectedValue = answers[question.key as keyof SommelierAnswers];
  const pct = Math.round(((step + 1) / SOMMELIER_QUESTIONS.length) * 100);

  return (
    <div
      data-slot="futon-sommelier-quiz"
      className="mx-auto max-w-2xl px-4 py-12 font-source-sans sm:px-6"
    >
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-1.5 flex justify-between text-xs text-cf-muted">
          <span>
            Question {step + 1} of {SOMMELIER_QUESTIONS.length}
          </span>
          <span>{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quiz progress"
          className="h-1.5 w-full overflow-hidden rounded-full bg-cf-ink/10"
        >
          <div
            className="h-full rounded-full bg-cf-cta transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <header className="mb-8 space-y-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink outline-none sm:text-4xl"
        >
          {question.title}
        </h1>
        <p className="text-base text-cf-muted">{question.subtitle}</p>
      </header>

      <ul
        role="list"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        aria-label={question.title}
      >
        {question.options.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => handleSelect(opt.value)}
              aria-pressed={selectedValue === opt.value}
              className={[
                "w-full rounded-lg border-2 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                selectedValue === opt.value
                  ? "border-cf-cta bg-cf-cta/5 text-cf-ink"
                  : "border-cf-ink/10 bg-white hover:border-cf-cta/50 hover:bg-cf-cream/40 text-cf-ink",
              ].join(" ")}
            >
              <span className="block font-medium">{opt.label}</span>
              {opt.description && (
                <span className="mt-0.5 block text-sm text-cf-muted">
                  {opt.description}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {step > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="mt-6 text-sm text-cf-muted underline underline-offset-2 hover:text-cf-ink"
        >
          &larr; Back
        </button>
      )}
    </div>
  );
}

function ResultsView({
  recommendation,
  onRestart,
  headingRef,
}: {
  recommendation: SommelierRecommendation;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const href = recommendation.filterHint
    ? `/shop/${recommendation.categorySlug}?search=${recommendation.filterHint}`
    : `/shop/${recommendation.categorySlug}`;

  return (
    <div
      data-slot="futon-sommelier-results"
      className="mx-auto max-w-2xl px-4 py-12 font-source-sans sm:px-6"
    >
      <header className="mb-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          Your recommendation
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink outline-none sm:text-4xl"
        >
          {recommendation.categoryLabel}
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-cf-muted">
          {recommendation.reason}
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <Link
          href={href}
          className="inline-flex items-center rounded-md bg-cf-cta px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cf-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Shop {recommendation.categoryLabel} &rarr;
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-cf-muted underline underline-offset-2 hover:text-cf-ink"
        >
          Start over
        </button>
      </div>

      <div className="mt-10 border-t border-cf-ink/10 pt-8 text-sm text-cf-muted">
        Not sure?{" "}
        <Link
          href="/shop"
          className="text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
        >
          Browse our full collection
        </Link>{" "}
        or{" "}
        <Link
          href="/contact"
          className="text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
        >
          ask our team
        </Link>
        .
      </div>
    </div>
  );
}
