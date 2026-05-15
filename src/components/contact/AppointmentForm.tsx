"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { bookAppointment } from "@/app/contact/actions";
import {
  initialAppointmentActionState,
  type AppointmentActionState,
  type AppointmentErrors,
  type AppointmentRequest,
} from "@/app/contact/appointment-state";

const APPOINTMENT_TIME_OPTIONS = [
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
] as const;

const EMPTY_VALUES: AppointmentRequest = {
  appointmentName: "",
  appointmentEmail: "",
  appointmentDate: "",
  appointmentTime: "",
};

function errorsFrom(state: AppointmentActionState): AppointmentErrors {
  return state.status === "error" ? state.errors : {};
}

function valuesFrom(state: AppointmentActionState): AppointmentRequest {
  return state.status === "error" ? state.values : EMPTY_VALUES;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      id="appointmentBookBtn"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {pending ? "Booking…" : "Request appointment"}
    </button>
  );
}

export function AppointmentForm() {
  const [state, formAction] = useActionState(
    bookAppointment,
    initialAppointmentActionState,
  );

  const nameId = useId();
  const emailId = useId();
  const dateId = useId();
  const timeId = useId();

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="appointment-success"
        className="rounded-lg border border-cf-cta/30 bg-cf-sand/40 p-6 text-cf-ink"
      >
        <h3 className="font-playfair text-xl font-semibold tracking-tight">
          Request received — we&apos;ll confirm shortly.
        </h3>
        <p className="mt-2 leading-relaxed">
          Your requested slot:{" "}
          <strong>
            {state.date} at {state.time}
          </strong>
          . We&apos;ll reply to confirm availability within one business day.
        </p>
      </div>
    );
  }

  const errors = errorsFrom(state);
  const values = valuesFrom(state);
  const transportError =
    state.status === "error" && state.transportError ? state.transportError : null;

  const labelClass = "block text-sm font-medium tracking-tight text-cf-ink";
  const inputClass =
    "mt-2 block w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";
  const errorClass = "mt-1 text-xs text-red-700";

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5"
      aria-label="Appointment booking form"
    >
      <div>
        <label htmlFor={nameId} className={labelClass}>
          Name
        </label>
        <input
          id={nameId}
          name="appointmentName"
          type="text"
          autoComplete="name"
          defaultValue={values.appointmentName}
          className={inputClass}
          aria-invalid={errors.appointmentName ? true : undefined}
          aria-describedby={errors.appointmentName ? `${nameId}-error` : undefined}
          required
        />
        {errors.appointmentName ? (
          <p id={`${nameId}-error`} className={errorClass} role="alert">
            {errors.appointmentName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={emailId} className={labelClass}>
          Email
        </label>
        <input
          id={emailId}
          name="appointmentEmail"
          type="email"
          autoComplete="email"
          defaultValue={values.appointmentEmail}
          className={inputClass}
          aria-invalid={errors.appointmentEmail ? true : undefined}
          aria-describedby={errors.appointmentEmail ? `${emailId}-error` : undefined}
          required
        />
        {errors.appointmentEmail ? (
          <p id={`${emailId}-error`} className={errorClass} role="alert">
            {errors.appointmentEmail}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={dateId} className={labelClass}>
          Preferred date{" "}
          <span className="text-cf-muted">(Sun – Tue)</span>
        </label>
        <input
          id={dateId}
          name="appointmentDate"
          type="date"
          defaultValue={values.appointmentDate}
          className={inputClass}
          aria-invalid={errors.appointmentDate ? true : undefined}
          aria-describedby={errors.appointmentDate ? `${dateId}-error` : undefined}
          required
        />
        {errors.appointmentDate ? (
          <p id={`${dateId}-error`} className={errorClass} role="alert">
            {errors.appointmentDate}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={timeId} className={labelClass}>
          Preferred time
        </label>
        <select
          id={timeId}
          name="appointmentTime"
          defaultValue={values.appointmentTime}
          className={inputClass}
          aria-invalid={errors.appointmentTime ? true : undefined}
          aria-describedby={errors.appointmentTime ? `${timeId}-error` : undefined}
          required
        >
          <option value="">Select a time…</option>
          {APPOINTMENT_TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.appointmentTime ? (
          <p id={`${timeId}-error`} className={errorClass} role="alert">
            {errors.appointmentTime}
          </p>
        ) : null}
      </div>

      {transportError ? (
        <p role="alert" className="text-sm text-red-700">
          {transportError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
