import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JobTabs from "./job-tabs";

let pathname = "/tracker/job-1";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("JobTabs", () => {
  it("marks the Tracking tab current on the job page", () => {
    pathname = "/tracker/job-1";
    render(<JobTabs jobId="job-1" />);

    const nav = screen.getByRole("navigation", { name: "Job sections" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tracking" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Evaluation" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Evaluation" })).toHaveAttribute(
      "href",
      "/tracker/job-1/evaluation",
    );
  });

  it("marks the Evaluation tab current on the evaluation page", () => {
    pathname = "/tracker/job-1/evaluation";
    render(<JobTabs jobId="job-1" />);

    expect(screen.getByRole("link", { name: "Evaluation" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Tracking" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("links to and marks the Conversations tab", () => {
    pathname = "/tracker/job-1/conversations";
    render(<JobTabs jobId="job-1" />);

    const link = screen.getByRole("link", { name: "Conversations" });
    expect(link).toHaveAttribute("href", "/tracker/job-1/conversations");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tracking" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
