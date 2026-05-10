"use client";

import { useState } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";
import {
  REVIEW_CATEGORIES,
  type Review,
  type ReviewCategory,
} from "@/lib/discovery/reviews";

const STAR_STAGGER_SECONDS = 0.04;

type Filter = ReviewCategory | "all";

export interface ReviewFilterProps {
  reviews: readonly Review[];
}

export function ReviewFilter({ reviews }: ReviewFilterProps) {
  const [active, setActive] = useState<Filter>("all");
  const filtered: readonly Review[] =
    active === "all" ? reviews : reviews.filter((r) => r.category === active);

  return (
    <div className="space-y-8">
      <div
        role="tablist"
        aria-label="Filter reviews by category"
        className="flex flex-wrap gap-2"
      >
        {REVIEW_CATEGORIES.map((category) => {
          const isActive = category.value === active;
          return (
            <button
              key={category.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(category.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "border-cf-cta bg-cf-cta text-white"
                  : "border-cf-ink/20 bg-white dark:bg-cf-cream dark:border-cf-ink/30 text-cf-ink hover:border-cf-cta/50"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-cf-muted">No reviews in this category yet.</p>
      ) : (
        <ul className="space-y-6">
          {filtered.map((review) => (
            <li key={review.id}>
              <article className="space-y-3 rounded-lg border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-6">
                <div
                  aria-label={`${review.rating} out of 5 stars`}
                  className="flex gap-1"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <HeroReveal
                      key={i}
                      delay={i * STAR_STAGGER_SECONDS}
                    >
                      <span
                        aria-hidden="true"
                        className={
                          i < review.rating
                            ? "text-cf-cta"
                            : "text-cf-ink/20 dark:text-cf-cream/20"
                        }
                      >
                        ★
                      </span>
                    </HeroReveal>
                  ))}
                </div>
                <h3 className="font-playfair text-lg font-semibold tracking-tight">
                  {review.title}
                </h3>
                <p className="leading-relaxed text-cf-ink dark:text-cf-cream">{review.body}</p>
                <p className="text-xs uppercase tracking-[0.15em] text-cf-muted">
                  {review.author}
                  {review.productName ? ` · ${review.productName}` : ""}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
