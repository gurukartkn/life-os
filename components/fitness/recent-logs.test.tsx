import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentLogs, type RecentLogData } from "./recent-logs";
import { formatDueDate } from "@/lib/dates";

const LOGS: RecentLogData[] = [
  { id: "log-1", workoutName: "Push Day", performedOn: "2024-01-01" },
  { id: "log-2", workoutName: "Pull Day", performedOn: "2020-06-15" },
];

describe("RecentLogs", () => {
  it("renders workout names and formatted dates from the logs prop", () => {
    render(<RecentLogs logs={LOGS} />);

    for (const log of LOGS) {
      expect(screen.getByText(log.workoutName)).toBeInTheDocument();
      expect(screen.getByText(formatDueDate(log.performedOn))).toBeInTheDocument();
    }
  });

  it("renders the section label and no rows when logs is empty", () => {
    render(<RecentLogs logs={[]} />);

    expect(screen.getByText("Recent workout logs")).toBeInTheDocument();
  });
});
