import { describe, it, expect } from "vitest";
import { redactPii } from "@/lib/redact-pii";

describe("redactPii", () => {
  it("redacts email addresses", () => {
    expect(redactPii("Contact me at pearl.latteier@gmail.com for more")).toBe(
      "Contact me at [redacted] for more",
    );
  });

  it("redacts phone numbers in common formats", () => {
    expect(redactPii("Call (918) 555-0134 anytime")).toBe(
      "Call [redacted] anytime",
    );
    expect(redactPii("Call 918-555-0134 or 918.555.0134")).toBe(
      "Call [redacted] or [redacted]",
    );
  });

  it("redacts websites and social/portfolio links", () => {
    expect(redactPii("Portfolio: https://pearllatteier.dev")).toBe(
      "Portfolio: [redacted]",
    );
    expect(redactPii("linkedin.com/in/pearlbea and github.com/pearlbea")).toBe(
      "[redacted] and [redacted]",
    );
  });

  it("redacts the candidate's full name when provided", () => {
    expect(
      redactPii("Pearl Latteier\nSenior Engineer with 15 years", "Pearl Latteier"),
    ).toBe("[redacted]\nSenior Engineer with 15 years");
  });

  it("is case-insensitive when matching the full name", () => {
    expect(redactPii("PEARL LATTEIER built this", "Pearl Latteier")).toBe(
      "[redacted] built this",
    );
  });

  it("leaves ordinary resume text untouched", () => {
    const text = "Led a team of 8 engineers shipping TypeScript and Go services.";
    expect(redactPii(text)).toBe(text);
  });

  it("handles multiple PII types in the same document", () => {
    const resume = `Pearl Latteier
pearl.latteier@gmail.com | (918) 555-0134 | pearllatteier.dev

Senior Engineering Manager with a decade of experience.`;

    const result = redactPii(resume, "Pearl Latteier");

    expect(result).not.toContain("Pearl Latteier");
    expect(result).not.toContain("pearl.latteier@gmail.com");
    expect(result).not.toContain("555-0134");
    expect(result).not.toContain("pearllatteier.dev");
    expect(result).toContain("Senior Engineering Manager with a decade of experience.");
  });
});
