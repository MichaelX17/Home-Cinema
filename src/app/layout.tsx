import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import ToastProvider from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Mi Home Cinema",
  description: "Tu cine personal en casa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <ToastProvider>
          <main>{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}