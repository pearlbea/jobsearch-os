import { describe, it, expect, beforeEach, vi } from "vitest";
import EvaluatorPage from "./page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const props = (searchParams: Record<string, string | string[] | undefined>) =>
  ({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  }) as PageProps<"/evaluator">;

describe("EvaluatorPage (legacy redirect)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to the tracker", async () => {
    await expect(EvaluatorPage(props({}))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/tracker");
  });

  it("redirects an old job link to that job's tracker page", async () => {
    await expect(EvaluatorPage(props({ job: "job-1" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith("/tracker/job-1");
  });

  it("ignores a repeated job param", async () => {
    await expect(
      EvaluatorPage(props({ job: ["job-1", "job-2"] })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/tracker");
  });
});
