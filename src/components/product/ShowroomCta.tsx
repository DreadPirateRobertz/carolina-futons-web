// cfw-tbg: PDP showroom CTA — invites the visitor to come try the futon
// in person at our Hendersonville store. Sits below the buy-box so the
// "buy online" and "try in person" paths are presented side-by-side.
//
// Address + hours come from src/lib/business/contact-info.ts so a future
// move or schedule change updates everywhere in lockstep. The Google Maps
// link uses the maps search API with `?api=1` so iOS/Android open it in
// the native Maps app and desktop falls through to maps.google.com.

import { Clock, MapPin, ArrowUpRight } from "lucide-react";

import { BUSINESS } from "@/lib/business/contact-info";

const SHOWROOM_HOURS = "Wed–Sat 10am–5pm";
const MAPS_QUERY = `${BUSINESS.street}, ${BUSINESS.city} ${BUSINESS.state} ${BUSINESS.zip}`;
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`;

export function ShowroomCta() {
  return (
    <section
      data-slot="pdp-showroom-cta"
      aria-labelledby="pdp-showroom-cta-heading"
      className="mt-16 max-w-3xl"
    >
      <div className="flex flex-col gap-4 rounded-xl border border-cf-divider bg-cf-cream/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-1">
          <h2
            id="pdp-showroom-cta-heading"
            className="font-heading text-lg font-semibold text-cf-espresso"
          >
            Try it in our showroom
          </h2>
          <p className="text-sm text-cf-espresso/75">
            Stop by and sit on the frame, lie on the mattress, ask questions —
            no commission pressure.
          </p>
          <dl className="mt-1 grid gap-x-4 gap-y-2 text-sm text-cf-espresso/85 sm:grid-cols-[auto_1fr]">
            <dt className="sr-only">Address</dt>
            <dd className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-cf-cta"
                aria-hidden="true"
              />
              <span>
                {BUSINESS.street}, {BUSINESS.city} {BUSINESS.state}{" "}
                {BUSINESS.zip}
              </span>
            </dd>
            <dt className="sr-only">Hours</dt>
            <dd className="flex items-start gap-2">
              <Clock
                className="mt-0.5 size-4 shrink-0 text-cf-cta"
                aria-hidden="true"
              />
              <span>{SHOWROOM_HOURS}</span>
            </dd>
          </dl>
        </div>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="showroom-directions-link"
          className="inline-flex h-11 items-center justify-center gap-2 self-stretch rounded-md bg-cf-cta px-5 text-sm font-semibold text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 sm:self-center"
        >
          Get Directions
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
