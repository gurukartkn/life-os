import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker } from "./date-picker";

function Controlled({ initial = "", onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      label="Due date"
      placeholder="Due date"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("DatePicker", () => {
  it("shows the placeholder when there is no date", () => {
    render(<Controlled />);

    const trigger = screen.getByRole("button", { name: "Due date" });
    expect(trigger).toHaveTextContent("Due date");
  });

  it("shows the chosen date and includes it in the accessible name", () => {
    render(<Controlled initial="2026-03-15" />);

    const trigger = screen.getByRole("button", { name: "Due date, Mar 15, 2026" });
    expect(trigger).toHaveTextContent("Mar 15, 2026");
  });

  it("opens a calendar and reports the picked day as YYYY-MM-DD", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial="2026-03-15" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Due date/ }));
    await user.click(await screen.findByRole("button", { name: /March 10/ }));

    expect(onChange).toHaveBeenCalledWith("2026-03-10");
    expect(screen.getByRole("button", { name: "Due date, Mar 10, 2026" })).toBeInTheDocument();
  });

  // Stage 2 will render past dates as overdue, so the picker must not block them.
  it("lets a date in the past be selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial="2020-01-15" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Due date/ }));
    await user.click(await screen.findByRole("button", { name: /January 3rd, 2020/ }));

    expect(onChange).toHaveBeenCalledWith("2020-01-03");
  });

  it("starts the week on Monday", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="2026-03-15" />);

    await user.click(screen.getByRole("button", { name: /Due date/ }));

    const weekdays = await screen.findAllByText(/^(Mo|Tu|We|Th|Fr|Sa|Su)$/);
    expect(weekdays.map((el) => el.textContent)).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("clears the date", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial="2026-03-15" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Due date/ }));
    await user.click(await screen.findByRole("button", { name: "Clear date" }));

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("button", { name: "Due date" })).toHaveTextContent("Due date");
  });

  it("does not offer Clear when there is no date", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: "Due date" }));
    await screen.findByRole("grid");

    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("does not shift the day for dates at the start or end of a month", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial="2026-12-15" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Due date/ }));
    await user.click(await screen.findByRole("button", { name: /December 31/ }));

    expect(onChange).toHaveBeenCalledWith("2026-12-31");
  });
});
