import { revalidatePath } from "next/cache";

// Goals and their link counts show on the Goals pages and on Today's Goals card, so any
// write that changes a goal or its links refreshes both.
export function revalidateGoals() {
  revalidatePath("/goals", "layout");
  revalidatePath("/today");
}
