import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobTrackerRow from "./job-tracker-row";
import { makeJob } from "@/test/fixtures";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

const job = makeJob({ status: "outreach_sent", match_score: 82 });

// Rows render inside the tracker page's <ul>.
const renderRow = (j = job) =>
  render(
    <ul>
      <JobTrackerRow job={j} />
    </ul>,
  );

describe("JobTrackerRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("links to the job and shows the status label", () => {
    renderRow();

    expect(
      screen.getByRole("link", { name: /Engineering Manager/ }),
    ).toHaveAttribute("href", "/tracker/job-1");
    expect(screen.getByText("Outreach Sent")).toBeInTheDocument();
  });

  it("shows placeholders when the job has no status or evaluation", () => {
    renderRow(makeJob({ status: null, match_score: null }));

    expect(screen.getByText("No status")).toBeInTheDocument();
  });

  it("deletes the job after confirming and refreshes the list", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRow();

    await user.click(
      screen.getByRole("button", {
        name: "Delete Engineering Manager at Acme Corp",
      }),
    );

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining(
        "evaluations and interactions will be deleted too",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/job-1", {
      method: "DELETE",
    });
  });

  it("does not delete when the confirm is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: /Delete/ }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the error and re-enables the button when the delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Not found" }),
      }),
    );
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: /Delete/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
    expect(screen.getByRole("button", { name: /Delete/ })).toBeEnabled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
