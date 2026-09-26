import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoutinesToday } from "./routines";
import { makeQueryBuilder, makeSupabaseMock, queryResult } from "@/lib/test/supabase-mock";
import type { Database } from "@/lib/types/database";

// Wednesday 23 September 2026; its week starts Monday the 21st.
const TODAY = "2026-09-23";

function clientWith(routines: unknown[], completions: unknown[]) {
  const supabase = makeSupabaseMock();
  supabase.from
    .mockReturnValueOnce(makeQueryBuilder(queryResult(routines)))
    .mockReturnValueOnce(makeQueryBuilder(queryResult(completions)));
  return supabase as unknown as SupabaseClient<Database>;
}

function item(id: string, title: string, sortOrder: number, extra: Record<string, unknown> = {}) {
  return { id, title, sort_order: sortOrder, is_active: true, repeat_rule: "every_time", repeat_every: null, ...extra };
}

function routine(id: string, title: string, extra: Record<string, unknown>, items: unknown[]) {
  return {
    id,
    title,
    time_of_day: "anytime",
    frequency: "daily",
    times_per_week: null,
    weekdays: null,
    is_active: true,
    routine_items: items,
    ...extra,
  };
}

const done = (itemId: string, date: string, at = `${date}T19:10:00Z`) => ({
  routine_item_id: itemId,
  period_start: date,
  completed_at: at,
});

describe("getRoutinesToday", () => {
  it("groups due items by time of day, counts the day, and sets aside what isn't due", async () => {
    const client = clientWith(
      [
        routine("r-skin", "Skincare", { time_of_day: "evening" }, [
          item("cleanser", "Cleanser", 0),
          item("exfoliate", "Exfoliate", 1, { repeat_rule: "every_nth", repeat_every: 2 }),
          item("mask", "Face mask", 2, { repeat_rule: "weekly" }),
        ]),
        routine("r-stretch", "Stretching", { frequency: "times_per_week", times_per_week: 3 }, [
          item("hip", "Hip flexor stretch", 0),
          item("shoulder", "Shoulder rolls", 1),
        ]),
        routine("r-bike", "Bike maintenance", { frequency: "specific_days", weekdays: [7] }, [item("wash", "Wash", 0)]),
        routine("r-old", "Old routine", { is_active: false }, [item("x", "X", 0)]),
      ],
      [
        done("cleanser", TODAY),
        done("exfoliate", "2026-09-21"),
        done("mask", "2026-09-19"),
        done("hip", "2026-09-22"),
        done("hip", TODAY, `${TODAY}T17:30:00Z`),
      ]
    );

    const { data, error } = await getRoutinesToday(client, TODAY, "UTC");

    expect(error).toBe(false);
    expect(data.groups.map((group) => [group.label, group.routines.map((r) => r.title)])).toEqual([
      ["Evening", ["Skincare"]],
      ["Anytime", ["Stretching"]],
    ]);

    const skincare = data.groups[0].routines[0];
    expect(skincare.frequencyLabel).toBe("Daily");
    expect(skincare.items.map((i) => [i.title, i.checked, i.detail, i.doneAt])).toEqual([
      ["Cleanser", true, "every time", "Done 7:10 pm"],
      ["Exfoliate", false, "every 2nd day · last done Mon 21 Sep", null],
    ]);

    const stretching = data.groups[1].routines[0];
    expect(stretching.weekProgress).toBe("2 of 3 this week");

    // 2 of the 4 due items are done; the face mask isn't due until Saturday.
    expect([data.doneCount, data.dueCount]).toEqual([2, 4]);
    expect(data.notDue.map((r) => [r.title, r.items.map((i) => [i.title, i.notDueLabel])])).toEqual([
      ["Skincare", [["Face mask", "due Saturday"]]],
    ]);
    expect(data.notScheduled).toEqual([{ id: "r-bike", title: "Bike maintenance", label: "next Sunday" }]);
    expect(data.archived).toEqual([{ id: "r-old", title: "Old routine" }]);
    expect(data.hasRoutines).toBe(true);
  });

  it("drops an N-times-a-week routine from today once the week's count is met", async () => {
    const client = clientWith(
      [routine("r", "Stretching", { frequency: "times_per_week", times_per_week: 2 }, [item("hip", "Hip", 0)])],
      [done("hip", "2026-09-21"), done("hip", "2026-09-22")]
    );

    const { data } = await getRoutinesToday(client, TODAY, "UTC");

    expect(data.groups).toEqual([]);
    expect(data.notScheduled).toEqual([{ id: "r", title: "Stretching", label: "2 of 2 done this week" }]);
    expect(data.dueCount).toBe(0);
  });

  it("leaves archived items out of the day", async () => {
    const client = clientWith(
      [routine("r", "Skincare", {}, [item("a", "Kept", 0), item("b", "Archived", 1, { is_active: false })])],
      []
    );

    const { data } = await getRoutinesToday(client, TODAY, "UTC");

    expect(data.groups[0].routines[0].items.map((i) => i.title)).toEqual(["Kept"]);
  });

  it("reports a failed read", async () => {
    const supabase = makeSupabaseMock();
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "down" })))
      .mockReturnValueOnce(makeQueryBuilder(queryResult([])));

    const { error, data } = await getRoutinesToday(supabase as unknown as SupabaseClient<Database>, TODAY, "UTC");

    expect(error).toBe(true);
    expect(data.hasRoutines).toBe(false);
  });
});
