import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrackerPage from "./page";

describe("TrackerPage", () => {
  it("renders the Tracker Page heading", () => {
    render(<TrackerPage />);
    expect(
      screen.getByRole("heading", { name: "Job Tracker" }),
    ).toBeInTheDocument();
  });
});
