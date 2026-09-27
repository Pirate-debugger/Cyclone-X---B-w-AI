import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYCLONE-X | Cyclone Impact & Infrastructure Intelligence Platform",
  description: "AI-Powered disaster-management decision-support command center for Bay of Bengal and coastal APAC cyclones.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="h-full bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
