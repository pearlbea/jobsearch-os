import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryModal } from "./history-modal";
import { createMockSupabaseClient, type MockSupabaseClient } from "@/test/supabase-mock";

let mockSupabase: MockSupabaseClient;

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

const jobs = [
  {
    id: "job-1",
    role_title: "Engineering Manager",
    company_name: "Acme Corp",
    match_score: 85,
    created_at: "2026-08-01T00:00:00Z",
  },
];

describe("HistoryModal", () => {
  const onOpenChange = vi.fn();
  const onSelectJob = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true } as Response)),
    );
  });

  it("renders nothing when closed and doesn't fetch", () => {
    render(
      <HistoryModal open={false} onOpenChange={onOpenChange} onSelectJob={onSelectJob} />,
    );

    expect(screen.queryByRole("heading", { name: "History" })).not.toBeInTheDocument();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("fetches and lists saved evaluations when opened", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: jobs, error: null }),
    }));

    render(
      <HistoryModal open onOpenChange={onOpenChange} onSelectJob={onSelectJob} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("calls onSelectJob when a row is clicked", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: jobs, error: null }),
    }));

    const user = userEvent.setup();
    render(
      <HistoryModal open onOpenChange={onOpenChange} onSelectJob={onSelectJob} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Engineering Manager"));

    expect(onSelectJob).toHaveBeenCalledWith("job-1");
  });

  it("shows an empty state when there are no saved evaluations", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    render(
      <HistoryModal open onOpenChange={onOpenChange} onSelectJob={onSelectJob} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/no saved evaluations yet/i)).toBeInTheDocument();
    });
  });
});
