"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { submitSwatchRequestAction } from "@/app/actions/swatch-request";
import {
  initialSwatchRequestState,
  type SwatchRequestActionState,
} from "@/app/swatch-request/swatch-request-state";
import type {
  SwatchContactErrors,
  SwatchItem,
} from "@/lib/swatch-request/swatch-request-schema";
import { TurnstileWidget } from "@/components/captcha/TurnstileWidget";

const MAX_SWATCHES = 5;

const EMPTY_CONTACT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function contactErrors(state: SwatchRequestActionState): SwatchContactErrors {
  return state.status === "error" ? (state.errors.contact ?? {}) : {};
}

function swatchError(state: SwatchRequestActionState): string | null {
  return state.status === "error" ? (state.errors.swatchIds ?? null) : null;
}

function selectedIds(state: SwatchRequestActionState): string[] {
  return state.status === "error" ? state.selectedIds : [];
}

function contactValues(
  state: SwatchRequestActionState,
): typeof EMPTY_CONTACT {
  return state.status === "error" ? { ...EMPTY_CONTACT, ...state.values } : EMPTY_CONTACT;
}

function transportError(state: SwatchRequestActionState): string | null {
  return state.status === "error" && state.transportError
    ? state.transportError
    : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {pending ? "Submitting…" : "Request swatches"}
    </button>
  );
}

type Props = {
  swatches: SwatchItem[];
  productSlug?: string;
};

export function SwatchRequestForm({ swatches, productSlug }: Props) {
  const [state, formAction] = useActionState(
    submitSwatchRequestAction,
    initialSwatchRequestState,
  );

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const address1Id = useId();
  const address2Id = useId();
  const cityId = useId();
  const stateId = useId();
  const zipId = useId();
  const swatchGroupId = useId();

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="swatch-request-success"
        className="rounded-lg border border-cf-cta/30 bg-cf-sand/40 p-6 text-cf-ink"
      >
        <h2 className="font-playfair text-2xl font-semibold tracking-tight">
          Request received!
        </h2>
        <p className="mt-2 leading-relaxed">
          Your fabric samples are on their way. We&apos;ll send a confirmation
          email with tracking information.
        </p>
      </div>
    );
  }

  const errors = contactErrors(state);
  const values = contactValues(state);
  const ids = selectedIds(state);
  const swErr = swatchError(state);
  const transErr = transportError(state);

  const labelClass = "block text-sm font-medium tracking-tight text-cf-ink";
  const inputClass =
    "mt-2 block w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";
  const errorClass = "mt-1 text-xs text-red-700";

  return (
    <form action={formAction} noValidate className="space-y-8">
      {productSlug && (
        <input type="hidden" name="productSlug" value={productSlug} />
      )}

      {/* Swatch selection */}
      <fieldset>
        <legend
          id={swatchGroupId}
          className="text-base font-semibold text-cf-ink"
        >
          Choose up to {MAX_SWATCHES} swatches
        </legend>
        <p className="mt-1 text-sm text-cf-muted">
          We&apos;ll mail physical samples to your address so you can see the
          fabric in your space before buying.
        </p>
        {swErr && (
          <p role="alert" className={`${errorClass} mt-2`}>
            {swErr}
          </p>
        )}
        {swatches.length === 0 ? (
          <p className="mt-4 text-sm text-cf-muted">
            No swatches available at the moment. Please check back soon.
          </p>
        ) : (
          <ul
            aria-labelledby={swatchGroupId}
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {swatches.map((swatch) => (
              <li key={swatch._id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-cf-divider p-3 text-sm hover:border-cf-cta/50 has-[:checked]:border-cf-cta has-[:checked]:bg-cf-sand/30">
                  <input
                    type="checkbox"
                    name="swatchIds"
                    value={swatch._id}
                    defaultChecked={ids.includes(swatch._id)}
                    className="mt-0.5 h-4 w-4 rounded border-cf-divider text-cf-cta focus:ring-cf-cta"
                  />
                  <span className="flex flex-col gap-0.5">
                    {swatch.colorHex && (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-cf-divider"
                        style={{ backgroundColor: swatch.colorHex }}
                      />
                    )}
                    <span className="font-medium leading-tight">
                      {swatch.swatchName}
                    </span>
                    {swatch.colorFamily && (
                      <span className="text-xs text-cf-muted">
                        {swatch.colorFamily}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {/* Contact info */}
      <fieldset className="space-y-5">
        <legend className="text-base font-semibold text-cf-ink">
          Shipping address
        </legend>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={firstNameId} className={labelClass}>
              First name <span aria-hidden="true">*</span>
            </label>
            <input
              id={firstNameId}
              name="firstName"
              type="text"
              autoComplete="given-name"
              defaultValue={values.firstName}
              aria-describedby={errors.firstName ? `${firstNameId}-err` : undefined}
              aria-invalid={!!errors.firstName}
              className={inputClass}
            />
            {errors.firstName && (
              <p id={`${firstNameId}-err`} role="alert" className={errorClass}>
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={lastNameId} className={labelClass}>
              Last name <span aria-hidden="true">*</span>
            </label>
            <input
              id={lastNameId}
              name="lastName"
              type="text"
              autoComplete="family-name"
              defaultValue={values.lastName}
              aria-describedby={errors.lastName ? `${lastNameId}-err` : undefined}
              aria-invalid={!!errors.lastName}
              className={inputClass}
            />
            {errors.lastName && (
              <p id={`${lastNameId}-err`} role="alert" className={errorClass}>
                {errors.lastName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={emailId} className={labelClass}>
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={values.email}
              aria-describedby={errors.email ? `${emailId}-err` : undefined}
              aria-invalid={!!errors.email}
              className={inputClass}
            />
            {errors.email && (
              <p id={`${emailId}-err`} role="alert" className={errorClass}>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={phoneId} className={labelClass}>
              Phone <span className="font-normal text-cf-muted">(optional)</span>
            </label>
            <input
              id={phoneId}
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={values.phone}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor={address1Id} className={labelClass}>
            Street address <span aria-hidden="true">*</span>
          </label>
          <input
            id={address1Id}
            name="address1"
            type="text"
            autoComplete="address-line1"
            defaultValue={values.address1}
            aria-describedby={errors.address1 ? `${address1Id}-err` : undefined}
            aria-invalid={!!errors.address1}
            className={inputClass}
          />
          {errors.address1 && (
            <p id={`${address1Id}-err`} role="alert" className={errorClass}>
              {errors.address1}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={address2Id} className={labelClass}>
            Apt, suite, etc.{" "}
            <span className="font-normal text-cf-muted">(optional)</span>
          </label>
          <input
            id={address2Id}
            name="address2"
            type="text"
            autoComplete="address-line2"
            defaultValue={values.address2}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-6 gap-5">
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor={cityId} className={labelClass}>
              City <span aria-hidden="true">*</span>
            </label>
            <input
              id={cityId}
              name="city"
              type="text"
              autoComplete="address-level2"
              defaultValue={values.city}
              aria-describedby={errors.city ? `${cityId}-err` : undefined}
              aria-invalid={!!errors.city}
              className={inputClass}
            />
            {errors.city && (
              <p id={`${cityId}-err`} role="alert" className={errorClass}>
                {errors.city}
              </p>
            )}
          </div>

          <div className="col-span-3 sm:col-span-2">
            <label htmlFor={stateId} className={labelClass}>
              State <span aria-hidden="true">*</span>
            </label>
            <select
              id={stateId}
              name="state"
              autoComplete="address-level1"
              defaultValue={values.state}
              aria-describedby={errors.state ? `${stateId}-err` : undefined}
              aria-invalid={!!errors.state}
              className={inputClass}
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && (
              <p id={`${stateId}-err`} role="alert" className={errorClass}>
                {errors.state}
              </p>
            )}
          </div>

          <div className="col-span-3 sm:col-span-1">
            <label htmlFor={zipId} className={labelClass}>
              ZIP <span aria-hidden="true">*</span>
            </label>
            <input
              id={zipId}
              name="zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              defaultValue={values.zip}
              aria-describedby={errors.zip ? `${zipId}-err` : undefined}
              aria-invalid={!!errors.zip}
              className={inputClass}
            />
            {errors.zip && (
              <p id={`${zipId}-err`} role="alert" className={errorClass}>
                {errors.zip}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <TurnstileWidget />

      {transErr && (
        <p role="alert" aria-live="assertive" className="text-sm text-red-700">
          {transErr}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
