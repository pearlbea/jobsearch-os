import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";

describe("Header", () => {
  it("renders the wordmark linking home and a sign-in control", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "JobSearch OS" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
