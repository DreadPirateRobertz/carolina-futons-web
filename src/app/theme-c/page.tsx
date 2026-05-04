import type { Metadata } from "next";
import { StargazingHero } from "@/components/mascot/StargazingHero";

export const metadata: Metadata = {
  title: "Theme C — Stargazing (preview) | Carolina Futons",
  description:
    "Theme C preview: night-sky bear hero with twinkling fireflies, shooting star, milky way drift.",
  robots: { index: false, follow: false },
};

export default function ThemeCPage() {
  return (
    <main className="bg-[#0E1424]">
      <StargazingHero />
      <section className="bg-[#0E1424] py-16 text-[#FAF2DE]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5E89A]">
            Preview · Theme C · Stargazing
          </p>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl">
            Twinkling fireflies. A drifting milky way. A bear watching the
            stars.
          </h2>
          <p className="mt-4 text-base opacity-80">
            14 fireflies pulse on a 3.6s stagger. The shooting star fires every
            8 seconds. The milky way drifts horizontally over a minute. All
            motion respects <code>prefers-reduced-motion</code>.
          </p>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-lg border border-[#3F4A78] p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#F5E89A]">
                Source
              </div>
              <div className="mt-1 font-serif text-lg">v3 Hero Variation 02</div>
              <div className="mt-1 text-sm opacity-70">
                bear lying on hill · moon · milky way · fireflies · shooting
                star
              </div>
            </div>
            <div className="rounded-lg border border-[#3F4A78] p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#F5E89A]">
                Palette
              </div>
              <div className="mt-1 font-serif text-lg">Night sky</div>
              <div className="mt-2 flex gap-2">
                {["#0E1838", "#1F2A4A", "#3A2548", "#FAF2DE", "#F5E89A"].map(
                  (c) => (
                    <span
                      key={c}
                      className="inline-block h-6 w-6 rounded border border-[#3F4A78]"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
