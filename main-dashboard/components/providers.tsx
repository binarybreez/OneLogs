// app/providers.tsx (or components/providers.tsx)
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ui } from "@clerk/ui";
import { TooltipProvider } from "./ui/tooltip";
import { ThemeProvider } from "./themeProvider";



export function Providers({ children }: { children: React.ReactNode }) {
  // Use state to ensure the QueryClient is only instantiated once per client lifecycle.
  // This prevents cache loss on React re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Default to 1 minute of fresh data
            refetchOnWindowFocus: false, // Prevents excessive refetching when switching tabs
          },
        },
      })
  );

  return (
    <ClerkProvider ui={ui}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}