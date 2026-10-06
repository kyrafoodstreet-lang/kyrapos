import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

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
    <html lang="en" className={`h-full ${inter.variable} ${inter.className}`}>
      <body className={`min-h-full bg-slate-50 text-slate-900 antialiased flex flex-col ${inter.className}`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
