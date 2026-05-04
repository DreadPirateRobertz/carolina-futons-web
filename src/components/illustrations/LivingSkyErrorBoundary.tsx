"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

type Props = { children: ReactNode };
type State = { caught: boolean };

// Isolates LivingSkyClient from the header stacking context.
// LivingSkyClient is purely decorative (aria-hidden) — its absence is
// acceptable. Without this boundary, a throw in computeLivingSky or a
// render failure propagates to app/error.tsx and takes down the entire
// storefront. cf-9cgu.
export class LivingSkyErrorBoundary extends Component<Props, State> {
  state: State = { caught: false };

  static getDerivedStateFromError(): State {
    return { caught: true };
  }

  componentDidCatch(error: Error): void {
    Sentry.captureException(error, {
      tags: { component: "LivingSkyClient", source: "cf-9cgu-error-boundary" },
    });
  }

  render(): ReactNode {
    if (this.state.caught) return null;
    return this.props.children;
  }
}
