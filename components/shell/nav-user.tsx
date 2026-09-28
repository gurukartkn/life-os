"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import { logout } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SIDEBAR_LABEL } from "@/components/shell/sidebar-styles";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { initialsFor, type UserIdentity } from "@/lib/user-display";
import { useUIStore } from "@/stores/use-ui-store";

function UserBlock({ user, className }: { user: UserIdentity; className?: string }) {
  return (
    <div className={cn("grid min-w-0 flex-1 text-left", className)}>
      <span className="truncate text-[13px] leading-[18px] font-medium text-ink">{user.displayName}</span>
      <span className="truncate text-caption text-ink-muted">{user.email}</span>
    </div>
  );
}

// The account menu in the sidebar footer (shadcn "NavUser"): avatar, name and email
// with an up/down chevron; the collapsed rail shows the avatar alone with a tooltip.
// It opens to the right of the sidebar, bottom-aligned, and below the trigger in the
// phone top bar. Profile, Preferences and Recycle Bin, then Log out (no confirm).
// Base UI's Menu brings arrow-key movement, Esc and outside-click dismissal.
export function NavUser({ user }: { user: UserIdentity }) {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const desktop = useMediaQuery("(min-width: 768px)", true);
  const [loggingOut, startLogout] = useTransition();
  const initials = initialsFor(user.displayName);

  const trigger = (
    <DropdownMenuTrigger
      aria-label="Account menu"
      className="flex min-w-0 items-center gap-2 rounded-md p-1 text-ink outline-none transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-surface-200 md:w-full md:px-1.5 md:sidebar-collapsed:w-auto md:sidebar-collapsed:p-1"
    >
      <Avatar size="sm">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {/* Name over email: desktop only, and not on the collapsed rail (SIDEBAR_LABEL, as a grid). */}
      <UserBlock user={user} className="hidden md:grid md:sidebar-collapsed:hidden" />
      <ChevronsUpDown
        aria-hidden="true"
        className={cn(SIDEBAR_LABEL, "size-4 shrink-0 text-ink-muted")}
        strokeWidth={1.75}
      />
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {desktop && collapsed ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent side="right">{user.displayName}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        side={desktop ? "right" : "bottom"}
        align="end"
        // Desktop: clear of the sidebar's right edge (the trigger sits 12px inside it).
        sideOffset={desktop ? 20 : 6}
        className="w-60"
      >
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <UserBlock user={user} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem closeOnClick render={<Link href="/profile" />}>
          <UserRound strokeWidth={1.75} />
          Profile
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem closeOnClick render={<Link href="/preferences" />}>
          <SlidersHorizontal strokeWidth={1.75} />
          Preferences
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem closeOnClick render={<Link href="/recycle-bin" />}>
          <Trash2 strokeWidth={1.75} />
          Recycle Bin
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={loggingOut}
          closeOnClick={false}
          onClick={() => startLogout(() => logout())}
        >
          <LogOut strokeWidth={1.75} />
          {loggingOut ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
