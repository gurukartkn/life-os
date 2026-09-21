import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UIPreferencesSync } from "@/components/shell/ui-preferences-sync";
import { PRE_PAINT_SCRIPT } from "@/lib/ui-preferences";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "A personal life-tracking app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the pre-paint script sets data-theme / data-sidebar on
    // <html> before React hydrates (lib/ui-preferences.ts).
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <UIPreferencesSync />
        {children}
      </body>
    </html>
  );
}
