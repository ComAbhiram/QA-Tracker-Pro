import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { GuestProvider } from "@/contexts/GuestContext";
import { ToastProvider } from "@/contexts/ToastContext";
import GuestBanner from "@/components/GuestBanner";
import AIChatAssistant from "@/components/AIChatAssistant";
import { Toaster } from "@/components/ui/sonner";
import BackToTop from "@/components/ui/BackToTop";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Advanced Team Tracker",
  description: "Track and manage QA projects efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GuestProvider>
            <ToastProvider>
              <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 transition-colors duration-500">
                {/* GuestBanner removed as per request */}
                <Sidebar />
                <main className="main-content flex flex-col">
                  <div className="flex-1">
                    {children}
                  </div>
                  <footer className="mt-8 py-6 text-center text-xs font-semibold text-slate-900 dark:text-slate-400 uppercase tracking-widest border-t border-slate-200/50 dark:border-slate-800/50">
                    Crafted By Abhiram P Mohan : Lead QA, InterSmart
                  </footer>
                </main>
                <AIChatAssistant />
                <BackToTop />
                <Toaster />
              </div>
            </ToastProvider>
          </GuestProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
