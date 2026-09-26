import { redirect } from "next/navigation";

// A routine is checked off on the Routines page and edited here; the old per-routine
// checklist URL lands on the editor.
export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/routines/${id}/edit`);
}
