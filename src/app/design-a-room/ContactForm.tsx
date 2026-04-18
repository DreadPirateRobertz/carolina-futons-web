"use client";

import { useState, useTransition } from "react";

import { submitContact } from "@/app/actions/contact";

type Status =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function DesignARoomContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus({
        kind: "error",
        message: "Please include your name, email, and a short message.",
      });
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await submitContact({
        name,
        email,
        phone: phone || undefined,
        message,
        source: "design-a-room",
      });
      if (result.ok) {
        setStatus({ kind: "ok" });
        form.reset();
      } else {
        setStatus({
          kind: "error",
          message:
            result.message ??
            "Something went wrong sending your message. Please try email or phone.",
        });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-describedby="design-a-room-form-status"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Your name</span>
          <input
            required
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-md border border-cf-ink/20 bg-white px-3 py-2 text-base text-cf-ink focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-cf-ink/20 bg-white px-3 py-2 text-base text-cf-ink focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Phone (optional)</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className="w-full rounded-md border border-cf-ink/20 bg-white px-3 py-2 text-base text-cf-ink focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Tell us about the space</span>
        <textarea
          required
          name="message"
          rows={5}
          className="w-full rounded-md border border-cf-ink/20 bg-white px-3 py-2 text-base text-cf-ink focus:border-cf-cta focus:outline-none focus:ring-2 focus:ring-cf-cta/30"
        />
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-cf-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send message"}
        </button>
        <p
          id="design-a-room-form-status"
          role="status"
          className="text-sm text-cf-muted"
        >
          {status.kind === "ok"
            ? "Thanks — we&rsquo;ll get back within one business day."
            : status.kind === "error"
              ? status.message
              : ""}
        </p>
      </div>
    </form>
  );
}
