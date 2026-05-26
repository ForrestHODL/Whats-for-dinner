import type { AuthError } from "@supabase/supabase-js";

export function formatAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Something went wrong. Try again.";
  }

  const auth = error as AuthError;
  const msg = auth.message ?? "";
  const code = auth.code ?? "";

  if (
    code === "email_not_confirmed" ||
    /email not confirmed/i.test(msg)
  ) {
    return "Check your email for a confirmation link, then sign in. Or turn off “Confirm email” in Supabase → Authentication → Providers → Email.";
  }

  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(msg)
  ) {
    return "Wrong email or password. If you just signed up, confirm your email first—or use Create account on this site (not localhost).";
  }

  if (/user already registered/i.test(msg)) {
    return "That email is already registered. Try Sign in instead.";
  }

  if (/password/i.test(msg) && /least/i.test(msg)) {
    return "Password must be at least 6 characters.";
  }

  if (/rate limit/i.test(msg)) {
    return "Too many attempts. Wait a minute and try again.";
  }

  return msg || "Something went wrong. Try again.";
}
