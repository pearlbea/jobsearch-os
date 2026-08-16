import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect after Supabase's own hosted email-confirmation link
// finishes verifying — it lands here with a `code` to exchange for a
// session, not an active session itself. This is the counterpart to
// /auth/confirm: that route handles a token_hash link pointed directly at
// this app; this one handles the PKCE `code` Supabase's default
// (unmodified) email templates produce via emailRedirectTo.
//
// `next` deliberately isn't passed as a query param on `emailRedirectTo` —
// Supabase validates that URL against the project's redirect allow list
// *including its query string*, so an exact (non-wildcard) allow-list entry
// for the bare `/auth/callback` URL would silently stop matching and fall
// back to the project's static Site URL. Defaulting to `/profile` here
// covers this route's one caller (post-signup confirmation) without needing
// a query param.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/profile";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=confirmation_failed", origin),
  );
}
