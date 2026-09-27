import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { EvaluatorView } from "./evaluator-view";
import { EvaluatorViewContent } from "@/components/evaluator-view-content";
import type { JobSummary } from "@/types/database";

let searchParamValue: string | null = null;
let welcomeParamValue: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "job") return searchParamValue;
      if (key === "welcome") return welcomeParamValue;
      return null;
    },
  }),
}));

vi.mock("@/components/evaluator-view-content", () => ({
  EvaluatorViewContent: vi.fn(() => <div data-testid="evaluator-view-content" />),
}));

const mockJobSummaries: JobSummary[] = [
  {
    id: "job-1",
    role_title: "Engineering Manager",
    company_name: "Acme Corp",
    match_score: 82,
    created_at: "2026-08-01T00:00:00Z",
  },
];

function lastContentProps() {
  const calls = vi.mocked(EvaluatorViewContent).mock.calls;
  return calls[calls.length - 1][0];
}

describe("EvaluatorView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamValue = null;
    welcomeParamValue = null;
  });

  it("passes a null jobId and no welcome when there are no search params", () => {
    render(<EvaluatorView initialJobSummaries={[]} />);

    expect(lastContentProps()).toMatchObject({
      jobId: null,
      showWelcome: false,
    });
  });

  it("passes the job search param through as jobId", () => {
    searchParamValue = "job-1";

    render(<EvaluatorView initialJobSummaries={[]} />);

    expect(lastContentProps()).toMatchObject({ jobId: "job-1" });
  });

  it("sets showWelcome when the welcome param is 1", () => {
    welcomeParamValue = "1";

    render(<EvaluatorView initialJobSummaries={[]} />);

    expect(lastContentProps()).toMatchObject({ showWelcome: true });
  });

  it("seeds the job summaries from initialJobSummaries", () => {
    render(<EvaluatorView initialJobSummaries={mockJobSummaries} />);

    expect(lastContentProps()).toMatchObject({
      jobSummaries: mockJobSummaries,
    });
  });

  it("keeps job summary updates when the selected job changes", () => {
    const { rerender } = render(
      <EvaluatorView initialJobSummaries={mockJobSummaries} />,
    );

    const newSummary: JobSummary = {
      id: "job-2",
      role_title: "Staff Engineer",
      company_name: "Globex",
      match_score: 70,
      created_at: "2026-09-01T00:00:00Z",
    };
    act(() => {
      lastContentProps().setJobSummaries((prev) => [newSummary, ...prev]);
    });

    searchParamValue = "job-2";
    rerender(<EvaluatorView initialJobSummaries={mockJobSummaries} />);

    expect(lastContentProps()).toMatchObject({
      jobId: "job-2",
      jobSummaries: [newSummary, ...mockJobSummaries],
    });
  });
});
