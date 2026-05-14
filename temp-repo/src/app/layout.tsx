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
                  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 transition-colors duration-500">
                    <MainLayout>
                      {children}
                    </MainLayout>
                    <AIChatAssistant />
                    <BackToTop />
                    <Toaster />
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
