import { Sidebar } from "@/components/shell/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UserIdentity } from "@/lib/user-display";

export function AppShell({ user, children }: { user: UserIdentity; children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col md:flex-row">
        <Sidebar user={user} />
        {/* Content region: 24px top/bottom, 32px sides (shell mockup). */}
        <main className="min-w-0 flex-1 bg-surface-050 p-4 md:px-8 md:py-6">{children}</main>
      </div>
      {/* The one toast region (lib/toast.ts). */}
      <Toaster />
    </TooltipProvider>
  );
}
