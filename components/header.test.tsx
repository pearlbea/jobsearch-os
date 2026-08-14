import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { Header } from "./header";

describe("Header", () => {
  it("renders the wordmark linking home", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "JobSearch OS" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<Header />);

    const results = await axe.run(container);

    expect(results.violations).toEqual([]);
  });
});
