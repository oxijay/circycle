import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans-th",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Circycle Frontend V2",
  description: "UI ใหม่ที่แยกจากระบบเดิมและใช้ API เดิม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
