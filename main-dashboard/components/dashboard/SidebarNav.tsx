"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Activity, Search, Bell, Plug, Key, Settings, User2, ChevronsUpDown,
  LucideIcon
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Logo from "../common/logo";


export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export type UserPlan = "free" | "starter" | "pro" | "enterprise";

// --- Configuration ---
const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: Home },
  { label: "Live Logs", href: "/live-logs", icon: Activity },
  { label: "Queries", href: "/queries", icon: Search },
  { label: "Alerts", href: "/alerts", icon: Bell, badge: "3" },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "API Keys", href: "/api-keys", icon: Key },
  { label: "Settings", href: "/settings", icon: Settings },
];

// --- Sub-Components ---

/**
 * Premium Plan Badge with subtle gradient borders
 */
function PlanBadge({ plan }: { plan: UserPlan }) {
  const planConfig = {
    free: "bg-muted/50 text-muted-foreground border-border",
    starter: "bg-primary/10 text-primary border-primary/20",
    pro: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    enterprise: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={`absolute -top-2.5 left-3 z-10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-widest backdrop-blur-md transition-colors ${planConfig[plan]}`}
    >
      {plan}
    </Badge>
  );
}

/**
 * User Context Footer (Cursor-style dense user card)
 */
function UserFooterCard() {
  const { user, isLoaded } = useUser();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="relative mt-2 mx-2 mb-2">
      {!isCollapsed && <PlanBadge plan="starter" />}

      <div className="flex h-14 items-center justify-between rounded-xl border border-border/50 bg-card/50 p-2 shadow-sm backdrop-blur-md transition-all hover:bg-card hover:border-border">
        {!isLoaded ? (
          // Elegant Skeleton Loading State
          <div className="flex w-full items-center gap-3 px-1">
            <Skeleton className="h-8 w-8 rounded-lg" />
            {!isCollapsed && (
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-32" />
              </div>
            )}
          </div>
        ) : (
          // Clerk User Button Wrapper
          <div className="flex w-full items-center gap-3 px-1">
            <UserButton
              appearance={{
                theme: dark, // Assumes a dark mode environment as per original code
                elements: {
                  avatarBox: "w-8 h-8 rounded-lg ring-1 ring-border/50 transition-all hover:ring-primary/50",
                  card: "shadow-2xl border border-border bg-card",
                  userButtonBox: "flex-row-reverse", // Allows us to control layout
                },
              }}
            />

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-1 items-center justify-between overflow-hidden"
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate text-xs font-medium text-foreground">
                      {user?.fullName || "Developer"}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Sidebar Component ---

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      defaultOpen
      style={{
        "--sidebar-width": "260px",
        "--sidebar-width-icon": "72px", // Slightly tighter icon sidebar
      } as React.CSSProperties}
    >
      <Sidebar
        collapsible="icon"
        className="border-r border-border bg-sidebar text-sidebar-foreground"
      >
        {/* Header */}
        <SidebarHeader className="h-16 justify-center px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link href="/" className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20">
              <Logo className="h-6 w-6" />
            </Link>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Agentic OS
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Developer Console
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator className="mx-4 opacity-50" />

        {/* Navigation */}
        <SidebarContent className="px-2 py-4">
          <SidebarGroup>
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
              Platform
            </div>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={isActive}
                      className="group h-9 rounded-lg px-2.5 transition-all duration-200 ease-out hover:bg-primary/5 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                    >
                      <Link href={item.href} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                          <span className="text-[13px] tracking-tight">{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1 flex items-center justify-center text-[9px] bg-background border-border/50 group-data-[collapsible=icon]:hidden">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator className="mx-4 opacity-50" />

        {/* Footer */}
        <SidebarFooter className="pb-3">
          <UserFooterCard />
          <SidebarMenu className="px-2">
            <SidebarMenuItem>
              <SidebarTrigger className="w-full h-8 justify-start rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground group-data-[collapsible=icon]:justify-center" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-background">
        {children}
      </div>
    </SidebarProvider>
  );
}