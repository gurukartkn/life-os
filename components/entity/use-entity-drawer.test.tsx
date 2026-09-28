import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEntityDrawer } from "./use-entity-drawer";
import { parseView, viewHref } from "@/lib/entity-view";

let mockSearch = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

describe("parseView / viewHref", () => {
  it("reads type:id and rejects anything else", () => {
    expect(parseView("task:abc-123")).toEqual({ type: "task", id: "abc-123" });
    expect(parseView("task:")).toBeNull();
    expect(parseView(":abc")).toBeNull();
    expect(parseView("task")).toBeNull();
    expect(parseView(null)).toBeNull();
  });

  it("builds a link that opens the drawer directly", () => {
    expect(viewHref("/tasks", "task", "abc")).toBe("/tasks?view=task:abc");
  });
});

describe("useEntityDrawer", () => {
  beforeEach(() => {
    mockSearch = "";
    window.history.replaceState(null, "", "/tasks?status=active");
  });

  it("reports the open view, filtered by type", () => {
    mockSearch = "view=task:1";
    expect(renderHook(() => useEntityDrawer("task")).result.current.view).toEqual({ type: "task", id: "1" });
    expect(renderHook(() => useEntityDrawer("goal")).result.current.view).toBeNull();
  });

  it("opens by pushing ?view= alongside the other params, and closes by going back", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { result } = renderHook(() => useEntityDrawer("task"));

    act(() => result.current.open("task", "42"));
    expect(window.location.search).toBe("?status=active&view=task:42");

    act(() => result.current.close());
    expect(back).toHaveBeenCalled();
    back.mockRestore();
  });

  it("closes a drawer it did not open (a direct link) by replacing the URL", () => {
    window.history.replaceState(null, "", "/tasks?view=task:9");
    const back = vi.spyOn(window.history, "back");
    const { result } = renderHook(() => useEntityDrawer("task"));

    act(() => result.current.close());

    expect(back).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    back.mockRestore();
  });
});
