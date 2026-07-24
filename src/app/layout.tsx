import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Kyra POS — Modern Point of Sale System",
  description: "Touch-optimized restaurant, bakery, and cafe Point of Sale billing system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
