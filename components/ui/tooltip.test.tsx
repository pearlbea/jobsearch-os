import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Tooltip", () => {
  it(
    "uses the delay from an ancestor TooltipProvider instead of instantiating its own",
    async () => {
      // Regression test: Tooltip previously wrapped itself in its own
      // TooltipProvider (default 300ms delay), which shadowed whatever delay
      // an app-level provider configured and meant every tooltip on a page
      // opened independently instead of sharing one delay group. If that
      // self-wrapping comes back, this trigger picks up the inner 300ms
      // provider instead of the ancestor's 1000ms one, and the tooltip shows
      // up well before the assertion at 500ms expects it not to.
      const user = userEvent.setup();

      render(
        <TooltipProvider delay={1000}>
          <Tooltip>
            <TooltipTrigger>Hover me</TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      await user.hover(screen.getByText("Hover me"));

      await sleep(500);
      expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();

      expect(
        await screen.findByText("Tooltip text", {}, { timeout: 1500 }),
      ).toBeInTheDocument();
    },
    3000,
  );
});
