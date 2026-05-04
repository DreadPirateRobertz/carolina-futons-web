"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { trackCustomEvent } from "@/lib/wix/custom-events";
import {
  getQuizRecommendations,
  captureQuizLead,
  getPersonalizedCopy,
} from "@/lib/wix/style-quiz";
import type {
  QuizAnswers,
  QuizOptions,
  QuizRecommendation,
} from "@/lib/wix/style-quiz";

const QUESTIONS = [
  {
    key: "roomType" as const,
    title: "Where will your futon live?",
    subtitle: "Pick the room it’s going in",
    optionsKey: "roomTypes" as const,
  },
  {
    key: "primaryUse" as const,
    title: "How will you use it most?",
    subtitle: "This helps us find the right comfort level",
    optionsKey: "primaryUses" as const,
  },
  {
    key: "stylePreference" as const,
    title: "What’s your style?",
    subtitle: "We’ll match your aesthetic",
    optionsKey: "stylePreferences" as const,
  },
  {
    key: "sizeNeeds" as const,
    title: "What size do you need?",
    subtitle: "Based on your space and how many sleepers",
    optionsKey: "sizeOptions" as const,
  },
  {
    key: "budgetRange" as const,
    title: "What’s your budget?",
    subtitle: "We have great options at every price point",
    optionsKey: "budgetRanges" as const,
  },
] as const;

// Email gate shown after this step (0-based). Step 2 = Q3 stylePreference.
const EMAIL_GATE_AFTER = 2;

type Phase = "quiz" | "email" | "loading" | "results";

type Props = {
  initialOptions: QuizOptions | null;
};

export function StyleQuiz({ initialOptions }: Props) {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [results, setResults] = useState<QuizRecommendation[]>([]);
  const [copy, setCopy] = useState("");
  const [started, setStarted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const options = initialOptions;

  useEffect(() => {
    headingRef.current?.focus();
  }, [phase, step]);

  function handleSelect(key: keyof QuizAnswers, value: string) {
    if (!started) {
      void trackCustomEvent("quiz_started", { source: "style_quiz" });
      setStarted(true);
    }

    const next = { ...answers, [key]: value };
    setAnswers(next);

    if (step === EMAIL_GATE_AFTER) {
      setPhase("email");
    } else if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      void fetchResults(next);
    }
  }

  async function fetchResults(finalAnswers: QuizAnswers) {
    setPhase("loading");
    void trackCustomEvent("quiz_completed", {
      source: "style_quiz",
      roomType: finalAnswers.roomType,
      budgetRange: finalAnswers.budgetRange,
    });
    const [recs, personalizedCopy] = await Promise.all([
      getQuizRecommendations(finalAnswers),
      getPersonalizedCopy(finalAnswers),
    ]);
    setResults(recs);
    setCopy(personalizedCopy.copy);
    setPhase("results");
  }

  async function handleEmailSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    const partial: QuizAnswers = {
      roomType: answers.roomType,
      primaryUse: answers.primaryUse,
      stylePreference: answers.stylePreference,
    };
    const res = await captureQuizLead(email, partial);
    if (!res.success) {
      setEmailError(res.message ?? "Something went wrong. Please try again.");
      return;
    }
    void trackCustomEvent("quiz_lead_captured", { source: "style_quiz" });
    setStep(step + 1);
    setPhase("quiz");
  }

  function handleSkipEmail() {
    setStep(step + 1);
    setPhase("quiz");
  }

  function handleBack() {
    if (phase === "email") {
      setPhase("quiz");
    } else if (step > 0) {
      setStep(step - 1);
    }
  }

  if (!options) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center font-source-sans text-cf-muted">
        <p>The quiz is temporarily unavailable. Please try again shortly.</p>
        <Link
          href="/shop"
          className="mt-4 inline-block text-cf-cta underline underline-offset-2"
        >
          Browse our full collection
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div
        className="mx-auto max-w-xl px-4 py-24 text-center font-source-sans"
        aria-live="polite"
        aria-label="Finding your perfect futon"
      >
        <p className="text-lg text-cf-ink">Finding your perfect futon&hellip;</p>
      </div>
    );
  }

  if (phase === "results") {
    return <Results results={results} copy={copy} headingRef={headingRef} />;
  }

  if (phase === "email") {
    return (
      <EmailGate
        email={email}
        emailError={emailError}
        onEmailChange={setEmail}
        onSubmit={handleEmailSubmit}
        onSkip={handleSkipEmail}
        onBack={handleBack}
        headingRef={headingRef}
      />
    );
  }

  const question = QUESTIONS[step];
  const questionOptions = options[question.optionsKey];
  const selectedValue = answers[question.key];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 font-source-sans sm:px-6">
      <ProgressBar step={step} total={QUESTIONS.length} />

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
        {questionOptions.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => handleSelect(question.key, opt.value)}
              aria-pressed={selectedValue === opt.value}
              className={[
                "w-full rounded-lg border-2 px-5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2",
                selectedValue === opt.value
                  ? "border-cf-cta bg-cf-cta/5 text-cf-ink"
                  : "border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 hover:border-cf-cta/50 hover:bg-cf-cream/40 text-cf-ink",
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

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div className="mb-8">
      <div className="mb-1.5 flex justify-between text-xs text-cf-muted">
        <span>
          Question {step + 1} of {total}
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
  );
}

type EmailGateProps = {
  email: string;
  emailError: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  onSkip: () => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

function EmailGate({
  email,
  emailError,
  onEmailChange,
  onSubmit,
  onSkip,
  onBack,
  headingRef,
}: EmailGateProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-source-sans sm:px-6">
      <header className="mb-8 space-y-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink outline-none"
        >
          Want your results saved?
        </h1>
        <p className="text-base text-cf-muted">
          Enter your email and we&rsquo;ll send your personalized futon picks
          along with exclusive Hendersonville-made offers.
        </p>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="quiz-email"
            className="mb-1.5 block text-sm font-medium text-cf-ink"
          >
            Email address
          </label>
          <input
            id="quiz-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            aria-describedby={emailError ? "quiz-email-error" : undefined}
            aria-invalid={emailError ? true : undefined}
            className="w-full rounded-md border border-cf-ink/20 bg-white dark:bg-cf-cream px-4 py-2.5 text-cf-ink placeholder:text-cf-muted focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
            placeholder="you@example.com"
          />
          {emailError && (
            <p
              id="quiz-email-error"
              role="alert"
              className="mt-1.5 text-sm text-red-600"
            >
              {emailError}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-cf-cta px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Continue &rarr;
        </button>
      </form>

      <div className="mt-4 flex gap-4 text-sm text-cf-muted">
        <button
          type="button"
          onClick={onSkip}
          className="underline underline-offset-2 hover:text-cf-ink"
        >
          Skip and continue without saving
        </button>
        <button
          type="button"
          onClick={onBack}
          className="underline underline-offset-2 hover:text-cf-ink"
        >
          &larr; Back
        </button>
      </div>
    </div>
  );
}

type ResultsProps = {
  results: QuizRecommendation[];
  copy: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

function Results({ results, copy, headingRef }: ResultsProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-source-sans sm:px-6">
      <header className="mb-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          Your results
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink outline-none sm:text-4xl"
        >
          Your perfect futon matches
        </h1>
        {copy && (
          <p className="max-w-prose text-base leading-relaxed text-cf-muted">
            {copy}
          </p>
        )}
      </header>

      {results.length === 0 ? (
        <div className="space-y-3 text-cf-muted">
          <p>We could not find an exact match right now.</p>
          <Link href="/shop" className="text-cf-cta underline underline-offset-2">
            Browse our full collection
          </Link>
        </div>
      ) : (
        <ul role="list" className="space-y-4">
          {results.map(({ product, reason }) => (
            <li
              key={product._id}
              className="flex items-start gap-4 rounded-lg border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-5 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-playfair text-xl font-semibold text-cf-ink">
                  {product.name}
                </h2>
                <p className="mt-0.5 text-sm text-cf-muted">{reason}</p>
                <p className="mt-2 font-medium text-cf-ink">
                  {product.formattedPrice}
                </p>
                <Link
                  href={`/products/${product.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
                >
                  View product &rarr;
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 border-t border-cf-ink/10 pt-8 text-center">
        <p className="text-sm text-cf-muted">
          Want to explore more?{" "}
          <Link href="/shop" className="text-cf-cta underline underline-offset-2">
            Browse the full collection
          </Link>
        </p>
      </div>
    </div>
  );
}
