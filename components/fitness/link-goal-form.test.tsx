import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkGoalForm } from "./link-goal-form";
import { linkWorkoutLogToGoal, unlinkGoal } from "@/actions/links";

vi.mock("@/actions/links", () => ({
  linkWorkoutLogToGoal: vi.fn(),
  unlinkGoal: vi.fn(),
}));

const mockedRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockedRefresh }),
}));

const mockedLink = vi.mocked(linkWorkoutLogToGoal);
const mockedUnlink = vi.mocked(unlinkGoal);

const GOALS = [{ id: "goal-1", title: "Run a 5k" }];

describe("LinkGoalForm", () => {
  beforeEach(() => {
    mockedLink.mockReset();
    mockedUnlink.mockReset();
    mockedRefresh.mockReset();
  });

  it("renders nothing when there are no goals", () => {
    const { container } = render(
      <LinkGoalForm workoutLogId="log-1" goals={[]} linkedGoal={null} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a goal picker and calls linkWorkoutLogToGoal when no goal is linked", async () => {
    mockedLink.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<LinkGoalForm workoutLogId="log-1" goals={GOALS} linkedGoal={null} />);

    expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Link to a goal"), "goal-1");
    await user.click(screen.getByRole("button", { name: "Link" }));

    await waitFor(() =>
      expect(mockedLink).toHaveBeenCalledWith({ workout_log_id: "log-1", goal_id: "goal-1" })
    );
    await waitFor(() => expect(mockedRefresh).toHaveBeenCalled());
  });

  it("shows an unlink control and calls unlinkGoal when a goal is already linked", async () => {
    mockedUnlink.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <LinkGoalForm
        workoutLogId="log-1"
        goals={GOALS}
        linkedGoal={{ linkId: "link-1", goalTitle: "Run a 5k" }}
      />
    );

    expect(screen.getByText("Run a 5k")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link to a goal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(mockedUnlink).toHaveBeenCalledWith("link-1", "log-1"));
    await waitFor(() => expect(mockedRefresh).toHaveBeenCalled());
  });

  it("surfaces a server error when linking fails", async () => {
    mockedLink.mockResolvedValue({ success: false, error: "Couldn't link to the goal. Try again." });
    const user = userEvent.setup();
    render(<LinkGoalForm workoutLogId="log-1" goals={GOALS} linkedGoal={null} />);

    await user.selectOptions(screen.getByLabelText("Link to a goal"), "goal-1");
    await user.click(screen.getByRole("button", { name: "Link" }));

    expect(await screen.findByText("Couldn't link to the goal. Try again.")).toBeInTheDocument();
  });
});
