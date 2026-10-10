import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import { SidebarInset } from "@/components/ui/sidebar";
import TopBar from "@/components/dashboard/TopBar";
import { Providers } from "@/components/providers";
import { DashboardSidebar } from "@/components/dashboard/SidebarNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const satoshi = localFont({
  src: "../assets/fonts/Satoshi-Bold.otf",
  variable: "--font-satoshi",
  weight: "700",
});

export const metadata: Metadata = {
  title: "OneMinute Logs",
  description: "Production-ready logs in under a minute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>


      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${satoshi.variable} antialiased`}
          suppressHydrationWarning
        >
          <DashboardSidebar>
            <SidebarInset>
              <TopBar />
              <div className="py-4 pr-4">
                <div className="mx-auto max-w-7xl">{children}</div>
              </div>
            </SidebarInset>
          </DashboardSidebar>
        </body>
      </html>
    </Providers>
  );
}
