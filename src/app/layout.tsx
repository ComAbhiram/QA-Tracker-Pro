import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { GuestProvider } from "@/contexts/GuestContext";
import { ToastProvider } from "@/contexts/ToastContext";
import GuestBanner from "@/components/GuestBanner";
import AIChatAssistant from "@/components/AIChatAssistant";

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
    <html lang="en">
      <body className={inter.className}>
        <GuestProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
              {/* GuestBanner removed as per request */}
              <Sidebar />
              <main className="main-content flex flex-col">
                <div className="flex-1">
                  {children}
                </div>
                <footer className="mt-8 py-6 text-center text-xs font-semibold text-slate-900 uppercase tracking-widest border-t border-slate-200/50">
                  Crafted By Abhiram P Mohan : Lead QA, InterSmart
                </footer>
              </main>
              <AIChatAssistant />
            </div>
          </ToastProvider>
        </GuestProvider>
      </body>
    </html>
  );
}
