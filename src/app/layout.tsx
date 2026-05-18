import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import { Sidebar } from "@/components/Sidebar"; // Replaced by MainLayout
import { GuestProvider } from "@/contexts/GuestContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import MainLayout from "@/components/MainLayout";
import GuestBanner from "@/components/GuestBanner";
import AIChatAssistant from "@/components/AIChatAssistant";
import { Toaster } from "@/components/ui/sonner";
import BackToTop from "@/components/ui/BackToTop";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";

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
            <NotificationProvider>
              <ToastProvider>
                <SidebarProvider>
                  <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500 overflow-hidden">
                    {/* Glowing mesh gradients */}
                    <div className="absolute top-[10%] left-[5%] w-[30rem] h-[30rem] bg-yellow-400/10 dark:bg-yellow-500/5 rounded-full blur-[90px] pointer-events-none animate-float-slow" />
                    <div className="absolute bottom-[10%] right-[5%] w-[35rem] h-[35rem] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none animate-float-medium" />

                    <div className="relative z-10">
                      <MainLayout>
                        {children}
                      </MainLayout>
                      <AIChatAssistant />
                      <BackToTop />
                      <Toaster />
                    </div>
                  </div>
                </SidebarProvider>
              </ToastProvider>
            </NotificationProvider>
          </GuestProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
