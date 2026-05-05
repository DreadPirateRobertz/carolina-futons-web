import { getWixClientWithTokens } from "@/lib/wix-client";
import { env } from "@/lib/env";

// Wix Headless hosts the actual password-reset form. We trigger the email via
// `recovery.sendRecoveryEmail`; the link in the email opens a Wix-hosted page
// where the member sets a new password, then Wix redirects them back to the
// `redirect.url` we pass in (post-reset landing).
export async function sendPasswordResetEmail(
  email: string,
  redirectUrl: string,
): Promise<void> {
  const client = getWixClientWithTokens();
  await client.recovery.sendRecoveryEmail(email, {
    redirect: {
      url: redirectUrl,
      clientId: env("WIX_CLIENT_ID_HEADLESS"),
    },
  });
}
