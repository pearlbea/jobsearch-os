const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Loosely matches US-style phone numbers (with optional country code),
// e.g. "(918) 555-0134", "918-555-0134", "+1 918.555.0134".
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// Bare or scheme-prefixed URLs, e.g. "https://pearllatteier.dev",
// "www.linkedin.com/in/pearl", "github.com/pearlbea".
const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|dev|net|org|co|me)\b(?:\/[^\s]*)?/gi;

/**
 * Strips PII (name, email, phone, website/URLs) from resume text before it's
 * sent to the Claude API. The name is matched against the known profile
 * full_name rather than guessed via heuristics, since arbitrary name
 * detection is unreliable.
 */
export function redactPii(text: string, fullName?: string | null): string {
  let redacted = text
    .replace(EMAIL_RE, "[redacted]")
    .replace(URL_RE, "[redacted]")
    .replace(PHONE_RE, "[redacted]");

  if (fullName?.trim()) {
    const escaped = fullName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    redacted = redacted.replace(
      new RegExp(`\\b${escaped}\\b`, "gi"),
      "[redacted]",
    );
  }

  return redacted;
}
