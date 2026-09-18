import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkGoalForm } from "./link-goal-form";
import { linkRoutineToGoal, unlinkRoutineGoal } from "@/actions/links";

vi.mock("@/actions/links", () => ({
  linkRoutineToGoal: vi.fn(),
  unlinkRoutineGoal: vi.fn(),
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockedLink = vi.mocked(linkRoutineToGoal);
const mockedUnlink = vi.mocked(unlinkRoutineGoal);

const ROUTINE_ID = "550e8400-e29b-41d4-a716-446655440000";
const GOAL_ID = "550e8400-e29b-41d4-a716-446655440001";
const LINK_ID = "550e8400-e29b-41d4-a716-446655440002";

describe("LinkGoalForm", () => {
  beforeEach(() => {
    mockedLink.mockReset();
    mockedUnlink.mockReset();
    mockRefresh.mockReset();
  });

  it("renders nothing when there are no goals to link", () => {
    const { container } = render(
      <LinkGoalForm routineId={ROUTINE_ID} goals={[]} linkedGoal={null} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a goal picker and calls linkRoutineToGoal on submit when there is no linked goal", async () => {
    mockedLink.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <LinkGoalForm
        routineId={ROUTINE_ID}
        goals={[{ id: GOAL_ID, title: "Get fit" }]}
        linkedGoal={null}
      />
    );

    expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Link to a goal"), GOAL_ID);
    await user.click(screen.getByRole("button", { name: "Link" }));

    await waitFor(() =>
      expect(mockedLink).toHaveBeenCalledWith({ routine_id: ROUTINE_ID, goal_id: GOAL_ID })
    );
  });

  it("surfaces a server error from linking", async () => {
    mockedLink.mockResolvedValue({
      success: false,
      error: "Couldn't link to the goal. Try again.",
    });
    const user = userEvent.setup();
    render(
      <LinkGoalForm
        routineId={ROUTINE_ID}
        goals={[{ id: GOAL_ID, title: "Get fit" }]}
        linkedGoal={null}
      />
    );

    await user.selectOptions(screen.getByLabelText("Link to a goal"), GOAL_ID);
    await user.click(screen.getByRole("button", { name: "Link" }));

    expect(
      await screen.findByText("Couldn't link to the goal. Try again.")
    ).toBeInTheDocument();
  });

  it("shows the linked goal and calls unlinkRoutineGoal when Remove is clicked", async () => {
    mockedUnlink.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <LinkGoalForm
        routineId={ROUTINE_ID}
        goals={[{ id: GOAL_ID, title: "Get fit" }]}
        linkedGoal={{ linkId: LINK_ID, goalTitle: "Get fit" }}
      />
    );

    expect(screen.getByText("Get fit")).toBeInTheDocument();
    expect(screen.queryByLabelText("Link to a goal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(mockedUnlink).toHaveBeenCalledWith(LINK_ID, ROUTINE_ID));
  });

  it("surfaces a server error from unlinking", async () => {
    mockedUnlink.mockResolvedValue({
      success: false,
      error: "Couldn't remove the link. Try again.",
    });
    const user = userEvent.setup();
    render(
      <LinkGoalForm
        routineId={ROUTINE_ID}
        goals={[{ id: GOAL_ID, title: "Get fit" }]}
        linkedGoal={{ linkId: LINK_ID, goalTitle: "Get fit" }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("Couldn't remove the link. Try again.")
    ).toBeInTheDocument();
  });
});
