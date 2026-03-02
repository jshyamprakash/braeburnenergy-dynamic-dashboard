import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import { TopBar } from "@/components/navigation/TopBar";
import { Sidebar } from "@/components/navigation/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "IoT Platform Dashboard",
  description: "Enterprise IoT Platform - Device Management & Real-Time Monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ErrorBoundary>
            <Providers>
              {/* Top Bar */}
              <TopBar />

              {/* Main Layout: Sidebar + Content */}
              <div className="flex h-[calc(100vh-64px)]">
                <Sidebar />
                <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </main>
              </div>
            </Providers>
          </ErrorBoundary>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
