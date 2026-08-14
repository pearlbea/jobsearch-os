import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
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

  it("hides the sign-in control when showSignIn is false", () => {
    render(<Header showSignIn={false} />);

    expect(
      screen.queryByRole("button", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Header />);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
